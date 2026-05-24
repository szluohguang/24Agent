# Phase 2：TDD 自动化测试 + 浏览器 E2E 测试

> 所有实现必须遵循 TDD 流程：先写测试 → 测试失败（Red）→ 编写实现 → 测试通过（Green）→ 重构（Refactor）

---

## 1. 测试基础设施搭建

- [x] 1.1 安装新增 devDependencies：`@playwright/test`、`@vitest/coverage-v8`
- [x] 1.2 增强 `vitest.config.ts`：添加 coverage 配置（v8 provider、lcov+html reporter）
- [x] 1.3 创建 `src/test-utils/factories.ts`：mock 工厂函数（`createMockClient`、`createMockCallbacks`、`createOrchestratorWithMockClient`）
- [x] 1.4 删除未使用的 mockClient.ts、mockSdk.ts 文件
- [x] 1.5 验证测试基础设施：`vitest run --coverage` 成功

## 2. Orchestrator 核心单元测试（TDD）

- [x] 2.1 编写 `src/orchestrator/__tests__/core.test.ts`
  - `addTask()`：创建任务(3)、依赖任务(1)、唯一ID(1)、timeline(1) → 4 tests
  - `dispatchTask()`：不存在任务(1)、正常分发(1)、预算超限(1) → 3 tests
  - `abortTask()`：正常中止(1)、不存在(1)、无session(1) → 3 tests
  - `getState()`：空状态(1)、包含任务(1) → 2 tests
  - `configuration()`：权限(1)、预算(1)、并行(1) → 3 tests
  - `session lifecycle`：idle完成(1)、错误重试(1)、max retries(1) → 3 tests
- [x] 2.2 运行测试 → 18/18 通过

## 3. ACP Manager 单元测试（TDD）

- [x] 3.1 编写 `src/orchestrator/__tests__/acp-manager.test.ts`
  - `buildPermissionRuleset()`：trusted(1)、safe(1)、strict(1) → 3 tests
  - `createSubAgentSession()`：正常参数(1)、无data包装(1) → 2 tests
  - `sendTaskPrompt()`：发送prompt(1) → 1 test
  - `getSessionMessages()`：正常获取(1)、无data包装(1) → 2 tests
  - `getSessionDiff()`：正常获取(1)、无data包装(1) → 2 tests
  - `abortSession()`：中止会话(1) → 1 test
  - `createOpencodeServer()`：创建服务(1) → 1 test
- [x] 3.2 运行测试 → 13/13 通过

## 4. Event Stream 单元测试（TDD）

- [x] 4.1 编写 `src/observer/__tests__/event-stream.test.ts`
  - text delta 事件路由(1)
  - tool called 事件 + timeline(1)
  - shell started 事件 + timeline(1)
  - shell ended 事件(1)
  - session idle 事件(1)
  - session error 事件(1)
  - session.next.step.failed 错误路由(1)
  - AbortSignal 停止(1)
  - 空payload跳过(1)
- [x] 4.2 运行测试 → 9/9 通过

## 5. Evaluator 单元测试（TDD）

- [x] 5.1 编写 `src/observer/__tests__/evaluator.test.ts`
  - 提取 summary/cost/tokens(1)
  - 提取 artifacts(1)
  - 无assistant消息返回空值(1)
  - 无data包装处理(1)
  - summary非对象容错(1)
- [x] 5.2 运行测试 → 5/5 通过

## 6. WebSocket 和 API 测试增强

- [x] 6.1 编写 `src/server/__tests__/websocket.test.ts`
  - 广播回调结构(1)
  - 无客户端广播不抛异常(1)
  - timeline广播(1)
  - stream delta广播(1)
  - agent state广播(1)
  - state update广播(1)
- [x] 6.2 增强 `src/server/__tests__/http.test.ts`
  - GET端点: /(1)、/health(1)、/api/state(1)、SPA回退(1) → 4 tests
  - POST /api/task: 创建(1)、拒绝(1) → 2 tests
  - POST /api/task/:taskId/dispatch: 存在(1)、不存在(1) → 2 tests
  - POST /api/task/:taskId/abort: 中止(1) → 1 test
  - POST /api/config: permission(1)、budget(1)、parallel(1) → 3 tests
- [x] 6.3 运行所有测试 → 17/17 通过

## 7. Playwright 浏览器 E2E 测试

- [x] 7.1 创建 `src/webui/e2e/playwright.config.ts`
  - 配置 chromium、locale zh-CN、webServer 指向 test-server.ts
- [x] 7.2 创建 `src/webui/e2e/test-server.ts`
  - 轻量测试服务，使用 mock client 替代真实 opencode 连接
- [x] 7.3 编写 `src/webui/e2e/specs/app.spec.ts`
  - 页面加载(1)、空状态(1)、语言切换按钮(1)、权限选择器(1)、输入框(1)、Tab按钮(1)、连接状态(1)
- [x] 7.4 编写 `src/webui/e2e/specs/i18n.spec.ts`
  - 默认中文(1)、切换英文(1)、来回切换(1)
- [x] 7.5 运行 Playwright 测试 → 10/10 通过

## 8. 构建与验证

- [x] 8.1 `npm run typecheck` → 通过
- [x] 8.2 `npm run build` → 通过（tsc + vite build）
- [x] 8.3 `npm run test -- --coverage` → 62/62 通过，覆盖率 72.95% lines
- [x] 8.4 Playwright E2E → 10/10 通过
