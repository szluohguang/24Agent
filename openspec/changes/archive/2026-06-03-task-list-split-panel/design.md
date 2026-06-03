---
archived-with: 2026-06-03-task-list-split-panel
status: final
status: final
---
## Context

当前 TreeView 组件将所有任务按创建顺序渲染在一个列表中。需要按状态分区并添加可拖拽分割线。

## Goals / Non-Goals

**Goals:**
- 进行中任务在上方，已结束任务在下方
- 可拖拽分割线调整上下区域大小
- 最小区域高度 60px
- 依赖任务树可折叠展开
- 控制台空状态提示

**Non-Goals:**
- 不修改服务端逻辑

## Decisions

1. **分区实现** — TreeView 内部按状态过滤，中间插入拖拽分割线组件。状态变化时任务自动在区间移动。

2. **拖拽实现** — 用 React useState 跟踪分割线位置（百分比），mousedown/mousemove/mouseup 事件。分割线窄条 4px，hover 时 grab 光标。

3. **依赖树折叠** — parentTask 的渲染中检查是否有子任务（通过 task.dependsOn 反向查找依赖当前任务的任务列表）。子任务默认隐藏，点击展开按钮后显示。使用 `expandedParents: Set<string>` 状态。

4. **控制台提示** — App.tsx 传递 `selectedTaskId` 给 StreamConsole。无选中时显示 "请选择任务"，选中时正常显示 session 内容。

5. **状态分类**：
   - 进行中: pending, running, awaiting_review, queued, retrying, scheduled
   - 已结束: completed, failed, rejected

## Risks / Trade-offs

- [低] 依赖树需要反向查找（谁依赖我），O(n) 遍历，任务数少时可接受。
