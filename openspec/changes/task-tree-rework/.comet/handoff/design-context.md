# Comet Design Handoff

- Change: task-tree-rework
- Phase: design
- Mode: compact
- Context hash: ba3c8248e1ea72ec6687cb46c35a4d105f03976f909fd9044d2537c4e6c808f1

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/task-tree-rework/proposal.md

- Source: openspec/changes/task-tree-rework/proposal.md
- Lines: 1-10
- SHA256: b50ce8df381c96a4710ce1c2c7f91c191b4298db2a93070a11b04f84d7f8d469

```md
## Why

当前任务列表在无任务时仍显示 Comet 阶段容器（开启/设计/构建等），视觉效果冗余。每个新任务创建后不独立成根节点，而是混在同一个 change 下。任务创建后没有根据任务内容自动拆解为子任务流程。

## What Changes

1. **空列表状态** — 无任务时左侧面板显示空状态提示，不展示阶段容器
2. **任务独立成根** — 每个新创建的 Task 成为独立的根节点，节点名称 = 任务描述
3. **自动子任务创建** — 新任务创建后根据其描述内容自动拆解为 OpenSpec 流程子任务，对应不同的 `cometPhase`（proposal → design → build → verify），子任务挂在该根任务下
4. **阶段折叠/展开** — 每个根任务下的子任务按 cometPhase 分组展示，可折叠
```

## openspec/changes/task-tree-rework/design.md

- Source: openspec/changes/task-tree-rework/design.md
- Lines: 1-26
- SHA256: 23320c744bcb34bab00e18e32254873c7e600fc9a0d4b5f91cd1ca64aefb15cc

```md
## 方案

### 1. 空列表状态

TreeView 中 `tasks.length === 0` 时直接显示空状态，不渲染 Comet 阶段容器。

### 2. 任务独立成根

修改 TreeView 渲染逻辑：
- 移除 ChangeRootNode 包装层
- 每个 task 根据 `dependsOn` 判断是否为根任务（`dependsOn.length === 0` = 根）
- 根任务作为独立节点展示，标题 = 任务描述
- 子任务缩进在根任务下方

### 3. 自动子任务创建

创建任务时后端自动生成 4 个子任务：
```
根任务 (描述=用户输入, cometPhase='plan')
├── 子任务 (描述='设计: '+根描述, cometPhase='design')
├── 子任务 (描述='构建: '+根描述, cometPhase='build')
├── 子任务 (描述='验证: '+根描述, cometPhase='verify')
└── 子任务 (描述='归档: '+根描述, cometPhase='archive')
```

子任务通过 `dependsOn` 链接到根任务，树形结构清晰。
```

## openspec/changes/task-tree-rework/tasks.md

- Source: openspec/changes/task-tree-rework/tasks.md
- Lines: 1-4
- SHA256: 55ce3e875050443410716a34f8c13cb3a1d5c51690f0340aaefcb1fbb3974c74

```md
- [ ] 1. TreeView.tsx: 无任务时显示空状态，不渲染 Comet 阶段容器
- [ ] 2. TreeView.tsx: 每个根任务独立展示，标题 = 任务描述，子任务通过 dependsOn 缩进
- [ ] 3. orchestrator/core.ts: addTask 时根据描述自动创建 4 个子任务（设计/构建/验证/归档）
- [ ] 4. 验证：typecheck + 测试通过
```

