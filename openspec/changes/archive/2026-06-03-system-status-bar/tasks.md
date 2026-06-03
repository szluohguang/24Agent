## 1. 后端日志系统

- [x] 1.1 在 `src/webui/src/types.ts` 中增加 SystemLogEntry 类型定义
- [x] 1.2 在 `src/orchestrator/logger.ts` 中实现 LogBuffer 环形缓存（最近 500 条），支持 push、getAll、按类型过滤
- [x] 1.3 在 `src/server/api.ts` 增加 `GET /api/logs` 端点
- [x] 1.4 在 `src/server/websocket.ts` 增加 `system-log` 消息类型，日志推送广播
- [x] 1.5 在 `src/webui/src/hooks/useWebSocket.ts` 的 WsMessage 中增加 `system-log` 类型

## 2. 日志来源采集

- [x] 2.1 在 `src/orchestrator/core.ts` 中注入 LogBuffer，采集健康检查失败、agent 错误/重试/hung/dead、预算超限、API 错误
- [x] 2.2 实现同源同类型 500ms 消息合并

## 3. 底部状态栏组件

- [x] 3.1 创建 `src/webui/src/components/StatusBar.tsx`，固定底部 28px 高度
- [x] 3.2 实现颜色分级显示：info=蓝、warning=黄、error=红
- [x] 3.3 实现 error 不可覆盖逻辑（acknowledged 标记检查）
- [x] 3.4 实现消息合并计数显示
- [x] 3.5 实现点击状态栏打开日志详情页

## 4. 日志详情页组件

- [x] 4.1 创建 `src/webui/src/components/LogViewer.tsx`
- [x] 4.2 实现按时间倒序展示
- [x] 4.3 实现类型筛选（all/info/warning/error）
- [x] 4.4 实现 error 条目点击标记 acknowledged
- [x] 4.5 实现 WebSocket 实时追加新日志

## 5. App.tsx 集成

- [x] 5.1 修改 App.tsx 布局，增加 StatusBar 到底部
- [x] 5.2 集成 system-log WebSocket 消息处理
- [x] 5.3 集成 GET /api/logs 初始加载
- [x] 5.4 日志详情页路由

## 6. 验证

- [x] 6.1 编译验证：TypeScript 类型检查和构建通过
- [x] 6.2 单元测试：所有 208 项测试通过
- [x] 6.3 端到端验证：模拟错误场景确认状态栏显示和覆盖行为
