import * as fs from 'fs'
import {
  CometOrchestration,
  CometPhase,
  CometEngineState,
  CometYamlState,
  CometPhaseDecision,
  CometDecisionChoice,
} from './types'
import { CometStateMachine } from './state-machine'
import { CometGuardScheduler } from './guard-scheduler'

export type StateChangeCallback = (state: CometEngineState) => void

export class CometOrchestrator {
  private orchestration: CometOrchestration
  private stateMachine: CometStateMachine
  private guardScheduler = new CometGuardScheduler()
  private listeners: StateChangeCallback[] = []
  private engineState: CometEngineState

  constructor(
    private orchestrationPath: string,
    private yamlPath: string,
    public changeName: string
  ) {
    this.orchestration = JSON.parse(fs.readFileSync(orchestrationPath, 'utf-8'))
    this.stateMachine = new CometStateMachine(yamlPath)
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
    const yamlState = await this.stateMachine.readState()
    this.engineState.phase = yamlState.phase
    this.engineState.workflow = yamlState.workflow
    this.buildPhaseStatus()
    this.emitChange()
  }

  async transition(targetPhase: string): Promise<void> {
    const current = this.engineState.phase
    const phaseDef = this.orchestration.phases[current as CometPhase]
    if (!phaseDef || phaseDef.exit.transitionTo !== targetPhase) {
      throw new Error(
        `Invalid transition: ${current} -> ${targetPhase}. ` +
        `Allowed: ${phaseDef?.exit.transitionTo || '(none)'}`
      )
    }

    this.engineState.guardStatus = 'running'
    this.emitChange()

    for (const guard of phaseDef.exit.guards) {
      const resolvedCmd = this.guardScheduler.resolveGuard(guard)
      const actualCmd = resolvedCmd.replace(/<change>/g, this.changeName)
      const result = await this.guardScheduler.runGuard(actualCmd, [this.changeName])
      if (!result.success) {
        this.engineState.guardStatus = 'failed'
        this.engineState.guardOutput = result.error || result.stderr
        this.emitChange()
        throw new Error(`Guard failed: ${result.error || result.stderr}`)
      }
    }

    this.engineState.guardStatus = 'passed'
    this.engineState.phase = targetPhase as CometPhase
    this.buildPhaseStatus()
    this.emitChange()
  }

  async evaluateDecision(choice: CometDecisionChoice): Promise<void> {
    const phaseDef = this.orchestration.phases[this.engineState.phase]
    if (!phaseDef) return
    const decision = phaseDef.decisionPoints.find((d) => d.id === choice.decisionId)
    if (!decision) return
    const option = decision.options.find((o) => o.label === choice.choice)
    if (!option) return

    if (option.action.startsWith('transition:')) {
      const target = option.action.split(':')[1]
      await this.transition(target)
    }

    this.engineState.activeDecision = null
    this.emitChange()
  }

  reachDecisionPoint(decisionId: string): void {
    const phaseDef = this.orchestration.phases[this.engineState.phase]
    if (!phaseDef) return
    const decision = phaseDef.decisionPoints.find((d) => d.id === decisionId)
    if (decision) {
      this.engineState.activeDecision = decision
      this.emitChange()
    }
  }

  getCurrentState(): CometEngineState {
    return { ...this.engineState }
  }

  onStateChange(callback: StateChangeCallback): void {
    this.listeners.push(callback)
  }

  private buildPhaseStatus(): void {
    const phaseOrder: CometPhase[] = ['open', 'design', 'build', 'verify', 'archive']
    let foundActive = false
    for (const phase of phaseOrder) {
      const def = this.orchestration.phases[phase]
      if (!def) continue
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
