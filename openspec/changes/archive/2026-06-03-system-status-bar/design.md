## Context

当前没有统一的系统异常通知机制。仅有的 `healthStale` 标志通过右侧面板 dim 效果和文字提示反映健康检查失败。错误信息分散在 WebSocket 消息、health poll 和 agent-state 中，无聚合展示。

## Goals / Non-Goals

**Goals:**
- 底部固定状态栏，始终显示最新系统状态
- 日志分级显示：info（蓝）、warning（黄）、error（红）
- Error 消息不自动覆盖，必须用户点击查看见证后才允许新 error 覆盖
- 点击状态栏打开日志详情页，按时间倒序排列
- 日志详情页支持按类型过滤

**Non-Goals:**
- 不存储日志到磁盘（仅内存缓存，保留最近 500 条）
- 不实现日志导出功能
- 不修改现有 Logger 文件日志机制

## Decisions

### 1. 数据流

```
服务器端日志来源 → LogBuffer (环形缓存) 
  ├── 初始加载: GET /api/logs → 返回最近 500 条
  └── 实时推送: WebSocket { type: 'system-log', entry: SystemLogEntry }

前端 StatusBar 组件:
  ├── 从 logs[] 中取最新一条作为当前状态
  ├── 如果最新是 error 且用户未点击查看 → 固定显示，不覆盖
  └── 否则显示最新一条

前端 LogViewer 页面:
  ├── 完整 logs[] 按时间倒序
  ├── 类型筛选: all / info / warning / error
  └── 点击 error 条目 → 标记为已读，允许状态栏覆盖
```

### 2. 日志来源注入

后端在 `src/orchestrator/core.ts` 中收集异常事件并推送到 LogBuffer：

| 来源 | 触发条件 | log 类型 |
|------|---------|---------|
| health 检查失败 | 服务中断/端口不可达 | error |
| WebSocket 连接/重连 | 客户端异常断开 | warning |
| agent session error | 模型调用失败 | error |
| agent 重试 | 任务自动重试 | warning |
| agent hung | session 无响应 | error |
| agent dead | 超过最大重试数 | error |
| 预算超限 | budgetSpent >= budgetLimit | warning |
| API 调用错误 | 接口抛出异常 | error |
| 系统启动/停止 | orchestrator start/stop | info |

### 3. 前端组件结构

```
App.tsx (flex column, 100vh)
├── TopBar
├── PageContent (flex: 1)
└── StatusBar (height: 28px, flexShrink: 0)
```

StatusBar 固定在底部，不随页面切换而消失。

### 4. SystemLogEntry 类型

```typescript
interface SystemLogEntry {
  id: string
  time: number
  type: 'info' | 'warning' | 'error'
  message: string
  source: string  // 来源标识，如 'health', 'agent', 'websocket', 'budget', 'api'
  acknowledged?: boolean  // 用户是否已查看（仅 error 类型需要）
}
```

## Risks / Trade-offs

- **[内存占用]** 500 条日志约占用 ~100KB，可接受
- **[消息风暴]** 高频错误可能刷屏 → 同源同类型 500ms 内合并为一条
- **[error 不覆盖]** 用户可能长时间不查看导致状态栏固定显示旧 error → 设计预期行为，确保用户不会错过关键错误
