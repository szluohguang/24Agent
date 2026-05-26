## 1. 后端 Store 层

- [x] 1.1 `orchestrator/store.ts`: 新增 `deleteTask(id)` — 从 SQLite tasks 表删除
- [x] 1.2 `orchestrator/store.ts`: 新增 `deleteAgent(sessionId)` — 从 SQLite agents 表删除

## 2. Core 编排逻辑

- [x] 2.1 `orchestrator/core.ts`: 新增 `deleteTask(taskId)` 方法 — 清除内存 Map、清理关联 Agent 会话、调用 store 删除、记录 timeline

## 3. API 端点

- [x] 3.1 `server/api.ts`: 新增 `DELETE /api/task/:taskId` 端点

## 4. WebSocket

- [x] 4.1 `server/websocket.ts`: 新增 `delete-task` 消息处理，回复 `task-deleted`

## 5. WebUI 前端

- [x] 5.1 `webui/src/components/TreeView.tsx`: 新增 `onDelete` prop；completed/failed/rejected/awaiting_review 状态显示删除按钮
- [x] 5.2 `webui/src/App.tsx`: 新增 `handleDelete` 回调，传入 TreeView
- [x] 5.3 `webui/src/i18n/zh-CN.json` + `en-US.json`: 新增 `task.delete` 翻译

## 6. 测试与验证

- [x] 6.1 运行 `npm run typecheck` 确认编译通过
- [x] 6.2 运行 `npm run test` 确认全部测试通过
- [x] 6.3 运行 `npm run build` 确认构建通过
- [x] 6.4 浏览器验证删除按钮渲染和 API 响应
