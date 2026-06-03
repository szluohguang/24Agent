## Context

目前 WeChat 集成仅在任务完成时通过 `WeChatManager.sendToUser()` 发送最终结果。SSE 事件流已通过 `event-stream.ts` 订阅并按 `onChunk` / `onTextDelta` 等回调路由，这些数据已广播到 WebSocket（WebUI），但未转发到 WeChat。

WeChat ilink bot API 约束：
- 不支持编辑已发消息
- 不支持真正的"流式"推送（不能像 WebSocket 在一个连接中增量传输）
- 支持 `sendTyping` 显示"正在输入"状态
- 单条消息最大长度约 2000 字符（已有 `splitText`）

## Goals / Non-Goals

**Goals:**
- 任务执行过程中按事件驱动推送到微信
- 支持三级推送粒度：`off` / `thinking` / `full`
- 微信端可通过斜杠命令 `/stream` 动态切换级别
- 与现有 WebUI 流式控制台保持一致的消息风格
- 每个 session 独立缓冲，节流合并避免消息轰炸

**Non-Goals:**
- 不支持 WeChat 消息编辑/撤回
- 不改变现有 WebUI 流式展示逻辑
- 不涉及 WeChat 以外的消息渠道

## Decisions

### 1. Streamer 架构：内嵌在 WeChatManager，不新增独立类

- **决策**：在 `WeChatManager` 中新增 `StreamSession` 内部管理类，为每个 session 维护缓冲区、节流定时器、累计状态
- **理由**：现有 `WeChatManager` 已持有登录态、sendToUser、配置等基础设施；新增 streamer 无需额外依赖注入
- **替代方案**：独立 `WeChatStreamer` 类 → 需要额外获取 token/config，复杂度相当

### 2. 推送策略：事件驱动 + 300ms 节流合并

- **决策**：Chunk 到达时追加到 session 缓冲区，设置 300ms 节流定时器，定时器触发时合并缓冲区内容发送
- **理由**：WeChat API 不支持单条消息持续追加；300ms 足够合并相邻的 thinking/text delta 片段，避免碎片化
- **消息格式**：`🧠 思考中...` / `🔧 工具调用` / `📝 输出` / `✅ 结果` — 与 WebUI StreamConsole 风格一致

### 3. 推送粒度分级

| 级别 | thinking 块 | tool_call | tool_result | text delta | 最终结果 |
|------|:-----------:|:---------:|:-----------:|:----------:|:--------:|
| `off` | ✗ | ✗ | ✗ | ✗ | ✓ (现有) |
| `thinking` | ✓ (摘要) | ✓ (摘要) | ✗ | ✗ | ✓ |
| `full` | ✓ (完整) | ✓ (完整) | ✓ (摘要) | ✓ (节流) | ✓ |

### 4. 微信斜杠命令 `/stream`

- 新增 `SlashHandler` 子命令 `stream`，格式：`/stream <off|thinking|full>`
- 解析后更新 `wechat_stream_level` 配置并持久化到 SQLite
- 支持 `wechat:userId` 来源（微信消息触发的 slash 命令）
- 支持 WebUI 来源的 REST API

### 5. 配置持久化

- `wechat_stream_level` 存储在 `store.setConfig()` / `store.getConfig()` 中
- 与现有 `wechat_baseUrl`、`wechat_consoleToWechat` 放在同一 SQLite config 表

## Risks / Trade-offs

- **[消息频率]** `full` 模式下高频 text delta 可能产生大量消息 → 300ms 节流 + 同类型累积合并后发送
- **[乱序]** WeChat API 异步发送不保证顺序 → 每个 session 串行化发送（前者完成才发后者）
- **[微信限制]** ilink bot API 可能对频繁发送有限频 → 当 2000 字符分段本身已有多段时不再额外增量推送
