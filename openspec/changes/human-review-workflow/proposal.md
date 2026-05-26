## Why

当前系统是纯自动闭环：任务创建后自动分派、执行、评估、标记完成，中间没有任何人工介入环节。`strict` 权限级别虽然配置了 `action: 'ask'`，但没有任何审批处理逻辑，导致该级别名存实亡。当需要人工审核 Agent 执行结果（特别是在高安全场景下），系统无法支持。

## What Changes

- 新增 `awaiting_review` / `rejected` 任务状态，严格模式下任务执行完等待人工审核
- 新增审核 API 端点（通过/驳回）及 WebSocket 消息类型
- 新增 WebUI 审核面板，展示任务结果摘要、diff、费用，支持通过/驳回+反馈
- 驳回反馈注入 re-dispatch prompt 上下文，Agent 可参考反馈修改后重提
- 审核历史记录在 timeline 中，支持追溯

## Capabilities

### New Capabilities
- `human-review`: 任务级人工审核工作流，支持通过/驳回并附反馈，strict 权限级别下触发

### Modified Capabilities
<!-- 无现有 spec 被修改 -->

## Impact

- **后端**: `orchestrator/types.ts`（新增状态）、`core.ts`（审核流程）、`store.ts`（审核记录）、`server/api.ts`（审核端点）、`server/websocket.ts`（审核消息）
- **前端**: 新增 `ReviewPanel.tsx` 组件，更新 `TreeView` 状态图标，更新 `types.ts`
- **测试**: 新增审核流程单元测试 + E2E 测试
