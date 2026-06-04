# Tasks

## Phase 1: 重命名 Comet → Eagle

- [x] 创建 `skills/eagle/SKILL.md`
- [x] 创建 5 个 `skills/eagle/phases/*.skill.md`（含 YAML frontmatter）
- [x] 创建 `eagle-orchestration.json`
- [x] 创建 `src/eagle-engine/`（EagleOrchestrator, EagleStateMachine, EagleGuards, EagleGuardScheduler）
- [x] 更新 `core.ts` 所有 cometEngine → eagleEngine
- [x] 更新 `api.ts`: /api/eagle/status
- [x] 前端类型 `EagleEngineState`（通过 re-export 兼容）

## Phase 2: Eagle Code Guards

- [x] `EagleGuards.checkOpenExit()` — proposal/design/tasks.md 存在非空
- [x] `EagleGuards.checkDesignExit()` — Design Doc + handoff context
- [x] `EagleGuards.checkBuildExit()` — isolation/mode + tasks 完成
- [x] `EagleGuards.checkVerifyExit()` — 验证报告 + branch 处理
- [x] `EagleGuards.checkArchiveExit()` — 始终成功
- [x] `EagleGuards.checkEntry()` — 入口门禁

## Phase 3: Eagle Engine

- [x] `EagleOrchestrator.transition()` 调用 `EagleGuards.checkExit()`
- [x] `EagleGuardScheduler.runGuard()` 委托给 `EagleGuards`
- [x] transition() 接受 mode 参数 (auto/manual)
- [x] `forceTransition(targetPhase)` — 跳过 guard 推进
- [x] `rollbackTransition(targetPhase)` — 安全回退

## Phase 4: 任务系统集成

- [x] `dispatchTask()`: eagle 阶段校验
- [x] `dispatchTask()`: SkillLoader 构建专属 prompt
- [x] `handleSessionComplete()`: 阶段完成自动 transition
- [x] `handleSessionComplete()`: guard 失败 → mode auto 回退任务
- [x] `acp-manager.ts`: `createSubAgentSession()` 传入 permission ruleset

## Phase 5: SkillLoader + Prompt

- [x] `src/eagle-engine/SkillLoader.ts` — YAML frontmatter 解析
- [x] `src/eagle-engine/prompt-templates.ts` — phase 专属 prompt 渲染
- [x] prompt 指示子 Agent 调用 skill tool 加载 'eagle' 技能

## Phase 6: SkillChecker

- [x] `src/eagle-engine/SkillChecker.ts` — 3 项检查 + initAll
- [x] Step 1: openspec init 检查
- [x] Step 2: .opencode/skills/eagle/ 完整性
- [x] Step 3: eagle-orchestration.json 存在
- [x] `POST /api/project/init-eagle` — 统一入口 API

## Phase 7: Eagle Mode Settings

- [x] API `GET /api/config/eagle-mode` → `{ mode: 'auto' }`
- [x] API `POST /api/config/eagle-mode` → 设置 mode
- [ ] `core.ts:loadConfig()` 读取 `eagle_mode`（via store.getConfig）
- [ ] `SettingsPage.tsx` Eagle Mode 选择器
- [ ] mode 切换即时生效（WS broadcast）

## Phase 8: HealthDashboard

- [x] Eagle 状态机流程图（5 phase nodes + guard lines）
- [x] Guard 状态显示（✓/✗/⟳）
- [ ] 模式指示器 `[auto]` / `[manual]`
- [ ] 决策卡片交互（人工模式）
- [ ] Skill 加载状态显示

## Phase 9: 测试 & 验证

- [x] `eagle-engine/__tests__/` 11 个测试全部通过
- [x] TypeScript 类型检查零错误
- [x] `openspec validate` 确认通过
