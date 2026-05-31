## Context

当前 TreeView 组件使用 React 内联样式，任务列表项和删除按钮均无鼠标悬停视觉反馈。删除操作通过 WebSocket 发送 `delete-task` 消息，服务端处理后通过 `onStateChange` 广播全量状态更新，但客户端仅对 `state-update` 和 `connected` 消息做全量同步，缺少对 `task-deleted` 消息的处理，导致删除后 UI 不会立即移除该任务节点。

当前删除按钮只出现在 completed/failed/rejected/awaiting_review 状态的任务上，需要改为所有任务都有删除按钮。

## Goals / Non-Goals

**Goals:**
- 所有任务都有删除按钮，置于最右侧，右对齐
- 任务列表项鼠标悬停时仅边框变亮（不改变底色），与选中状态区分
- 所有操作按钮（分发/中止/删除）悬停时都有高亮效果
- 删除成功后客户端立即移除该任务节点

**Non-Goals:**
- 不修改服务端逻辑
- 不改变按钮功能逻辑

## Decisions

1. **悬停方案：React useState + onMouseEnter/onMouseLeave** — 沿用内联样式体系。统一使用 `hoveredTaskId` 追踪悬停任务，按钮再独立控制。

2. **删除按钮全面开放** — 所有任务（无论状态）都显示删除按钮，按钮放在操作栏最右侧，`marginLeft: auto` 右对齐。

3. **悬停视觉区分**：
   - 任务项悬停：仅 `border-color: #58a6ff`，`background` 不变（与选中状态 `#1f2937` 背景 + `#58a6ff` 边框区分）
   - 选中状态：`background: #1f2937` + `border: #58a6ff`
   - 按钮悬停：所有按钮仅边框高亮（`border-color` 变色），不改变背景和文字颜色
     - Dispatch 按钮悬停：边框 `#3fb950`
     - Abort 按钮悬停：边框 `#f85149`
     - Delete 按钮悬停：边框 `#da3633`

4. **删除刷新方案：客户端直接 filter 移除** — 在 App.tsx 新增 `task-deleted` 分支，收到后立即 setTasks 过滤移除。

## Risks / Trade-offs

- [低] 所有任务显示删除按钮，可能误删。但删除操作在 pending/running 状态下会被服务端拒绝，客户端需处理 400 响应。
