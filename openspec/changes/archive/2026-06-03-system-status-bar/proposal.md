## Why

目前系统异常信息（服务中断、模型连接失败、接口调用错误等）缺乏统一的展示入口。健康状态仅通过右侧面板的 `healthStale` 半透明+文字提示反映，错误信息没有持久化展示，用户无法快速发现和排查问题。需要底部状态栏集中展示系统异常信息。

## What Changes

- 在主界面底部新增全局状态栏，固定高度，始终可见
- 状态栏按 log 类型颜色区分：info(蓝色)、warning(黄色)、error(红色)
- error 级别的消息不允许被覆盖（必须用户点击查看后才解除），其他级别可被新消息覆盖
- 状态栏可点击，打开日志详情页，按时间倒序展示完整日志
- 日志详情页支持按类型（info/warning/error）快速筛选排查

## Capabilities

### New Capabilities
- `system-status-bar`: 底部状态栏组件，显示系统异常信息，颜色分级，错误持久化
- `system-log-viewer`: 日志详情页面，按时间倒序展示，支持类型筛选过滤

### Modified Capabilities
- _(无)_

## Impact

- **src/webui/src/App.tsx** — 在主布局底部增加 StatusBar 组件
- **src/webui/src/components/StatusBar.tsx** — 新增底部状态栏组件
- **src/webui/src/components/LogViewer.tsx** — 新增日志详情页组件
- **src/webui/src/types.ts** — 增加 SystemLogEntry 类型定义
- **src/server/websocket.ts** — 增加 `system-log` WebSocket 消息类型
- **src/server/api.ts** — 增加 `GET /api/logs` 端点（历史日志+实时日志缓存）
- **src/orchestrator/logger.ts** — 增加日志缓存和推送接口
- 不涉及新外部依赖，不涉及数据库 schema 变更
