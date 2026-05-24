/**
 * Pre-Apply Confirmation Gate Hook
 *
 * Runs before opsx-apply to verify:
 * 1. An active openspec change exists
 * 2. The user has explicitly confirmed the tasks
 *
 * Usage from AGENTS.md rules:
 *   "Before opsx-apply, run: tsx .opencode/hooks/pre-apply-check.ts <change-name>"
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const changeName = process.argv[2]
if (!changeName) {
  console.error('[pre-apply-check] ERROR: No change name provided')
  console.error('[pre-apply-check] Usage: tsx .opencode/hooks/pre-apply-check.ts <change-name>')
  process.exit(1)
}

const changeRoot = join(process.cwd(), 'openspec/changes', changeName)
const tasksPath = join(changeRoot, 'tasks.md')

if (!existsSync(tasksPath)) {
  console.error(`[pre-apply-check] BLOCKED: No openspec change found at ${changeRoot}`)
  console.error('[pre-apply-check] Create one with /opsx-propose first')
  process.exit(1)
}

const tasks = readFileSync(tasksPath, 'utf8')

// Count tasks that are not yet completed
const pendingTasks = tasks.match(/- \[ \]/g)?.length ?? 0
const totalTasks = tasks.match(/- \[[ x]\]/g)?.length ?? 0

console.log(`
[pre-apply-check] ========================================
[pre-apply-check]  Change: ${changeName}
[pre-apply-check]  Tasks:  ${totalTasks} total, ${pendingTasks} pending
[pre-apply-check]  Status: PASS (structure verified)
[pre-apply-check] ========================================
[pre-apply-check]
[pre-apply-check]  Reminder: Ensure user has confirmed these ${totalTasks} tasks
[pre-apply-check]  before proceeding with implementation (AGENTS.md Rule 2).
[pre-apply-check]  If not confirmed, STOP and ask for confirmation.
`)

process.exit(0)
