# Phase 2: TDD 自动化测试 + 浏览器 E2E 测试 — 执行日志

## 2026-05-24 21:05 - 21:30

### 审计 Phase 1
- 全面审计现有代码：16 个源文件，仅 4 个 HTTP 测试
- 发现核心模块（orchestrator、acp-manager、event-stream、evaluator、websocket）均无测试
- 前端无浏览器自动化测试

### OpenSpec 规划
- 创建 `phase2-tdd-e2e` 变更
- 编写 proposal.md、design.md、tasks.md
- 规划 8 大任务模块

### 测试基础设施搭建
- 安装 `@playwright/test`、`@vitest/coverage-v8`
- 增强 vitest.config.ts — 添加 v8 coverage 配置
- 创建 `src/test-utils/factories.ts` — mock 工厂（`createMockClient`、`createMockCallbacks`、`createOrchestratorWithMockClient`）
- 删除未使用的 mockClient.ts、mockSdk.ts

### TDD: Orchestrator Core (18 tests)
- `addTask()` 测试：正常创建、依赖、唯一ID、timeline
- `dispatchTask()` 测试：不存在任务抛异常、正常分发、预算超限
- `abortTask()` 测试：正常中止、不存在、无session
- `getState()` 测试：空状态、包含任务
- 配置测试：权限、预算、并行度
- session 生命周期：idle完成、错误重试、max retries

### TDD: ACP Manager (13 tests)
- `buildPermissionRuleset()`: trusted/safe/strict
- `createSubAgentSession()`: 正常创建、无data包装
- `sendTaskPrompt()`、`getSessionMessages()`、`getSessionDiff()`、`abortSession()`
- SDK 调用参数验证

### TDD: Event Stream (9 tests)
- 所有事件类型路由：text delta、tool called、shell started/ended、idle、error
- session.next.step.failed 错误路由
- AbortSignal 停止处理
- 空payload跳过

### TDD: Evaluator (5 tests)
- 提取 summary/cost/tokens
- 提取 artifacts 从 diff
- 无消息返回空值
- 无data包装处理
- summary非对象容错

### WebSocket + API 测试增强 (17 tests)
- WebSocket 广播回调结构验证
- REST API: POST 端点全覆盖（task 创建/拒绝、dispatch 成功/失败、abort、config）

### Playwright E2E 测试 (10 tests)
- 创建 test-server.ts（mock client 避免真实 opencode 依赖）
- app.spec.ts: 页面加载、空状态、语言切换按钮、权限选择器、输入框、Tab、连接状态
- i18n.spec.ts: 默认中文、切换英文、来回切换

### 验证
- `tsc --noEmit` → 通过
- `npm run build` → 通过
- `vitest run --coverage` → 62/62 通过，覆盖率 72.95%
- `playwright test` → 10/10 通过
