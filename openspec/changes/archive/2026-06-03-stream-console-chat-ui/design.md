---
archived-with: 2026-06-03-stream-console-chat-ui
status: final
status: final
---
## Context

当前 StreamConsole 按 session 逐行追加文本（`session.stream.join('')`），无结构区分。AI 回复中的思考过程、工具调用、最终结果全部混在一起。继续提问的输入框只在选中 running 任务时显示，追问后回复追加到 session.stream 末尾。

SSE 事件已能正确解析 v2 格式，区分了 `message.part.updated`（按 partType 分 text/tool/shell）和 `session.next.text.delta`。

## Goals / Non-Goals

**Goals:**
- 每条 AI 回复渲染为对话卡片：AI 头像 + 时间 + 内容
- 思考过程（reasoning）可折叠，默认收起
- 工具调用显示名称、参数、状态（执行中/成功/失败）
- 最终回复独立区块显示
- 继续提问输入框在选中含 session 的任务时始终显示
- 追问内容发送到当前 ACP session，回复追加到对话流

**Non-Goals:**
- 不修改服务端（ACP/session 管理不变）
- 不引入新的 UI 库（沿用 React 内联样式）
- 不做历史消息持久化（刷新后对话历史不保留）

## Decisions

1. **消息结构** — StreamConsole 内部将 session.stream 按 `MessageChunk` 类型分段：
   ```
   type ChunkType = 'thinking' | 'tool_call' | 'tool_result' | 'text'
   interface MessageChunk {
     type: ChunkType
     content: string
     toolName?: string
     status?: 'running' | 'done' | 'error'
   }
   ```
   每次 `onTextDelta` 不再简单 push，而是根据当前 ChunkType 追加或新建 Chunk。

2. **思考折叠** — 用 `useState` 追踪折叠状态，默认 `collapsed: true`，点击展开

3. **工具调用卡片** — 工具调用时新增一个 tool_call Chunk，显示工具名、参数缩略、状态颜色

4. **继续提问** — 当前逻辑已选中有 session 的任务时显示输入框（running 或 idle 均可）。追问通过 WebSocket `continue-prompt` 发送，服务端调用 `sendTaskPrompt`。无需修改。

5. **数据溯源** — 从 SSE 事件中区分：
   - `message.part.updated` with `partType === 'text'` → text chunk
   - `message.part.updated` with `partType === 'reasoning'` → thinking chunk  
   - `session.next.tool.called` → tool_call chunk
   - `session.next.shell.started/ended` → tool_call with status

## Risks / Trade-offs

- [低] stream 数组仍存原始字符串，MessageChunk 由 StreamConsole 自行解析。如需持久化需改 store 结构。
