# Tasks

## Phase 1: 重命名 Comet → Eagle

- [x] 创建 `skills/eagle/SKILL.md`（重写，纯代码驱动版）
- [x] 创建 `skills/eagle/phases/open.skill.md`（YAML frontmatter + 职责）
- [x] 创建 `skills/eagle/phases/design.skill.md`
- [x] 创建 `skills/eagle/phases/build.skill.md`
- [x] 创建 `skills/eagle/phases/verify.skill.md`
- [x] 创建 `skills/eagle/phases/archive.skill.md`
- [x] 创建 `eagle-orchestration.json`（schema: eagle-orchestration-v1）
- [ ] 重命名 `src/comet-engine/` → `src/eagle-engine/`
- [ ] 重命名类: `CometOrchestrator` → `EagleOrchestrator`
- [ ] 重命名类: `CometStateMachine` → `EagleStateMachine`
- [ ] 重命名类: `CometGuardScheduler` → `EagleGuardScheduler`
- [ ] 重命名类: `CodeGuards` → `EagleGuards`
- [ ] 更新 `core.ts` 所有 cometEngine → eagleEngine 引用
- [ ] 更新 `types.ts` 前端类型: `CometEngineState` → `EagleEngineState`
- [ ] 更新 WebSocket 事件: `comet-state-update` → `eagle-state-update`
- [ ] 更新 API: `GET /api/comet/status` → `GET /api/eagle/status`
- [ ] 更新 config 键: `comet_mode` → `eagle_mode`
- [ ] 更新 `HealthDashboard.tsx` 所有 comet 引用
- [ ] 更新 `StreamConsole.tsx` 中 cometDecision 引用
- [ ] 更新 `App.tsx` 所有 cometState 引用

## Phase 2: Eagle Code Guards (EagleGuards.ts)

- [ ] 创建 `src/eagle-engine/EagleGuards.ts`，实现 TypeScript 门禁
- [ ] `checkOpenExit()` — 校验 proposal/design/tasks.md 存在且非空
- [ ] `checkDesignExit()` — 校验 Design Doc 存在、handoff context 完整性
- [ ] `checkBuildExit()` — 校验 isolation/mode 已设置、tasks 全部完成
- [ ] `checkVerifyExit()` — 校验验证报告存在、分支已处理
- [ ] `checkArchiveExit()` — 始终成功（最终阶段）
- [ ] `checkEntry()` — 入口门禁校验

## Phase 3: Eagle Engine (EagleOrchestrator.ts)

- [ ] `EagleOrchestrator.transition()` 调用 `EagleGuards.checkExit()` 替代 shell
- [ ] `EagleGuardScheduler.runGuard()` 委托给 `EagleGuards`
- [ ] transition() 接受 mode 参数，决定 guard 失败行为
- [ ] `forceTransition(targetPhase)` — 跳过 guard 直接推进
- [ ] `rollbackTransition(targetPhase)` — 回退阶段，回收任务
- [ ] `EagleStateMachine` 管理 `.eagle.yaml` 状态读写
- [ ] 更新 `eagle-orchestration.json` guard 引用为 `eagle:open-exit` 等

## Phase 4: 任务系统集成 (core.ts)

- [ ] `dispatchTask()`: eagle 阶段校验，`task.cometPhase !== engine.phase` 拒绝
- [ ] `dispatchTask()`: 通过 SkillLoader 加载 phase skill，构建专属 prompt
- [ ] `handleSessionComplete()`: 阶段完成自动调 `engine.transition(nextPhase)`
- [ ] `handleSessionComplete()`: verify fail → mode auto: rollback, mode manual: decision point
- [ ] `acp-manager.ts`: `createSubAgentSession()` 传入 `permission` ruleset

## Phase 5: SkillLoader + Prompt 注入

- [ ] 创建 `src/eagle-engine/SkillLoader.ts`，解析 skill.md YAML frontmatter
- [ ] 创建 `src/eagle-engine/prompt-templates.ts`，按 phase 渲染专属 prompt
- [ ] dispatchTask() 根据 task.cometPhase 加载 skill，注入 prompt
- [ ] prompt 指示子 Agent 调用 skill tool 加载 'eagle' 技能获取完整指令

## Phase 6: SkillChecker（项目目录初始化校验）

- [ ] 创建 `src/eagle-engine/SkillChecker.ts`（合并 3 项检查）
- [ ] Step 1: 检查 {projectDir}/.openspec.yaml 是否存在
- [ ] Step 2: 检查 {projectDir}/.opencode/skills/eagle/ 完整性
- [ ] Step 3: 检查 {projectDir}/eagle-orchestration.json 是否存在
- [ ] `POST /api/project/init-openspec` — 执行 `openspec init {projectDir}`
- [ ] `POST /api/project/init-skills` — 复制 skills/eagle/ → .opencode/skills/eagle/ + superpowers 复制
- [ ] `POST /api/project/init-eagle` — 统一入口: openspec init + eagle skills + superpowers skills
- [ ] 前端 `ProjectDirPrompt` 增强: 显示检查结果列表
- [ ] dispatchTask() prompt 包含 '请使用 skill tool 加载 "eagle" 技能' 指令
- [ ] 校验复制后文件完整性

## Phase 7: Eagle Mode Settings

- [ ] API `GET /api/config/eagle-mode` → `{ mode: 'auto' }`
- [ ] API `POST /api/config/eagle-mode` → 设置 mode
- [ ] `core.ts:loadConfig()` 读取 `eagle_mode`
- [ ] `SettingsPage.tsx` Eagle Mode 选择器（radio buttons）
- [ ] mode 切换即时生效

## Phase 8: HealthDashboard（决策 + 可视化）

- [ ] Eagle 状态机流程图（5 phase nodes + guard lines）
- [ ] Guard 状态显示（✓ 通过 / ✗ 失败 / ⟳ 执行中）
- [ ] 模式指示器 `[auto]` / `[manual]`
- [ ] 决策卡片交互（人工干预模式下）
- [ ] Skill 加载状态显示

## Phase 9: 测试 & 验证

- [ ] 更新 `eagle-engine/__tests__/` 适配新命名
- [ ] 全部测试通过
- [ ] TypeScript 类型检查零错误
- [ ] `openspec validate` 确认通过
