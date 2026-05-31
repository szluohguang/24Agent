## Context

当前项目测试覆盖严重不足（仅 4 个 HTTP 测试），核心模块（orchestrator、acp-manager、event-stream、evaluator、websocket）均无任何测试。前端也缺乏浏览器自动化测试。需要系统性地建立测试体系。

## Goals / Non-goals

**Goals:**
- 所有后端核心模块达到 80%+ 行覆盖率
- 前端关键用户流程通过 Playwright E2E 测试覆盖
- TDD 方式：先写测试，后补充/重构实现
- 测试运行快速（后端测试 < 5s，E2E 测试 < 30s）
- 构建和类型检查持续通过

**Non-goals:**
- 不需要真实 opencode 服务（所有 ACP 调用通过 mock）
- 不需要集成测试环境（CI 中可独立运行）
- 不修改现有业务逻辑

## Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| 浏览器测试框架 | Playwright | Cypress, Selenium | 生态好、速度快、支持 Chrome/Firefox/WebKit |
| Mock 策略 | vitest.mock + 工厂函数 | jest.mock, sinon | 与 vitest 原生集成，类型安全 |
| 覆盖率工具 | @vitest/coverage-v8 | istanbul | V8 原生，与 vitest 无缝集成 |
| 测试文件位置 | `src/**/__tests__/*.test.ts` | `__tests__/` 根目录 | 与模块同目录，就近原则 |
| E2E 测试位置 | `src/webui/e2e/` | `e2e/` 根目录 | 靠近前端代码 |

## Test Architecture

### Backend Unit Tests

```
src/
├── orchestrator/__tests__/
│   ├── core.test.ts           # Orchestrator 核心逻辑
│   └── acp-manager.test.ts    # ACP 会话管理（mock SDK）
├── observer/__tests__/
│   ├── event-stream.test.ts   # SSE 事件订阅与路由
│   └── evaluator.test.ts      # 任务完成评估
├── server/__tests__/
│   ├── http.test.ts           # 已有：HTTP 服务（增强）
│   ├── websocket.test.ts      # WebSocket 消息处理
│   └── api.test.ts            # REST API（独立测试）
```

### Mock Strategy

| 模块 | Mock 方式 | 说明 |
|---|---|---|
| `@opencode-ai/sdk` | `vi.mock()` | Mock `createOpencode()` 返回 mock client |
| `client.session.create` | Mock 函数 | 返回 `{ sessionId }` 或抛出错误 |
| `client.global.event` | AsyncIterator mock | 模拟 SSE 事件流 |
| Orchestrator | 工厂函数 | 创建带 mock acp-manager 的 Orchestrator |

### Browser E2E Tests

```
src/webui/e2e/
├── playwright.config.ts       # Playwright 配置
├── fixtures.ts                # 测试夹具
├── specs/
│   ├── app.spec.ts            # 页面加载、标题、基本渲染
│   ├── tasks.spec.ts          # 任务创建、分派、中止
│   ├── console.spec.ts        # 流式控制台展示
│   ├── timeline.spec.ts       # 时间线展示
│   └── i18n.spec.ts           # 中英文语言切换
```

E2E 测试需要后端运行，通过启动测试服务器 + Playwright 访问 WebUI。

### Coverage Targets

| 模块 | 目标覆盖率 |
|---|---|
| orchestrator/core.ts | ≥ 85% |
| orchestrator/acp-manager.ts | ≥ 80% |
| observer/event-stream.ts | ≥ 80% |
| observer/evaluator.ts | ≥ 85% |
| server/websocket.ts | ≥ 75% |
| server/api.ts | ≥ 80% |

## Risks / Trade-offs

- **[测试真实性]** Mock opencode SDK 意味着不测试真实 ACP 协议交互 —— 需要通过集成测试补充
- **[维护成本]** Playwright E2E 测试依赖 WebUI 构建产物，UI 变动时需同步更新 selector
- **[执行速度]** E2E 测试比单元测试慢（需启动浏览器），CI 中应单独 stage
