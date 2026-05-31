## Why

当前 WebUI 功能与后端能力严重脱节：Phase 3 新增了任务持久化、健康检查、自动恢复和任务调度，但 WebUI 完全没有对应的展示和操作界面。用户只能通过 REST API 或 WebSocket 手动操作，无法可视化监控系统状态、管理调度任务、或感知恢复事件。补全这些功能可以让整个系统达到可观测可运维的成熟度。

## What Changes

### 新增能力

- `health-dashboard`: 健康监控面板，展示 Agent 健康矩阵、心跳状态、错误率、重试统计、预算消耗
- `schedule-management`: 任务调度管理界面，支持查看/创建/启用/禁用 cron 调度任务，含调度日历视图
- `recovery-visualizer`: 恢复状态显示，包括 WebSocket 重连指示器、任务重试/恢复状态标记、恢复事件时间线高亮

### 修改的能力

- `i18n`: 补全英文翻译 en-US.json，修复英文模式下显示原始 message id 的问题
- `task-tree`: 整合现有但未使用的 TreeView 组件；新增 scheduled/queued/retrying 状态显示
- `websocket-client`: useWebSocket hook 增加 isReconnecting、reconnectAttempts 暴露，支持指数退避显示

## Impact

| 区域 | 影响 |
|---|---|
| 前端组件 | 新增 2-3 个面板组件，修改 App.tsx 状态管理和路由 |
| 国际化 | 新增 en-US.json 翻译文件，新增 40+ 翻译 id |
| WebSocket | 客户端 hook 扩展，服务端新增 health-report 消息广播 |
| REST API | 后端无新增（复用 Phase 3 现有端点） |
| 依赖 | 无新增外部依赖 |
| 测试 | 新增前端组件测试，增强 WebSocket hook 测试 |
