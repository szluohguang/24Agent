---
comet_change: wechat-streaming-console
role: technical-design
canonical_spec: openspec
---

# WeChat 流式推送 — 技术设计

## 问题

当前 WeChat 集成仅在任务完成时发送最终结果。用户在微信中发起任务后长时间无反馈，无法观察 Agent 的思考过程和工具调用。

## 架构

```
Orchestrator.onChunk (来自 SSE 事件流)
  │  consoleToWechat && stream_level !== 'off'
  ▼
WeChatManager.streamToUser(sessionId, chunk)
  │
  ▼  按 sessionId 路由
WeChatStreamSession (per-session)
  ├── buffer: string[]
  ├── throttleTimer: 300ms
  ├── sendQueue: Promise<void> chain
  └── typingInterval: NodeJS.Timeout
```

## WeChatStreamSession 内部设计

### 状态

```typescript
interface WeChatStreamSession {
  sessionId: string
  userId: string
  buffer: { type: string; content: string }[]
  throttleTimer: ReturnType<typeof setTimeout> | null
  sendQueue: Promise<void>  // 串行链
  typingInterval: ReturnType<typeof setTimeout> | null
  lastSend: number
  lastTyping: number
}
```

### 方法

| 方法 | 触发 | 行为 |
|------|------|------|
| `push(chunk)` | 每个 onChunk | 追加到 buffer，重置 throttle 定时器 |
| `flush()` | throttle 到点 / session 结束 | 按 stream_level 过滤 buffer，构建消息文本，串行发送 |
| `startTyping()` | 首次 push | 启动 10s 间隔的 sendTyping |
| `stopTyping()` | session 结束 | 清除 typingInterval |
| `destroy()` | session 结束 | 清理所有定时器和引用 |

### 推送级别过滤规则

| stream_level | 推送的 chunk 类型 |
|-------------|-------------------|
| `thinking`  | `thinking` (摘要前 200 字) + `tool_call` (名称) |
| `full`      | `thinking` + `tool_call` + `tool_result` (前 200 字) + `text` (节流合并) |
| `off`       | 不推送，仅在 session 完成时发最终结果 |

### 节流策略

- 300ms 节流窗口：窗口内所有 chunk 合并为一条消息
- 同一类型连续 chunk 累积最多 3 秒（防止 buffer 无限增长）
- 超长消息分段：复用现有 `splitText(text, 2000)`

## 变更点

### WeChatManager

```typescript
class WeChatManager {
  private sessions: Map<string, WeChatStreamSession>

  async streamToUser(sessionId: string, userId: string, chunk: { type: string; content: string; toolName?: string }): Promise<void>
  async finalizeStream(sessionId: string, finalText: string): Promise<void>
}
```

### Orchestrator (core.ts)

在 `createEventHandlers` 的 `onChunk` 回调中增加 WeChat 路由：

```typescript
onChunk: (sessionId, chunk) => {
  // 现有: 广播到 WebSocket
  this.callbacks.onChunk?.(sessionId, chunk)

  // 新增: 路由到 WeChat
  if (this.wechatManager.isLoggedIn() && this.wechatManager.getConfig().consoleToWechat) {
    const level = this.store.getConfig('wechat_stream_level') || 'thinking'
    if (level !== 'off') {
      const userId = this.wechatManager.getFirstContactUserId() || this.wechatManager.getLoginInfo()!.userId
      this.wechatManager.streamToUser(sessionId, userId, chunk)
    }
  }
}
```

### SlashHandler

```typescript
'/stream': {
  handler: async (args: string, source: string) => {
    // /stream → 显示当前级别
    // /stream off|thinking|full → 设置并持久化
  }
}
```

## 测试策略

1. **Unit**: WeChatStreamSession 的 push/flush/节流逻辑（mock sendMessage）
2. **Unit**: SlashHandler /stream 命令解析
3. **Integration**: onChunk 路由到 WeChatManager（mock WeChatManager）

## 边界条件

- 用户在执行中通过 `/stream` 切换级别 → 当前 buffer 按新级别过滤后 flush
- 用户断开 WeChat 连接 → 进程正常结束，不会残留定时器
- 多个 session 同时运行 → 各自独立 StreamSession，互不干扰
- WeChat API 限频 → 串行发送队列天然限速
