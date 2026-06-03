---
archived-with: 2026-06-03-stream-console-ui-polish
status: final
status: final
---
## Context

当前 StreamConsole 的 ChunkCard 中，thinking 卡片默认 collapsed（折叠），用户看不到流式思考过程。用户消息卡片使用 `#1e293b` 背景（深蓝灰），与 AI 回复的 `#161b22` 区别不够明显，且内容左对齐。

AI 通过 `sendTaskPrompt` 发送 prompt 后，回复中有时会重复 prompt 内容作为上下文，需要裁剪。

## Goals / Non-Goals

**Goals:**
- 思考卡片在流式输出过程中展开，结束后自动折叠
- 用户追问卡片：浅橙背景 `#2d1f00`、橙色边框 `#664d00`、内容右对齐
- AI 回复中裁剪以用户追问为前缀的重复内容

**Non-Goals:**
- 不修改服务端逻辑（裁剪在客户端完成）
- 不改其他卡片样式

## Decisions

1. **思考展开时机** — ChunkCard 内部 state `collapsed` 初始设为 `false`（展开）。当有新 chunk 追加时保持展开。当 session.idle 事件触发或非 thinking 类型 chunk 到达时，自动折叠。通过判断下一个 chunk 的类型来决定。

2. **追问样式** — ChunkCard 的 user 类型分支修改样式即可。

3. **重复裁剪** — App.tsx 的 `handleFollowUpSubmit` 中记录最后一次追问文本。StreamConsole 接收到 text chunk 时，检查是否以追问文本开头，如果是则裁剪。通过 `lastUserPrompt` 状态或 props 传递。

## Risks / Trade-offs

- [低] 裁剪逻辑可能误删 AI 正常回复中恰好以用户问题开头的内容。通过仅匹配 `startsWith` 且裁剪后内容非空来降低风险。
