---
description: Check that openspec tasks are confirmed before running opsx-apply (Superpowers gate)
---

Run this check before `opsx-apply` to ensure the openspec confirmation gate has been passed.

**When to use**: After openspec tasks are created but before any code implementation begins.

**Steps**

1. **Verify openspec status**
   ```bash
   openspec status --change "<name>" --json 2>/dev/null || echo "NO_CHANGE"
   ```
   If no active change exists, you may be doing ad-hoc work — confirm with the user first.

2. **Check user confirmation status**
   - Scan conversation history: has the user explicitly confirmed the openspec tasks?
   - Look for keywords: "确认", "同意", "可以", "ok", "yes", "approved" after the tasks were presented
   - If NOT confirmed: STOP and present the tasks to the user for confirmation

3. **Announce gateway status**
   ```
   ## Pre-apply Check: <change-name>

   - OpenSpec tasks: verified
   - User confirmation: ✓ / ✗ (<reason>)
   
   Status: PASS / BLOCKED
   ```

4. **On PASS**: Proceed to `opsx-apply`

5. **On BLOCKED**: Present the task list to the user using the Question tool and wait for explicit confirmation
