# Task Tree 任务树组件集成

## ADDED Requirements

### Requirement: 集成 TreeView 组件到 App.tsx

WHEN `App.tsx` 渲染任务列表
THEN 使用现有 `TreeView` 组件替换内联的任务列表 `<ul>` / `<div>` 实现
THEN `TreeView` 接收任务数据数组作为 `items` prop
THEN 每个任务节点渲染任务名称、状态、创建时间

#### Scenario: 基本集成

WHEN 应用挂载，任务数据通过 API 加载完成
THEN `App.tsx` 将任务数组传入 `<TreeView items={tasks} />`
THEN 树形结构默认展开第一层节点
THEN 子任务通过 `children` 字段递归渲染为树节点

#### Scenario: 空状态

WHEN 任务数组为空
THEN `TreeView` 显示占位文案 "No tasks yet"
THEN 不渲染任何树节点

#### Scenario: 数据更新

WHEN 任务数据通过 WebSocket 推送更新
THEN `App.tsx` 更新传递给 `TreeView` 的 `items` prop
THEN `TreeView` 增量更新 DOM，而非重建整棵树

### Requirement: 新增任务状态

WHEN 任务状态为 `scheduled`
THEN 节点显示 🕐 图标，颜色使用 `#8B5CF6`（紫色）
WHEN 任务状态为 `queued`
THEN 节点显示 ⏳ 图标，颜色使用 `#F59E0B`（琥珀色）
WHEN 任务状态为 `retrying`
THEN 节点显示 🔄 图标，颜色使用 `#EF4444`（红色），并显示重试次数徽章

#### Scenario: 状态图标映射

WHEN `TreeView` 渲染任务节点
THEN 根据 `task.status` 匹配图标与颜色
THEN 状态映射表如下：

| 状态 | 图标 | 颜色 |
|---|---|---|
| `pending` | ⏸ | `#6B7280` |
| `running` | ▶ | `#3B82F6` |
| `completed` | ✅ | `#10B981` |
| `failed` | ❌ | `#EF4444` |
| `scheduled` | 🕐 | `#8B5CF6` |
| `queued` | ⏳ | `#F59E0B` |
| `retrying` | 🔄 | `#EF4444` |

#### Scenario: 未知状态兜底

WHEN `task.status` 不在上述映射表中
THEN 节点显示 ❓ 图标，颜色使用 `#9CA3AF`（灰色）
THEN 控制台输出警告 `[TreeView] Unknown task status: ${status}`

### Requirement: 重试次数徽章

WHEN 任务状态为 `retrying`
THEN 节点右侧显示圆形徽章
THEN 徽章内容为 `task.retryCount` 数值（如 `3`）
THEN 徽章背景色为 `#EF4444`，文字白色，字号 12px

#### Scenario: 徽章渲染

WHEN `task.status === 'retrying'` 且 `task.retryCount >= 1`
THEN 节点在状态图标右侧渲染 `<span class="retry-badge">{retryCount}</span>`
WHEN `task.retryCount` 为 `undefined` 或 `0`
THEN 不渲染重试徽章

### Requirement: 依赖线

WHEN 任务存在 `dependsOn` 字段（字符串数组，指向其他任务 ID）
THEN `TreeView` 在树中绘制连接线，从依赖任务指向当前任务
THEN 连接线使用虚线样式，颜色 `#D1D5DB`，宽度 2px

#### Scenario: 单一依赖

WHEN 任务 B 的 `dependsOn: ['task-a']`
THEN 在任务 A 节点底部和任务 B 节点顶部之间绘制一条垂直虚线
THEN 任务 B 节点缩进显示，表示层级关系

#### Scenario: 多依赖

WHEN 任务 C 的 `dependsOn: ['task-a', 'task-b']`
THEN 从任务 A 和任务 B 分别绘制连接线汇聚至任务 C
THEN 连接线在任务 C 上方合并为一条垂直线接入节点

#### Scenario: 跨层级依赖

WHEN 依赖任务不在当前树的直接祖先路径中
THEN 连接线从依赖任务节点的右侧引出，沿树边缘延伸至当前任务节点左侧
THEN 鼠标悬停在依赖线上时提示 "Depends on: {依赖任务名称}"

### Requirement: 任务计数摘要

WHEN 树上方显示摘要栏
THEN 显示待处理、运行中、已完成、失败、已调度任务的数量
THEN 格式为 `Pending: 3  Running: 2  Completed: 15  Failed: 1  Scheduled: 4`
THEN 每个状态数字使用对应状态的颜色

#### Scenario: 摘要计算

WHEN 任务数据更新
THEN 摘要栏遍历全部任务（含嵌套子任务）统计各状态数量
WHEN 所有状态数量均为 0
THEN 摘要栏显示 "No tasks" 而非全零列表

#### Scenario: 点击筛选

WHEN 用户点击摘要栏中的某个状态标签（如 "Failed: 1"）
THEN `TreeView` 展开所有包含该状态的任务节点
THEN 其他节点折叠
THEN 再次点击同一标签恢复全部展开
