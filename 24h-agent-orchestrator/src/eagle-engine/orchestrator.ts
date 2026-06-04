import * as fs from 'fs'
import type {
  CometPhase,
  EagleEngineState,
  CometPhaseDecision,
  CometDecisionChoice,
} from './types'
import { EagleStateMachine } from './state-machine'
import { EagleGuards, EagleGuardContext } from './guards'

export type EagleStateChangeCallback = (state: EagleEngineState) => void

export class EagleOrchestrator {
  private codeGuards: EagleGuards
  private listeners: EagleStateChangeCallback[] = []
  private engineState: EagleEngineState
  private baseDir: string

  constructor(
    private orchestrationPath: string,
    private yamlPath: string,
    public changeName: string,
    baseDir?: string,
  ) {
    this.baseDir = baseDir || process.cwd()
    this.codeGuards = new EagleGuards(this.baseDir)
    this.engineState = {
      changeName,
      phase: 'open',
      workflow: 'full',
      phases: {},
      activeDecision: null,
      guardStatus: 'idle',
      guardOutput: null,
    }
  }

  async start(): Promise<void> {
    const yamlState = await this.getStateMachine().readState()
    this.engineState.phase = yamlState.phase
    this.engineState.workflow = yamlState.workflow
    this.buildPhaseStatus()
    this.emitChange()
  }

  /**
   * 从 handleSessionComplete 中调用。
   * 当 mode='auto': guard 失败抛出异常让调用者处理
   * 当 mode='manual': guard 失败广播到 UI 后抛出
   */
  async transition(targetPhase: string, mode?: 'auto' | 'manual'): Promise<void> {
    const current = this.engineState.phase
    const phaseDef = this.getPhaseDefinition(current)
    if (!phaseDef || phaseDef.exit.transitionTo !== targetPhase) {
      throw new Error(
        `Invalid transition: ${current} -> ${targetPhase}. ` +
        `Allowed: ${phaseDef?.exit.transitionTo || '(none)'}`
      )
    }

    this.engineState.guardStatus = 'running'
    this.emitChange()

    const yamlState = await this.getStateMachine().readState()
    const ctx: EagleGuardContext = {
      changeName: this.changeName,
      changeDir: `openspec/changes/${this.changeName}`,
      yamlState,
    }
    const guardResult = await this.codeGuards.checkExit(current, ctx)

    if (!guardResult.success) {
      this.engineState.guardStatus = 'failed'
      this.engineState.guardOutput = guardResult.message || 'Guard check failed'
      this.emitChange()
      if (mode === 'manual') {
        // 人工模式：广播失败，由 UI 决策下一步
        throw new Error(`Guard failed: ${guardResult.message}`)
      }
      // 自动模式：抛出异常，让 handleSessionComplete 处理回退
      throw new Error(`Guard failed: ${guardResult.message}`)
    }

    this.engineState.guardStatus = 'passed'
    await this.writePhaseTransition(current, targetPhase)
    this.engineState.phase = targetPhase as CometPhase
    this.buildPhaseStatus()
    this.emitChange()
  }

  /** 强制推进 — 跳过 guard 直接转换阶段（人工模式使用） */
  async forceTransition(targetPhase: string): Promise<void> {
    const current = this.engineState.phase
    const phaseDef = this.getPhaseDefinition(current)
    if (!phaseDef || phaseDef.exit.transitionTo !== targetPhase) {
      throw new Error(
        `Invalid force transition: ${current} -> ${targetPhase}. ` +
        `Allowed: ${phaseDef?.exit.transitionTo || '(none)'}`
      )
    }
    this.engineState.guardStatus = 'passed'
    await this.writePhaseTransition(current, targetPhase)
    this.engineState.phase = targetPhase as CometPhase
    this.buildPhaseStatus()
    this.emitChange()
  }

  /** 回退到指定阶段（verify → build 安全回滚） */
  async rollbackTransition(targetPhase: string): Promise<void> {
    const phaseOrder: CometPhase[] = ['open', 'design', 'build', 'verify', 'archive']
    const currentIdx = phaseOrder.indexOf(this.engineState.phase)
    const targetIdx = phaseOrder.indexOf(targetPhase as CometPhase)
    if (targetIdx < 0 || targetIdx >= currentIdx) {
      throw new Error(`Invalid rollback: cannot rollback to ${targetPhase} from ${this.engineState.phase}`)
    }
    this.engineState.guardStatus = 'passed'
    this.engineState.guardOutput = `Rolled back from ${this.engineState.phase} to ${targetPhase}`
    await this.writePhaseTransition(this.engineState.phase, targetPhase)
    this.engineState.phase = targetPhase as CometPhase
    this.buildPhaseStatus()
    this.emitChange()
  }

  /**
   * 持久化阶段转换到 .comet.yaml
   */
  private async writePhaseTransition(current: CometPhase, target: string): Promise<void> {
    const eventMap: Record<string, string> = {
      open: 'open-complete',
      design: 'design-complete',
      build: 'build-complete',
      verify: 'verify-pass',
    }
    const event = eventMap[current]
    if (event) {
      const machine = this.getStateMachine()
      await machine.transition({ type: event as any })
    }
  }

  async evaluateDecision(choice: CometDecisionChoice): Promise<void> {
    const phaseDef = this.getPhaseDefinition(this.engineState.phase)
    if (!phaseDef) return
    const decision = (phaseDef as any).decisionPoints?.find((d: any) => d.id === choice.decisionId)
    if (!decision) return
    const option = decision.options?.find((o: any) => o.label === choice.choice)
    if (!option) return

    if (option.action.startsWith('transition:')) {
      const target = option.action.split(':')[1]
      await this.transition(target)
    }

    this.engineState.activeDecision = null
    this.emitChange()
  }

  reachDecisionPoint(decisionId: string): void {
    const phaseDef = this.getPhaseDefinition(this.engineState.phase)
    if (!phaseDef) return
    const decision = (phaseDef as any).decisionPoints?.find((d: any) => d.id === decisionId)
    if (decision) {
      this.engineState.activeDecision = decision
      this.emitChange()
    }
  }

  getCurrentState(): EagleEngineState {
    return { ...this.engineState }
  }

  onStateChange(callback: EagleStateChangeCallback): void {
    this.listeners.push(callback)
  }

  private stateMachine?: EagleStateMachine
  private getStateMachine(): EagleStateMachine {
    if (!this.stateMachine) {
      this.stateMachine = new EagleStateMachine(this.yamlPath)
    }
    return this.stateMachine
  }
  get stateMachineAccessor(): EagleStateMachine { return this.getStateMachine() }

  private getPhaseDefinition(phase: CometPhase) {
    const orch = JSON.parse(fs.readFileSync(this.orchestrationPath, 'utf-8'))
    return orch.phases?.[phase]
  }

  private buildPhaseStatus(): void {
    const phaseOrder: CometPhase[] = ['open', 'design', 'build', 'verify', 'archive']
    const orch = JSON.parse(fs.readFileSync(this.orchestrationPath, 'utf-8'))
    let foundActive = false
    for (const phase of phaseOrder) {
      if (!orch.phases?.[phase]) continue
      if (!foundActive && phase === this.engineState.phase) {
        this.engineState.phases[phase] = { status: 'active', progress: 50 }
        foundActive = true
      } else if (!foundActive) {
        this.engineState.phases[phase] = { status: 'completed', progress: 100 }
      } else {
        this.engineState.phases[phase] = { status: 'pending', progress: 0 }
      }
    }
  }

  private emitChange(): void {
    const state = this.getCurrentState()
    for (const cb of this.listeners) cb(state)
  }
}
