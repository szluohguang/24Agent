import { describe, it, expect } from 'vitest'
import { EagleGuards } from '../guards'

describe('EagleGuards', () => {
  const guards = new EagleGuards(process.cwd())

  it('returns fail for non-existent change dir on open exit', async () => {
    const result = await guards.checkExit('open', {
      changeName: 'non-existent-change-xyz',
      changeDir: 'openspec/changes/non-existent-change-xyz',
      yamlState: { workflow: 'full', phase: 'open', archived: false } as any,
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('not found')
  })

  it('returns success for archive exit (no guards)', async () => {
    const result = await guards.checkExit('archive', {
      changeName: 'test',
      changeDir: 'openspec/changes/test',
      yamlState: { workflow: 'full', phase: 'archive', archived: true } as any,
    })
    expect(result.success).toBe(true)
  })
})
