## Why

当前流式控制台只是简单的逐行文本追加，无法区分 AI 思考过程、工具调用和最终回复，用户体验差。继续提问输入框在选中任务时显示，但追问后回复混在一起没有对话层次感。

## What Changes

1. **对话式 UI** — 流式控制台改为类似 ChatGPT 的垂直对话结构：每条 AI 回复独立渲染，思考/工具调用/最终回复用不同样式区分
2. **思考过程折叠** — AI 的思考/reasoning 内容可折叠展开，默认折叠
3. **工具调用可视化** — 工具调用显示工具名称、参数、耗时、状态（执行中/成功/失败）
4. **继续提问完善** — 选中有 session 的任务时在底部显示输入框，追问内容通过 ACP 发送到当前 session，回复追加到同一对话线程

## Capabilities

### New Capabilities
- `chat-conversation-ui`: 流式控制台的对话式渲染，包含消息气泡、思考折叠、工具调用卡片

### Modified Capabilities
- `webui-basics`: 继续提问输入框始终在选中有 session 的任务时可见，追问回复追加到当前对话流
- `backend-unit-tests`: 新增 StreamConsole 组件测试覆盖对话渲染

## Impact

- `src/webui/src/components/StreamConsole.tsx` 重写为对话式渲染
- `src/webui/src/App.tsx` 调整继续提问逻辑
- 新增 i18n 键值
