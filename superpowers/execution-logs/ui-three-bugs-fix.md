# UI 三栏布局 Bug + 流式控制台 + 任务点选继续提问 — 执行日志

## 2026-05-25

### Bug 根因分析
1. **布局**：外层容器未设 `width:100%`，右面板未右对齐
2. **流式控制台无输出**：`stream-delta` 处理函数在 session 不存在时直接 `return prev` 丢弃消息；`applyState` 整体替换 `sessions` 导致竞态丢数据
3. **无任务点选**：TreeView 无 `onClick` 交互，`activeSessionId` 未与选中任务联动；无继续提问功能

### 修复实施
- **App.tsx**: 外包容器 `width:100%`；`stream-delta` 处理改为不存在时自动创建条目；`applyState` 合并而非替换 `sessions`；新增 `selectedTaskId` + `handleSelectTask` 点选逻辑 + 继续提问输入框
- **TreeView.tsx**: 新增 `selectedTaskId`/`onSelect` props，任务项可点击高亮
- **core.ts**: 新增 `continuePrompt()` 方法
- **websocket.ts**: 新增 `continue-prompt` WS 消息处理
- **i18n**: 新增 `placeholder.followUp`、`button.continuePrompt`

### 验证
- `tsc --noEmit` → ✓
- `npm run test` → 180/180 ✓ (20 files)
- `npm run test:e2e` → 27/27 ✓
