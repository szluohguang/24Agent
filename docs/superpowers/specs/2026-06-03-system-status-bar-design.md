---
comet_change: system-status-bar
role: technical-design
canonical_spec: openspec
---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                  系统日志流                           │
├─────────────────┬─────────────────┬─────────────────┤
│ 健康检查失败     │ Agent 错误/重试   │ 预算/API 错误   │
│ WebSocket 异常   │ Session hung/dead│ 系统启停         │
└────────┬────────┴────────┬────────┴────────┬────────┘
         │                 │                 │
         ▼                 ▼                 ▼
         ┌─────────────────────────────────────┐
         │         LogBuffer (500条环形缓存)     │
         │  同源同类型 500ms 合并 + 计数          │
         ├──────────────────┬──────────────────┤
         │ GET /api/logs     │ WS system-log    │
         │ (初始加载)        │ (实时推送)        │
         └──────────────────┴──────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
   ┌──────────┐              ┌──────────────┐
   │ StatusBar │  ←click→    │  LogViewer    │
   │ 底部 28px │              │ 时间倒序+筛选  │
   │ 颜色分级   │              │ error 可确认   │
   │ error 持久 │              │ WS 实时追加    │
   └──────────┘              └──────────────┘
```

## 核心模块

### LogBuffer (src/orchestrator/logger.ts)

```typescript
class LogBuffer {
  private maxSize = 500
  private entries: SystemLogEntry[] = []
  private lastMerge: Record<string, number> = {} // source+type → last time

  push(entry: Omit<SystemLogEntry, 'id' | 'time'>): void
  getAll(): SystemLogEntry[]
  getByType(type: string): SystemLogEntry[]
}
```

### SystemLogEntry (src/webui/src/types.ts)

```typescript
interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string
  count?: number       // 合并计数
  acknowledged?: boolean
}
```

### StatusBar (src/webui/src/components/StatusBar.tsx)

- Fixed bottom, height 28px
- Displays latest unacknowledged log (error takes priority)
- Click → open LogViewer
- Color: #58a6ff(info) / #d29922(warning) / #da3633(error)

### LogViewer (src/webui/src/components/LogViewer.tsx)

- Full-height log list, time-descending
- Filter tabs: All | Info | Warning | Error
- Click error → set acknowledged = true
- WebSocket real-time append
- Initial load from GET /api/logs

## 日志来源采集

| Source | Trigger | Type | 注入位置 |
|--------|---------|------|---------|
| health | GET /health 失败 | error | App.tsx health polling |
| agent-error | session error | error | orchestrator handleSessionError |
| agent-retry | 自动重试 | warning | orchestrator handleSessionError |
| agent-hung | session 无响应 | error | orchestrator handleHungSession |
| agent-dead | 超过最大重试 | error | orchestrator handleSessionError |
| websocket | WS 异常断开 | warning | useWebSocket onclose |
| budget | 预算超限 | warning | orchestrator dispatchTask |
| api | API 抛出异常 | error | api.ts catch handlers |
