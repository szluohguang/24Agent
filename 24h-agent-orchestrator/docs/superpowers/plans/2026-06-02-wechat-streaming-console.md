---
archived-with: 2026-06-02-wechat-streaming-console
status: final
---
# WeChat 流式推送控制台 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 任务执行过程中按事件驱动流式推送思考过程和结果到微信，并支持 `/stream` 斜杠命令动态调节推送级别

**Architecture:** 在 WeChatManager 内新增 WeChatStreamSession per-session 流式缓冲区，300ms 节流合并，串行发送队列保证顺序。Orchestrator onChunk 回调路由到 WeChat。SlashHandler 新增 `/stream` 子命令。

**Tech Stack:** TypeScript, Node.js, WeChat ilink bot API, Fastify

---
change: wechat-streaming-console
design-doc: docs/superpowers/specs/2026-06-02-wechat-streaming-console-design.md
base-ref: 571e947fc517ffcd41fc89959ee67292f127c927

---

### Task 1: WeChatManager — 新增流式推送能力

**Files:**
- Modify: `src/wechat/manager.ts`

- [ ] **Step 1.1: Add WeChatStreamSession interface and class**

在 `WeChatManager` 类前新增 `WeChatStreamSession` 接口和类：

```typescript
interface StreamChunk {
  type: string
  content: string
  toolName?: string
}

class WeChatStreamSession {
  private userId: string
  private buffer: StreamChunk[] = []
  private throttleTimer: ReturnType<typeof setTimeout> | null = null
  private sendChain: Promise<void> = Promise.resolve()
  private typingInterval: ReturnType<typeof setTimeout> | null = null
  private lastTypeCounters: Map<string, number> = new Map()
  private opts: { baseUrl: string; token: string; contextToken?: string }
  private streamLevel: string
  private logFn: (msg: string) => void
  private destroyed = false

  constructor(userId: string, opts: { baseUrl: string; token: string; contextToken?: string }, streamLevel: string, logFn: (msg: string) => void) {
    this.userId = userId
    this.opts = opts
    this.streamLevel = streamLevel
    this.logFn = logFn
  }

  push(chunk: StreamChunk): void {
    if (this.destroyed) return
    this.buffer.push(chunk)
    this.startTyping()
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.throttleTimer) clearTimeout(this.throttleTimer)
    this.throttleTimer = setTimeout(() => this.flush(), 300)
  }

  private async flush(): Promise<void> {
    if (this.destroyed || this.buffer.length === 0) return
    const items = this.buffer.splice(0)
    const text = this.formatMessage(items)
    if (!text) return
    this.sendChain = this.sendChain.then(() => this.doSend(text))
    await this.sendChain
  }

  private formatMessage(items: StreamChunk[]): string {
    const lines: string[] = []
    for (const item of items) {
      switch (item.type) {
        case 'thinking':
          if (this.streamLevel === 'off') continue
          lines.push(`🧠 ${item.content.slice(0, 200)}`)
          break
        case 'tool_call':
          if (this.streamLevel === 'off') continue
          lines.push(`🔧 ${item.toolName || 'tool'}: ${item.content.slice(0, 100)}`)
          break
        case 'tool_result':
          if (this.streamLevel !== 'full') continue
          lines.push(`✅ ${item.content.slice(0, 200)}`)
          break
        case 'text':
          if (this.streamLevel !== 'full') continue
          lines.push(`📝 ${item.content}`)
          break
      }
    }
    return lines.join('\n')
  }

  private async doSend(text: string): Promise<void> {
    try {
      const { sendTextMessage } = await import('./send.js')
      const segments = splitText(text, 2000)
      for (const seg of segments) {
        await sendTextMessage(this.userId, seg, this.opts)
      }
    } catch (err) {
      this.logFn(`WeChat stream send error: ${String(err)}`)
    }
  }

  private startTyping(): void {
    if (this.typingInterval) return
    this.sendTypingOnce()
    this.typingInterval = setInterval(() => this.sendTypingOnce(), 10_000)
  }

  private async sendTypingOnce(): Promise<void> {
    try {
      const { sendTyping } = await import('./api.js')
      await sendTyping({
        baseUrl: this.opts.baseUrl,
        token: this.opts.token,
        body: {
          to_user_id: this.userId,
          context_token: this.opts.contextToken,
          typing: 1,
        },
      })
    } catch { /* ignore typing errors */ }
  }

  async finalize(): Promise<void> {
    this.destroyed = true
    if (this.throttleTimer) clearTimeout(this.throttleTimer)
    if (this.typingInterval) clearInterval(this.typingInterval)
    await this.flush()
  }
}
```

- [ ] **Step 1.2: Add stream session map and streamToUser/finalizeStream methods to WeChatManager**

在 `WeChatManager` 类中新增：

```typescript
private streamSessions: Map<string, WeChatStreamSession> = new Map()

async streamToUser(userId: string, sessionId: string, chunk: StreamChunk, streamLevel: string): Promise<void> {
  if (!this.loginInfo) return
  let session = this.streamSessions.get(sessionId)
  if (!session) {
    const contextToken = this.contextTokens.get(userId)
    session = new WeChatStreamSession(userId, {
      baseUrl: this.config.baseUrl,
      token: this.loginInfo.token,
      contextToken,
    }, streamLevel, this.logFn)
    this.streamSessions.set(sessionId, session)
  }
  session.push(chunk)
}

async finalizeStream(sessionId: string): Promise<void> {
  const session = this.streamSessions.get(sessionId)
  if (session) {
    await session.finalize()
    this.streamSessions.delete(sessionId)
  }
}
```

- [ ] **Step 1.3: Run typecheck to verify**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 1.4: Commit**

```bash
git add src/wechat/manager.ts
git commit -m "feat: 添加 WeChatStreamSession 流式推送能力"
```

---

### Task 2: Orchestrator — 事件路由到 WeChat

**Files:**
- Modify: `src/orchestrator/core.ts`
- Modify: `src/orchestrator/store.ts`

- [ ] **Step 2.1: Add WeChat streaming route in onChunk handler**

在 `core.ts` 的 `createEventHandlers` 方法中，在 `onChunk` 回调末尾追加 WeChat 路由：

```typescript
onChunk: (sessionId, chunk) => {
  if (this.callbacks.onChunk) {
    this.callbacks.onChunk(sessionId, chunk)
  }
  // WeChat 流式推送
  if (this.wechatManager.isLoggedIn() && this.wechatManager.getConfig().consoleToWechat) {
    const streamLevel = this.store.getConfig('wechat_stream_level') || 'thinking'
    if (streamLevel !== 'off') {
      const userId = this.wechatManager.getFirstContactUserId() || this.wechatManager.getLoginInfo()!.userId
      this.wechatManager.streamToUser(userId, sessionId, chunk, streamLevel)
    }
  }
},
```

- [ ] **Step 2.2: Finalize WeChat stream on session complete**

在 `handleSessionComplete` 中，在发送最终结果前调用 finalizeStream：

```typescript
// 在 if (this.wechatManager.isLoggedIn() ...) 块之前添加
await this.wechatManager.finalizeStream(sessionId)
```

- [ ] **Step 2.3: Persist wechat_stream_level config**

在 `src/orchestrator/store.ts` 中确认 `setConfig`/`getConfig` 支持任意 key（已有）。在 `core.ts` 中：

```typescript
// 在 loadWeChatConfig 中加载
const streamLevel = this.store.getConfig('wechat_stream_level')
if (streamLevel) config.consoleToWechat = true // 兼容旧版

// 在 updateWeChatConfig 中持久化
if (config.streamLevel !== undefined) this.store.setConfig('wechat_stream_level', config.streamLevel)
```

- [ ] **Step 2.4: Run typecheck to verify**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2.5: Commit**

```bash
git add src/orchestrator/core.ts src/orchestrator/store.ts
git commit -m "feat: onChunk 事件路由到 WeChat 流式推送"
```

---

### Task 3: SlashHandler — /stream 命令

**Files:**
- Modify: `src/slash/index.ts`

- [ ] **Step 3.1: Add /stream subcommand handler**

在 `SlashHandler` 中注册 `/stream` 命令处理：

```typescript
// 在 execute 方法中，在已有命令匹配后追加
if (normalized.startsWith('/stream')) {
  const parts = normalized.split(/\s+/)
  const arg = parts[1]?.toLowerCase()

  const orchestrator = this.orchestrator
  const currentLevel = orchestrator.getStore().getConfig('wechat_stream_level') || 'thinking'

  if (!arg) {
    const levelNames: Record<string, string> = { off: '关闭', thinking: '思考过程', full: '全部步骤' }
    return { handled: true, reply: `📊 当前流式推送级别：**${levelNames[currentLevel] || currentLevel}**\n用法：/stream <off|thinking|full>` }
  }

  if (!['off', 'thinking', 'full'].includes(arg)) {
    return { handled: true, reply: '❌ 无效参数。用法：/stream <off|thinking|full>' }
  }

  orchestrator.getStore().setConfig('wechat_stream_level', arg)
  orchestrator.getWeChatManager().updateConfig({ streamLevel: arg } as any)

  const levelNames: Record<string, string> = { off: '关闭，仅在任务完成时发送结果', thinking: '思考过程', full: '全部步骤' }
  return { handled: true, reply: `✅ 流式推送级别已设为：**${levelNames[arg]}**` }
}
```

- [ ] **Step 3.2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3.3: Commit**

```bash
git add src/slash/index.ts
git commit -m "feat: 添加 /stream 斜杠命令调节流式推送级别"
```

---

### Task 4: REST API 扩展 + 前端 WeChat 设置页

**Files:**
- Modify: `src/server/api.ts`
- Modify: `src/webui/src/components/WeChatSettings.tsx`
- Modify: `src/webui/src/i18n/en-US.json`
- Modify: `src/webui/src/i18n/zh-CN.json`

- [ ] **Step 4.1: Extend WeChat config API**

在 `src/server/api.ts` 中找到 WeChat 配置相关路由，在 GET/PUT 响应/请求中增加 `streamLevel` 字段：

```typescript
// GET /api/wechat/config 响应增加
streamLevel: this.store.getConfig('wechat_stream_level') || 'thinking'

// PUT /api/wechat/config 处理增加
if (body.streamLevel !== undefined) {
  this.store.setConfig('wechat_stream_level', body.streamLevel)
  wechatConfig.streamLevel = body.streamLevel
}
```

- [ ] **Step 4.2: Add stream level selector to WeChatSettings component**

在 `src/webui/src/components/WeChatSettings.tsx` 中添加流式级别选择器（RadioGroup）：

```tsx
// 在 consoleToWechat 复选框附近添加
<FormControl component="fieldset" sx={{ mt: 2 }}>
  <FormLabel component="legend">流式推送级别</FormLabel>
  <RadioGroup
    row
    value={config.streamLevel || 'thinking'}
    onChange={(e) => handleConfigChange('streamLevel', e.target.value)}
  >
    <FormControlLabel value="off" control={<Radio />} label="关闭" />
    <FormControlLabel value="thinking" control={<Radio />} label="思考过程" />
    <FormControlLabel value="full" control={<Radio />} label="全部步骤" />
  </RadioGroup>
  <FormHelperText>
    {config.streamLevel === 'off' && '仅在任务完成时发送结果'}
    {config.streamLevel === 'thinking' && '推送思考过程和工具调用'}
    {config.streamLevel === 'full' && '推送所有步骤的详细信息'}
  </FormHelperText>
</FormControl>
```

- [ ] **Step 4.3: Add i18n strings**

在 `en-US.json` 中添加：
```json
"wechatSettings.streamLevel": "Stream Level",
"wechatSettings.streamLevelOff": "Off",
"wechatSettings.streamLevelThinking": "Thinking",
"wechatSettings.streamLevelFull": "Full",
"wechatSettings.streamLevelOffDesc": "Only send final result",
"wechatSettings.streamLevelThinkingDesc": "Push thinking and tool calls",
"wechatSettings.streamLevelFullDesc": "Push all step details",
"slash.streamUsage": "Usage: /stream <off|thinking|full>",
"slash.streamSet": "Stream level set to: {level}"
```

在 `zh-CN.json` 中添加：
```json
"wechatSettings.streamLevel": "流式推送级别",
"wechatSettings.streamLevelOff": "关闭",
"wechatSettings.streamLevelThinking": "思考过程",
"wechatSettings.streamLevelFull": "全部步骤",
"wechatSettings.streamLevelOffDesc": "仅在任务完成时发送结果",
"wechatSettings.streamLevelThinkingDesc": "推送思考过程和工具调用",
"wechatSettings.streamLevelFullDesc": "推送所有步骤的详细信息",
"slash.streamUsage": "用法：/stream <off|thinking|full>",
"slash.streamSet": "流式推送级别已设为：{level}"
```

- [ ] **Step 4.4: Run typecheck + build**

Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: No errors

- [ ] **Step 4.5: Commit**

```bash
git add src/server/api.ts src/webui/src/components/WeChatSettings.tsx src/webui/src/i18n/en-US.json src/webui/src/i18n/zh-CN.json
git commit -m "feat: 前端 WeChat 设置页添加流式级别选择器"
```
