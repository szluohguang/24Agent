export function computeNextCronRuns(cronExpr: string, count: number = 5): string[] {
  if (!cronExpr.trim()) return []

  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`)

  const [minStr, hourStr, domStr, monStr, dowStr] = parts
  const valid = /^(\*|[0-9,\-*/]+)$/
  for (const p of parts) {
    if (!valid.test(p)) throw new Error(`Invalid cron field: ${p}`)
  }

  const results: string[] = []
  const now = new Date()
  now.setSeconds(0, 0)

  let cursor = new Date(now)
  let maxIterations = 525600 // max 1 year of minutes

  while (results.length < count && maxIterations > 0) {
    maxIterations--
    cursor = new Date(cursor.getTime() + 60000)

    if (matchesCron(cursor, minStr, hourStr, domStr, monStr, dowStr)) {
      results.push(formatDate(cursor))
    }
  }

  return results
}

function matchesCron(date: Date, minStr: string, hourStr: string, domStr: string, monStr: string, dowStr: string): boolean {
  return fieldMatches(date.getMinutes(), minStr)
    && fieldMatches(date.getHours(), hourStr)
    && fieldMatches(date.getDate(), domStr)
    && fieldMatches(date.getMonth() + 1, monStr)
    && fieldMatches(date.getDay(), dowStr)
}

function fieldMatches(value: number, pattern: string): boolean {
  if (pattern === '*') return true

  for (const part of pattern.split(',')) {
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      const [start, end] = range === '*' ? [0, 59] : range.split('-').map(Number)
      if (isNaN(start) || isNaN(end) || isNaN(step)) continue
      if (value >= start && value <= end && (value - start) % step === 0) return true
    } else if (part.includes('-')) {
      const [low, high] = part.split('-').map(Number)
      if (isNaN(low) || isNaN(high)) continue
      if (value >= low && value <= high) return true
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num) && value === num) return true
    }
  }

  return false
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}
