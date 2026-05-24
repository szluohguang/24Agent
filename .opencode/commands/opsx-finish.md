---
description: Complete an implementation phase with verification, reports, logs, and git commit
---

Complete the current implementation phase by running the full superpowers verification chain, generating execution reports/logs, and committing.

**Input**: Optional change name. If omitted, it will be inferred from context.

**Steps**

1. **Verify the build chain (strict order)**
   ```bash
   npm run typecheck
   npm run build
   npm run test
   ```
   If any step fails, STOP and fix before proceeding.

2. **Load superpowers verification skill**
   - Load `skill("verification-before-completion")`
   - Self-review code against AGENTS.md rules:
     - Commit messages in Chinese?
     - Code comments in correct language?
     - Tests exist for new code?
     - No skipped validation steps?

3. **Generate execution log**
   Create `superpowers/execution-logs/yyyy-mm-dd-<描述>.md` with:
   ```markdown
   # yyyy-mm-dd-<描述> — 执行日志

   ## 任务登记
   - **日期**: yyyy-mm-dd
   - **任务描述**: <中文>
   - **任务概述**: <2-3 句>
   - **报告文件**: superpowers/execution-reports/yyyy-mm-dd-<描述>.md
   ```

4. **Generate execution report**
   Create `superpowers/execution-reports/yyyy-mm-dd-<描述>.md` with:
   - 变更概览、执行时间线、验证结果汇总、变更文件清单

5. **Update openspec tasks**
   - Mark completed tasks: `- [ ]` → `- [x]` in `openspec/changes/<name>/tasks.md`

6. **Git commit**
   ```bash
   git add <relevant files>
   git commit -m "<type>: 中文描述"
   ```
   Verify: `git log -1 --format="%s"` contains Chinese characters.

7. **Show status**
   ```
   ## Phase Complete ✓

   | Check | Status |
   |-------|--------|
   | typecheck | ✓ |
   | build | ✓ |
   | tests | N/N ✓ |
   | execution log | ✓ |
   | execution report | ✓ |
   | tasks.md updated | ✓ |
   | git commit | ✓ <sha> |
   ```
