## 1. TreeView — 删除按钮全面开放 + 右对齐

- [x] 1.1 删除按钮改为所有任务状态都显示（移除 status 条件判断）
- [x] 1.2 删除按钮移至操作栏最右侧（`marginLeft: 'auto'` / flex 右对齐）

## 2. TreeView — 悬停交互效果

- [x] 2.1 任务列表项：添加 hoveredTaskId 状态，悬停时仅边框变亮 `#58a6ff`，背景不改变
- [x] 2.2 按钮悬停：Dispatch/Abort/Delete 各按钮 onMouseEnter/onMouseLeave，仅边框高亮（不改变背景/文字色）
  - Dispatch: 边框 `#3fb950` / Abort: 边框 `#f85149` / Delete: 边框 `#da3633`
- [x] 2.3 选中状态保持原有样式（背景 `#1f2937` + 边框 `#58a6ff`），与悬停区分

## 3. 运行中任务删除确认弹窗

- [x] 3.1 点击运行中任务的删除按钮时，弹出确认弹窗 "该任务正在执行中，确认停止并删除？"
- [x] 3.2 确认后先 abort 该任务，再删除
- [x] 3.3 取消则关闭弹窗，不做任何操作

## 4. App — 删除后自动刷新

- [x] 4.1 新增 task-deleted 消息处理：收到后 setTasks 过滤移除
- [x] 4.2 若被删任务正被选中，清除 selectedTaskId

## 5. 验证

- [x] 5.1 TypeScript typecheck 通过
- [x] 5.2 单元测试全部通过
