## Why

当前任务列表所有任务混在一起显示，已完成/失败的任务与正在进行的任务没有视觉区分。用户需要快速聚焦正在运行的任务，同时能方便回顾已结束的任务。

## What Changes

1. **任务列表分两部分** — 上方显示进行中的任务，下方显示已结束的任务
2. **可拖动分割线** — 中间用分割线分隔，支持鼠标拖拽调整上下区域大小
3. **依赖树可折叠** — 有子任务的任务默认收起，点击可展开查看子任务
4. **控制台占位提示** — 未选中任务时显示"请选择任务"，选中后显示该任务的 session 信息

## Capabilities

### New Capabilities
- `task-list-split`: 任务列表按状态分区显示，可拖拽分割线调整大小
- `task-tree-collapse`: 依赖任务树可折叠展开

### Modified Capabilities
- `webui-basics`: 控制台空状态提示改为"请选择任务"

## Impact

- `src/webui/src/components/TreeView.tsx`: 分区渲染 + 拖拽分割线 + 依赖树折叠
- `src/webui/src/components/StreamConsole.tsx`: 空状态提示修改
- `src/webui/src/App.tsx`: 传递选中任务信息到控制台
