import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { CometYamlState, CometPhase } from './types'

type EagleStateEvent =
  | { type: 'open-complete' }
  | { type: 'design-complete' }
  | { type: 'build-complete' }
  | { type: 'verify-pass' }
  | { type: 'verify-fail' }
  | { type: 'archived' }

const TRANSITIONS: Record<CometPhase, Record<string, CometPhase>> = {
  open: { 'open-complete': 'design' },
  design: { 'design-complete': 'build' },
  build: { 'build-complete': 'verify' },
  verify: { 'verify-pass': 'archive', 'verify-fail': 'build' },
  archive: {},
}

export class EagleStateMachine {
  constructor(private yamlPath: string) {}

  readState(): CometYamlState {
    const raw = fs.readFileSync(this.yamlPath, 'utf-8')
    return yaml.load(raw) as CometYamlState
  }

  transition(event: EagleStateEvent): void {
    const state = this.readState()
    const allowed = TRANSITIONS[state.phase]
    const target = allowed[event.type]
    if (!target) {
      throw new Error(`Invalid transition: ${state.phase} -> ${event.type}`)
    }
    state.phase = target as CometPhase
    if (event.type === 'verify-pass') state.verify_result = 'pass'
    if (event.type === 'verify-fail') state.verify_result = 'fail'
    this.writeState(state)
    this.validateWrite(state)
  }

  private writeState(state: CometYamlState): void {
    fs.writeFileSync(this.yamlPath, yaml.dump(state))
  }

  private validateWrite(expected: CometYamlState): void {
    const content = fs.readFileSync(this.yamlPath, 'utf-8')
    const parsed = yaml.load(content) as CometYamlState
    if (parsed.phase !== expected.phase) {
      throw new Error('Double-write validation failed: phase mismatch')
    }
  }
}

export type { EagleStateEvent }
