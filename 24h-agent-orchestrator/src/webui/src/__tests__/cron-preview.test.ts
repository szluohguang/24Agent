import { describe, it, expect } from 'vitest'
import { computeNextCronRuns } from '../cron-utils.js'

describe('computeNextCronRuns', () => {
  it('returns next N execution times for a daily cron expression', () => {
    const expr = '0 9 * * *'
    const result = computeNextCronRuns(expr, 3)

    expect(result).toHaveLength(3)
    for (const r of result) {
      expect(r).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    }
  })

  it('returns empty array for empty expression', () => {
    expect(computeNextCronRuns('', 5)).toEqual([])
  })

  it('throws on invalid cron expression', () => {
    expect(() => computeNextCronRuns('not-a-cron', 5)).toThrow()
  })
})
