import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { EagleOrchestrator } from '../orchestrator'

const TEST_JSON = path.join(__dirname, '__test_orch__.json')
const TEST_YAML = path.join(__dirname, '__test_comet__.yaml')
const TEST_CHANGE_DIR = path.join(process.cwd(), 'openspec', 'changes', 'test-change')

const MINIMAL_ORCH = {
  schema: 'eagle-orchestration-v1',
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
    },
    build: {
      label: '构建', description: '', entry: { guards: [], preconditions: [] },
      exit: { guards: [], postconditions: [], transitionTo: 'verify' },
      decisionPoints: []
    },
  },
  presets: {}
}

describe('EagleOrchestrator', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_JSON, JSON.stringify(MINIMAL_ORCH))
    fs.writeFileSync(TEST_YAML, 'workflow: full\nphase: open\narchived: false\n')
    // 创建测试 change 目录及 guard 所需的文件
    fs.mkdirSync(TEST_CHANGE_DIR, { recursive: true })
    fs.writeFileSync(path.join(TEST_CHANGE_DIR, 'proposal.md'), '# Test Proposal')
    fs.writeFileSync(path.join(TEST_CHANGE_DIR, 'design.md'), '# Test Design')
    fs.writeFileSync(path.join(TEST_CHANGE_DIR, 'tasks.md'), '- [x] task 1\n- [x] task 2\n')
  })
  afterEach(() => {
    try { fs.unlinkSync(TEST_JSON) } catch {}
    try { fs.unlinkSync(TEST_YAML) } catch {}
    try { fs.rmSync(TEST_CHANGE_DIR, { recursive: true, force: true }) } catch {}
  })

  it('loads orchestration and state on start', async () => {
    const orch = new EagleOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const state = orch.getCurrentState()
    expect(state.phase).toBe('open')
    expect(state.changeName).toBe('test-change')
  })

  it('transitions to next phase when allowed', async () => {
    const orch = new EagleOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await orch.transition('design')
    expect(orch.getCurrentState().phase).toBe('design')
  })

  it('rejects transition not in orchestration definition', async () => {
    const orch = new EagleOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    await expect(orch.transition('archive')).rejects.toThrow()
  })

  it('notifies listeners on state change', async () => {
    const orch = new EagleOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const changes: string[] = []
    orch.onStateChange((s) => changes.push(s.phase))
    await orch.transition('design')
    expect(changes).toEqual(['open', 'design'])
  })

  it('builds phase status correctly', async () => {
    const orch = new EagleOrchestrator(TEST_JSON, TEST_YAML, 'test-change')
    await orch.start()
    const state = orch.getCurrentState()
    expect(state.phases['open'].status).toBe('active')
    expect(state.phases['design'].status).toBe('pending')
  })
})
