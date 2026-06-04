---
comet_change: task-tree-rework
role: technical-design
canonical_spec: openspec
---

## 修改点

### 1. 空列表 (TreeView.tsx)
`tasks.length === 0` 时显示空状态提示，不渲染任何阶段/根节点容器。

### 2. 任务独立成根 (TreeView.tsx)
- 按 `dependsOn.length === 0` 筛选根任务
- 每个根任务作为一个独立卡片展示，标题=任务描述
- 子任务（有 dependsOn 指向根任务）缩进在根下方
- 根任务可折叠/展开子任务

### 3. 动态子任务创建 (core.ts addTask)
新任务创建时，读取 `comet-orchestration.json` 的 phases 列表，按序为每个 phase 创建子任务：
```
根任务 (描述="xxx", cometPhase=null)
├── 子任务1 (描述="[open] xxx", cometPhase=open, dependsOn=[根])
├── 子任务2 (描述="[design] xxx", cometPhase=design, dependsOn=[子1])
├── 子任务3 (描述="[build] xxx", cometPhase=build, dependsOn=[子2])
├── 子任务4 (描述="[verify] xxx", cometPhase=verify, dependsOn=[子3])
└── 子任务5 (描述="[archive] xxx", cometPhase=archive, dependsOn=[子4])
```
