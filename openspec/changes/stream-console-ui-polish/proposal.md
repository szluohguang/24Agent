## Why

思考过程卡片在流式输出时默认折叠，用户看不到 AI 正在思考的内容，体验差。用户追问卡片与 AI 回复视觉区分不够明显（仅颜色不同），且追问内容左对齐不符合对话习惯。追问后 AI 回复中重复了用户的提问内容，浪费显示空间。

## What Changes

1. **思考过程自动展开** — 流式输出过程中思考卡片自动展开，思考结束时才折叠
2. **用户追问卡片** — 浅橙色背景，内容右对齐，与 AI 回复明确区分
3. **过滤追问重复** — AI 回复中如果以用户追问开头，则裁剪掉该前缀

## Capabilities

### New Capabilities
- `conversation-ui-polish`: 对话 UI 体验优化（思考自动展开、追问样式、回复去重）

### Modified Capabilities
- (none)

## Impact

- `src/webui/src/components/StreamConsole.tsx`: 修改 ChunkCard 思考和用户卡片的渲染逻辑；添加回复去重处理
