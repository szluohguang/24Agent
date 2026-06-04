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
