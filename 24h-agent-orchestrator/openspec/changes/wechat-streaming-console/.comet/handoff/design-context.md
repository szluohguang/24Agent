# Comet Design Handoff

- Change: wechat-streaming-console
- Phase: design
- Mode: compact
- Context hash: d259f97cff5effaadefc5e248e06f7df99ab52578dc794f67ae7202d9251b7d5

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/wechat-streaming-console/proposal.md

- Source: openspec/changes/wechat-streaming-console/proposal.md
- Lines: 1-36
- SHA256: 75baec6359f4c374bd691e5aeac5bbf65c465491372277a4e3c9af063c05db2d

```md
## Why

当前系统通过 WeChat 发送任务结果仅在任务完成时触发，用户无法实时了解任务执行进度和思考过程。这导致：
- 用户在微信中发起任务后需要等待较长时间（数分钟）无反馈
- 无法观察 Agent 的思考过程和工具调用，降低了对系统行为的透明度和信任感
- 无法从微信端动态控制推送粒度

通过在任务执行过程中流式推送思考过程、工具调用和中间结果到微信，用户可以实时掌握任务进展，提升交互体验。

## What Changes

- 新增 `wechat_stream_level` 配置项（`off` / `thinking` / `full`），控制推送粒度
- 任务执行过程中按事件驱动（thinking 块、tool_call、tool_result、text delta）增量推送到微信
- 每 session 独立缓冲，支持节流合并避免消息轰炸
- 新增微信斜杠命令 `/stream <off|thinking|full>`，允许用户从微信端动态调节推送级别
- `consoleToWechat` 开关作为主开关，`stream_level` 在其之上控制精细化程度
- 保留现有任务完成时发送最终结果的逻辑

## Capabilities

### New Capabilities
- `wechat-streaming`: WeChat 流式推送能力，包括事件采集、增量发送、节流控制
- `wechat-slash-stream`: 微信斜杠命令 `/stream`，支持动态调节推送级别

### Modified Capabilities
- `wechat-integration`: 现有的 WeChat 集成配置项扩展，新增 `wechat_stream_level`

## Impact

- `src/wechat/manager.ts` — 新增流式推送方法和缓冲区管理
- `src/orchestrator/core.ts` — onChunk 事件路由到 WeChat
- `src/slash/index.ts` — 新增 `/stream` 子命令处理
- `src/server/api.ts` — WeChat 配置 API 扩展字段
- `src/orchestrator/store.ts` — 持久化新的配置字段
- `src/webui/.../WeChatSettings.tsx` — 流式级别 UI 选择器
- `src/webui/.../i18n/*.json` — 新增中文字符串
```

## openspec/changes/wechat-streaming-console/design.md

- Source: openspec/changes/wechat-streaming-console/design.md
- Lines: 1-63
- SHA256: e82e11bbe98f5f1f7b4fdd9635e1c5effb6d761bc3d941b7c088e618d2a490f5

```md
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
```

## openspec/changes/wechat-streaming-console/tasks.md

- Source: openspec/changes/wechat-streaming-console/tasks.md
- Lines: 1-25
- SHA256: 9f0b6bd6c9825f22c86a91118edf5c10a091ca6ccd1ec0a935647cfbc40a9736

```md
## 1. WeChatManager — 流式推送能力

- [ ] 1.1 在 WeChatManager 中新增 WeChatStreamSession 内部类（缓冲区、节流定时器、发送队列）
- [ ] 1.2 实现 streamToUser() 方法：接收 chunk，按 sessionId 路由到对应 StreamSession
- [ ] 1.3 实现 flushToWeChat()：合并缓冲区内容，串行化发送到 WeChat
- [ ] 1.4 流式推送期间周期性调用 sendTyping 保持"正在输入"状态
- [ ] 1.5 任务结束时 flush 剩余缓冲区并发送最终结果

## 2. Orchestrator — 事件路由到 WeChat

- [ ] 2.1 onChunk 回调中判断 consoleToWechat 状态，路由 chunk 到 WeChatManager.streamToUser()
- [ ] 2.2 onTextDelta 回调中判断 stream_level=full 时路由 text delta
- [ ] 2.3 加载/持久化 wechat_stream_level 配置项

## 3. SlashHandler — /stream 命令

- [ ] 3.1 在 SlashHandler 中注册 /stream 子命令处理器
- [ ] 3.2 实现参数解析（off / thinking / full）和配置更新
- [ ] 3.3 返回值：确认/帮助消息

## 4. 前端 — WeChat 设置页扩展

- [ ] 4.1 WeChatSettings.tsx 添加流式级别选择器（RadioGroup: off / thinking / full）
- [ ] 4.2 API 扩展：WeChat 配置 GET/PUT 增加 stream_level 字段
- [ ] 4.3 中英文 i18n 字符串更新
```

## openspec/changes/wechat-streaming-console/specs/wechat-slash-stream/spec.md

- Source: openspec/changes/wechat-streaming-console/specs/wechat-slash-stream/spec.md
- Lines: 1-35
- SHA256: f58dd2beb04195269f0c70183e4f8ed238f546f33df740f32a6761f1382d93af

```md
## ADDED Requirements

### Requirement: Slash command /stream to control streaming level
The system SHALL support a `/stream` slash command from WeChat to dynamically change the streaming push level.

#### Scenario: Set streaming to thinking level
- **WHEN** a WeChat user sends `/stream thinking`
- **THEN** the system SHALL set `wechat_stream_level` to `thinking`
- **AND** persist the setting to SQLite
- **AND** reply with confirmation message: "✅ 流式推送级别已设为：思考过程"

#### Scenario: Set streaming to full level
- **WHEN** a WeChat user sends `/stream full`
- **THEN** the system SHALL set `wechat_stream_level` to `full`
- **AND** reply with confirmation message: "✅ 流式推送级别已设为：全部步骤"

#### Scenario: Turn off streaming
- **WHEN** a WeChat user sends `/stream off`
- **THEN** the system SHALL set `wechat_stream_level` to `off`
- **AND** reply with confirmation message: "✅ 流式推送已关闭，仅在任务完成时发送结果"

#### Scenario: Check current streaming level
- **WHEN** a WeChat user sends `/stream`
- **THEN** the system SHALL reply with the current `wechat_stream_level` value

#### Scenario: Invalid parameter
- **WHEN** a WeChat user sends `/stream invalid_value`
- **THEN** the system SHALL reply with usage help: "用法：/stream <off|thinking|full>"

### Requirement: Stream level persisted across restarts
The `wechat_stream_level` MUST be persisted to SQLite config and restored on startup.

#### Scenario: Config survives restart
- **WHEN** the orchestrator restarts
- **THEN** the previously set `wechat_stream_level` value SHALL be restored from SQLite
```

## openspec/changes/wechat-streaming-console/specs/wechat-streaming/spec.md

- Source: openspec/changes/wechat-streaming-console/specs/wechat-streaming/spec.md
- Lines: 1-50
- SHA256: 0053a2460af6ed5e9231c101b1439baa9fc6886c3210e1364574255cb1eebb44

```md
## ADDED Requirements

### Requirement: Real-time streaming to WeChat during task execution
The system SHALL push task execution events to WeChat in real-time when `wechat_stream_level` is not `off` and `consoleToWechat` is enabled.

#### Scenario: Thinking chunk pushed at thinking level
- **WHEN** an SSE event with type `message.part.updated` and part type `reasoning` arrives for an active session
- **AND** the user's WeChat config has `wechat_stream_level` set to `thinking` or `full`
- **THEN** the system SHALL send an incremental thinking update to the user's WeChat within 500ms

#### Scenario: Tool call notification at thinking level
- **WHEN** an SSE event `session.next.tool.called` arrives
- **AND** `wechat_stream_level` is `thinking` or `full`
- **THEN** the system SHALL send a tool call notification to WeChat with tool name and key input

#### Scenario: Text delta push at full level
- **WHEN** a `session.next.text.delta` event arrives
- **AND** `wechat_stream_level` is `full`
- **THEN** the system SHALL accumulate the delta and flush to WeChat via throttled (300ms) merge

#### Scenario: Tool result summary at full level
- **WHEN** a tool result is received
- **AND** `wechat_stream_level` is `full`
- **THEN** the system SHALL send a summary of the tool result (first 200 chars) to WeChat

### Requirement: Throttled merge buffering per session
The system SHALL maintain a per-session message buffer with throttled flush to prevent message overload.

#### Scenario: Multiple deltas merged into one message
- **WHEN** multiple text deltas arrive within 300ms for the same session
- **THEN** they SHALL be merged into a single WeChat message

#### Scenario: Serialized send order per session
- **WHEN** multiple messages are queued for the same session
- **THEN** they SHALL be sent serially (one after the other completes), preserving order

### Requirement: SendTyping indicator during streaming
The system SHALL periodically call `sendTyping` to show "typing" indicator while streaming is active.

#### Scenario: Typing indicator active during task
- **WHEN** a session is actively streaming chunks to WeChat
- **THEN** the system SHALL call `sendTyping` API at least every 10 seconds during activity

### Requirement: Final result still sent on completion
When a task completes, the system SHALL still send the final comprehensive result regardless of stream level.

#### Scenario: Full result on session complete
- **WHEN** a session completes and `consoleToWechat` is enabled
- **THEN** the system SHALL flush remaining buffer
- **AND** send the final task completion message with summary, cost, and artifacts
```

