## 1. 思考卡片 — 流式展开 + 完成后折叠

- [x] 1.1 ChunkCard 中 thinking 类型初始 collapsed=false（展开）
- [x] 1.2 当后续非 thinking chunk 到达时自动折叠
- [x] 1.3 用户手动点击可随时切换折叠状态

## 2. 用户追问卡片 — 浅橙背景 + 右对齐

- [x] 2.1 用户消息卡片背景改为 `#2d1f00`，边框 `#664d00`
- [x] 2.2 用户消息卡片内容右对齐

## 3. AI 回复去重

- [x] 3.1 App.tsx 记录最后一条用户追问文本（lastUserPrompt state）
- [x] 3.2 StreamConsole 收到 text chunk 时，若以 lastUserPrompt 开头则裁剪该前缀

## 4. 验证

- [x] 4.1 TypeScript typecheck 通过
- [x] 4.2 单元测试通过
- [x] 4.3 构建通过
