## 1. 类型与数据模型

- [x] 1.1 后端 `orchestrator/types.ts`: 新增 `'awaiting_review' | 'rejected'` 到 `TaskStatus`；新增 `ReviewRecord` 接口（taskId, action, feedback?, reviewer, reviewedAt）
- [x] 1.2 前端 `webui/src/types.ts`: 同步新增 `'awaiting_review' | 'rejected'` 到前端 `TaskStatus`
- [x] 1.3 `orchestrator/store.ts`: 新增 `getTasksAwaitingReview()`、`getReviewHistory(taskId)`、`saveReviewRecord(record)` 方法
- [x] 1.4 `orchestrator/database.ts`: 可选 — 确认 SQLite 表结构是否需要扩展 review 记录表（若 store 直接用内存/任务表扩展字段可跳过）

## 2. Core 编排逻辑

- [x] 2.1 `orchestrator/core.ts`: 修改 `handleSessionComplete()` — 评估后判断 permission level，strict 则设置 `awaiting_review` 并暂存 result，trusted/safe 保持自动完成
- [x] 2.2 `orchestrator/core.ts`: 新增 `approveTask(taskId, feedback?)` 方法 — 状态改为 `completed`，记录 timeline `review-approved`，广播 state-update
- [x] 2.3 `orchestrator/core.ts`: 新增 `rejectTask(taskId, feedback)` 方法 — 状态改为 `rejected`，记录 timeline `review-rejected`（含 feedback），广播 state-update
- [x] 2.4 `orchestrator/core.ts`: 修改 `dispatchTask()` — 若任务状态为 `rejected`，将 rejection feedback 注入 prompt 上下文后 dispatch

## 3. API 端点

- [x] 3.1 `server/api.ts`: 新增 `POST /api/task/:taskId/approve` — 调用 core.approveTask，返回 404/409/200
- [x] 3.2 `server/api.ts`: 新增 `POST /api/task/:taskId/reject` — 校验 feedback 必填，调用 core.rejectTask，返回 400/404/409/200
- [x] 3.3 `server/api.ts`: 新增 `GET /api/tasks/awaiting-review` — 返回待审核任务列表（含结果摘要、费用、变更文件）
- [x] 3.4 `server/api.ts`: 新增 `GET /api/task/:taskId/review-history` — 返回该任务的审核历史

## 4. WebSocket 消息

- [x] 4.1 `server/websocket.ts`: 服务端处理客户端消息 `approve-task`（含 taskId, feedback?）和 `reject-task`（含 taskId, feedback）
- [x] 4.2 `server/websocket.ts`: 服务端广播新 outbound 类型 `awaiting-review`（新任务进入待审核通知）

## 5. WebUI 前端

- [x] 5.1 `webui/src/components/ReviewPanel.tsx`: 新建审核面板组件 — 展示任务描述、执行结果摘要、token 消耗、变更文件列表；底部通过/驳回按钮
- [x] 5.2 `webui/src/App.tsx`: 在三栏布局中间栏集成 ReviewPanel，选中 `awaiting_review` 任务时显示
- [x] 5.3 `webui/src/components/TreeView.tsx`: 更新状态图标 — `awaiting_review` 黄色待审图标，`rejected` 红色撤销图标
- [x] 5.4 `webui/src/hooks/useWebSocket.ts`: 扩展 WS 消息处理，支持 `approve-task` 和 `reject-task` 发送
- [x] 5.5 `webui/src/i18n/zh-CN.json` + `en-US.json`: 新增审核相关翻译 key（approve/reject/feedback/awaiting-review 等）

## 6. 测试

- [x] 6.1 后端测试: `orchestrator/__tests__/core.test.ts` 新增审核流程测试 — approveTask / rejectTask / rejected re-dispatch 注入反馈
- [x] 6.2 后端测试: `server/__tests__/api.test.ts` 新增审核 API 端点测试 — approve/reject/awaiting-review-list
- [x] 6.3 前端测试: `webui/src/components/__tests__/ReviewPanel.test.tsx` 新增审核面板组件测试
- [x] 6.4 E2E 测试: `webui/e2e/specs/` 新增审核流程 E2E 测试 — 创建 strict 任务 → 执行完待审核 → 通过/驳回

## 7. 集成验证

- [x] 7.1 运行 `npm run typecheck` 确认 TypeScript 编译通过
- [x] 7.2 运行 `npm run test` 确认全部单元测试通过
- [x] 7.3 运行 `npm run build` 确认构建通过
- [x] 7.4 运行 `npm run test:e2e` 确认 E2E 测试通过
