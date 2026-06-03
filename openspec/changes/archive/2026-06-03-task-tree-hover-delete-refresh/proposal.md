## Why

用户操作体验优化：任务列表和删除按钮缺少交互反馈（悬停高亮），删除后列表不会自动刷新，导致用户操作后需要手动刷新页面才能看到变化。

## What Changes

1. **任务列表项悬停高亮** — 鼠标移到任务列表项时，外框 border 和背景色高亮，移出后恢复
2. **删除按钮悬停高亮** — 鼠标移到删除按钮时，边框和文字变为红色表示可操作
3. **删除后自动刷新列表** — 点击删除后，WebUI 立即从任务列表中移除该任务，无需手动刷新

## Capabilities

### New Capabilities
- `task-tree-hover`: 任务树悬停交互，包括列表项和按钮的鼠标悬停视觉反馈

### Modified Capabilities
- `webui-basics`: 删除操作的响应行为变更——删除成功后客户端立即移除任务节点而非等待全量状态推送

## Impact

- `src/webui/src/components/TreeView.tsx`: 新增悬停状态管理和样式
- `src/webui/src/App.tsx`: 新增 task-deleted 消息处理
