## Why

当前系统没有删除任务的功能，已完成、失败、驳回的任务会永久留在任务列表中，无法清理。用户需要能够删除不再需要的任务以保持列表整洁。

## What Changes

- 后端新增 `DELETE /api/task/:taskId` 端点，支持按 ID 删除任务
- 后端新增 `deleteTask()` 方法，清理内存和数据库中的任务及关联 Agent 数据
- WebSocket 新增 `delete-task` 消息类型
- WebUI TreeView 中已完成/失败/驳回/待审核状态的任务显示"删除"按钮
- Store 层新增 `deleteTask()` 和 `deleteAgent()` 方法

## Capabilities

### New Capabilities
- `task-deletion`: 支持从 UI 和 API 删除任务，自动清理关联的 Agent 会话和持久化数据

### Modified Capabilities
- 无

## Impact

- **后端**: `orchestrator/core.ts`（新增 deleteTask 方法）、`orchestrator/store.ts`（新增 deleteTask/deleteAgent）、`server/api.ts`（DELETE 端点）、`server/websocket.ts`（delete-task 消息）
- **前端**: `webui/src/components/TreeView.tsx`（删除按钮）、`webui/src/App.tsx`（handleDelete 回调）、`webui/src/i18n/`（翻译 key）
