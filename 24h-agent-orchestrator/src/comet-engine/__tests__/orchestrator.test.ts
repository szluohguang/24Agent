import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CometOrchestrator } from '../orchestrator'

const TEST_JSON = path.join(__dirname, '__test_orch__.json')
const TEST_YAML = path.join(__dirname, '__test_comet__.yaml')

const MINIMAL_ORCH = {
  schema: 'comet-orchestration-v1',
  initialPhase: 'open',
  phases: {
    open: {
      label: '开启', description: '', entry: { guards: [], preconditions: [] },
      exit: { guards: [], postconditions: [], transitionTo: 'design' },
      decisionPoints: []
    },
    design: {
      label: '设计', description: '', entry: { guards: [], preconditions: [] },
      exit: { guards: [], postconditions: [], transitionTo: 'build' },
      decisionPoints: []
    }
  },
  presets: {}
}

describe('CometOrchestrator', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_JSON, JSON.stringify(MINIMAL_ORCH))
    fs.writeFileSync(TEST_YAML, 'workflow: full\nphase: open\narchived: false\n')
  })
  afterEach(() => {
    try { fs.unlinkSync(TEST_JSON) } catch {}
    try { fs.unlinkSync(TEST_YAML) } catch {}
  })

  it('loads orchestration and state on start', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const state = orch.getCurrentState()
    expect(state.phase).toBe('open')
    expect(state.changeName).toBe('test-change')
  })

  it('transitions to next phase when allowed', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await orch.transition('design')
    expect(orch.getCurrentState().phase).toBe('design')
  })

  it('rejects transition not in orchestration definition', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await expect(orch.transition('archive')).rejects.toThrow()
  })

  it('notifies listeners on state change', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const changes: string[] = []
    orch.onStateChange((s) => changes.push(s.phase))
    await orch.transition('design')
    expect(changes).toEqual(['open', 'design'])
  })

  it('builds phase status correctly', async () => {
    const orch = new CometOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const state = orch.getCurrentState()
    expect(state.phases['open'].status).toBe('active')
    expect(state.phases['design'].status).toBe('pending')
  })
})
