import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CometStateMachine } from '../state-machine'

const TEST_YAML = path.join(__dirname, '__test_comet__.yaml')

describe('CometStateMachine', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_YAML, `workflow: full\nphase: open\narchived: false\n`)
  })
  afterEach(() => { try { fs.unlinkSync(TEST_YAML) } catch {} })

  it('reads state from yaml file', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    const state = await sm.readState()
    expect(state.phase).toBe('open')
    expect(state.workflow).toBe('full')
  })

  it('transitions to valid next phase', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await sm.transition({ type: 'open-complete' })
    const state = await sm.readState()
    expect(state.phase).toBe('design')
  })

  it('rejects invalid transition', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await expect(sm.transition({ type: 'verify-pass' })).rejects.toThrow()
  })

  it('performs double-write validation', async () => {
    const sm = new CometStateMachine(TEST_YAML)
    await sm.transition({ type: 'open-complete' })
    const content = fs.readFileSync(TEST_YAML, 'utf-8')
    expect(content).toContain('phase: design')
  })
})
