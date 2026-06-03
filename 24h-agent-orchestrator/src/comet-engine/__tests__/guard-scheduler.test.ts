import { describe, it, expect } from 'vitest'
import { CometGuardScheduler } from '../guard-scheduler'

describe('CometGuardScheduler', () => {
  const scheduler = new CometGuardScheduler()

  it('executes a successful guard script', async () => {
    const result = await scheduler.runGuard('echo', ['hello'], { timeout: 5000 })
    expect(result.success).toBe(true)
  })

  it('fails on non-zero exit code', async () => {
    const result = await scheduler.runGuard('false', [], { timeout: 5000 })
    expect(result.success).toBe(false)
  })

  it('times out on long-running guards', async () => {
    const result = await scheduler.runGuard('sleep', ['10'], { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toContain('timeout')
  })

  it('resolves script path from COMET_GUARD env', async () => {
    process.env.COMET_GUARD = '/usr/local/bin/guard'
    const resolved = scheduler.resolveGuard('$COMET_GUARD')
    expect(resolved).not.toContain('$')
    expect(resolved).toBe('/usr/local/bin/guard')
    delete process.env.COMET_GUARD
  })
})
