# 任务列表 — Phase 1：项目骨架

## 任务 1：初始化项目结构
- [x] 创建 `package.json` 及依赖
- [x] 创建 `tsconfig.json`，目标 ESNext
- [x] 创建目录结构：`src/orchestrator/ server/ observer/ webui/`
- [x] 创建 `.gitignore`

## 任务 2：opencode SDK 集成
- [x] 通过 `createOpencode()` 初始化 opencode 服务
- [x] 创建 ACP 客户端封装（session 增删改查、prompt、事件）
- [x] ~~测试：服务启动、客户端连接、健康检查通过~~ _（需要实时 opencode serve）_
- [x] 通过全局事件流处理 SSE 订阅

## 任务 3：HTTP/WebSocket 服务
- [x] Fastify 服务器 + WebSocket 插件
- [x] WebSocket 端点用于 WebUI 通信
- [x] REST API：`POST /api/task` + `POST /api/task/:taskId/dispatch` + `POST /api/task/:taskId/abort`
- [x] REST API：`GET /api/state`、`GET /api/health`
- [x] 配置端点：权限级别、预算限制、并行数量

## 任务 4：单任务分发流程
- [x] createSession：`acp-manager.ts` 调用 `client.session.create()`
- [x] sendPrompt：`sendTaskPrompt()` 向会话发送 prompt
- [x] subscribeEvents：`event-stream.ts` 将 SSE 路由到 WebSocket 客户端
- [x] waitForIdle：事件处理器检测 `session.idle` 事件
- [x] getResult：任务完成后通过 `evaluator.ts` 拉取消息和 diff

## 任务 5：WebUI 基础
- [x] React 应用 + Vite（TypeScript + JSX）
- [x] WebSocket 钩子（连接、收发、自动重连）
- [x] 任务树视图（状态图标 + dispatch/abort 按钮）
- [x] 流式控制台组件（实时 text delta 展示）
- [x] 时间线组件（带来源着色的事件日志）
- [x] 控制栏（权限选择、任务创建、连接状态指示）
- [x] WebUI 连接后端 WebSocket — 完整双向通信

## 任务 6：验证与完善
- [x] 后端 TypeScript 编译通过 `tsc --noEmit`
- [x] ~~Vite 开发服务器可运行~~ _（需要 npm run dev）_
- [x] ~~端到端流程：WebUI → WS → Fastify → opencode session → SSE → WebUI~~ _（需要实时 opencode）_
