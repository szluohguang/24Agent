## 1. StreamConsole — 消息结构重构

- [x] 1.1 定义 MessageChunk 类型和 ChunkType（thinking / tool_call / tool_result / text）
- [x] 1.2 将 session.stream 字符串数组解析为 MessageChunk 列表（根据 SSE 事件类型标记）
- [x] 1.3 支持 onTextDelta 时根据当前上下文追加到正确 Chunk

## 2. StreamConsole — 对话式 UI 渲染

- [x] 2.1 每条 AI 回复渲染为消息卡片：AI 头像图标 + 时间戳 + 内容
- [x] 2.2 思考过程可折叠，默认收起，点击展开
- [x] 2.3 工具调用卡片：工具名 + 参数 + 状态指示
- [x] 2.4 用户追问渲染为用户消息卡片

## 3. App — 继续提问完善

- [x] 3.1 继续提问输入框在选中有 sessionId 的任务时始终显示（包括 idle/completed 状态）
- [x] 3.2 追问发送到当前 ACP session，回复追加到对话流

## 4. 验证

- [x] 4.1 TypeScript typecheck 通过
- [x] 4.2 单元测试通过
- [x] 4.3 构建通过
