# 左侧任务树交互设计 — Design Doc

## 概述

重构左侧任务树为三级层级结构，以 Comet Change 为根节点，按阶段动态组织任务，每级可折叠/展开，支持实时状态更新。

## 层级结构

```
[Comet Change Name]                    ← Level 1: 根节点
  │  phase: build · workflow: full
  │
  ├─ [开启阶段任务]                      ← Level 2: 按阶段分类
  │   ├─ ☐ 编写 proposal.md
  │   ├─ ☐ 编写 design.md
  │   └─ ☐ 定义 tasks.md
  │
  ├─ [深度设计阶段任务]    2/3 已完成
  │   ├─ ☑ 技术方案 brainstorm
  │   ├─ ☑ 编写 Design Doc
  │   └─ ☐ 定义 delta specs
  │
  ├─ [计划与构建阶段任务]  活跃 · 1/5
  │   ├─ ▼ T1: 实现功能 A             ← Level 3: tasks.md 任务
  │   │   ├─ ⊞ subagent-1 [healthy]   ← Level 4: opencode subagent
  │   │   └─ ⊞ subagent-2 [healthy]
  │   ├─ ▶ T2: 实现功能 B
  │   └─ ⟳ T3: 优化 (retry 2/5)
  │       └─ ⊞ subagent-3 [retrying]
  │
  ├─ [验证与收尾阶段任务]
  └─ [归档阶段任务]
```

## 设计要点

### 根节点
- 显示 Comet Change 名称
- 副标题显示当前 phase（open/design/build/verify/archive）和 workflow 类型（full/hotfix/tweak）
- 点击可折叠/展开整棵树

### 二级目录（阶段分类）
- 按 comet-orchestration.json 的五阶段顺序排列
- 每个阶段动态生成，仅包含该阶段对应的任务
- 已完成阶段标 ☑，活跃阶段高亮（蓝色边框+active标签），未开始阶段低透明度
- 右侧显示进度（如 2/3 已完成）
- 鼠标悬停显示阶段描述

### 三级目录（任务）
- 数据源为 tasks.md 中勾选的 task 条目
- 任务状态：☐ pending / ● running / ✓ completed / ✗ failed / ⟳ retrying
- 关联 sessionId 时自动显示下方 subagent 列表
- 支持 dispatch/abort/delete 按钮（延续现有功能）

### Subagent（四级）
- 以 ⊞ 前缀标识，显示 sessionId 前8位和健康状态
- 颜色标识：healthy 绿色 / retrying 橙色 / dead 红色

## 动态更新规则

| 触发条件 | 更新内容 |
|---------|---------|
| phase 变更 | 二级目录展开状态切换，新阶段高亮 |
| tasks.md 勾选 | 三级目录任务状态更新 |
| subagent 创建/销毁 | 四级目录 subagent 列表刷新 |
| change 归档 | 整棵树移入 archive 区域 |

## 数据流

```
CometOrchestrator ──comet-state-update──→ App (setCometState)
                         │
                    TreeView 接收:
                    • cometState (phase/workflow/进度)
                    • tasks (含 cometPhase 字段)
                    • agents (含 taskId 关联)
                         │
                    动态分组渲染:
                    phase → task → subagent
```

## 实现方案

### 前端改动（已有基础）
- `TreeView.tsx`: 重构为 4 级树渲染（Change → Phase → Task → Agent）
- `App.tsx`: 传递 cometState / tasks / agents
- `types.ts`: TaskNode 已含 cometPhase 字段

### 后续细化
- 点击根节点显示 change 详情（project-detail）
- 二级目录的拖拽分割线（活跃/已完成分离）
- 三级目录任务拖拽重排
- 过滤/搜索功能

## 非目标
- 不与右侧 StreamConsole 联动（保持独立）
- 不与 HealthDashboard 联动（保持独立）
- 不实现拖拽创建任务（仅通过底部输入框）
