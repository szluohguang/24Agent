# health-dashboard — 健康仪表板黑盒测试

## 概述

设置弹窗中的健康仪表板展示所有子 Agent 的运行状态、健康指标和心跳信息。

## 测试用例

### 操作 1: Agent 列表展示

- **页面状态**: 有多个任务正在运行或已完成，打开了设置弹窗的健康仪表板标签
- **用户操作**: 观察 Agent 列表
- **预期结果**:
  - 每个 Agent 显示 sessionId
  - 显示关联的 taskId
  - 显示 Agent 状态（creating / running / idle / error / completed / failed）
  - 显示健康状态（healthy / suspected / hung / dead）
  - 显示运行时长（从 startTime 到现在的持续时间）
  - 显示模型和提供商信息（如 deepseek/deepseek-chat）

### 操作 2: 健康状态颜色标识

- **页面状态**: 健康仪表板中有多个 Agent
- **用户操作**: 观察各 Agent 的健康状态标签
- **预期结果**:
  - healthy：绿色标识
  - suspected：黄色标识（可能有问题）
  - hung：红色标识（已挂起）
  - dead：灰色/深红色标识（已死亡）
  - 颜色变化实时更新，不需手动刷新

### 操作 3: Agent 状态更新

- **页面状态**: 健康仪表板打开，有一个 Agent 正在运行
- **用户操作**: 等待 Agent 完成任务，或手动中止任务
- **预期结果**:
  - Agent 完成任务后：状态从 running → idle → completed，健康状态保持 healthy
  - Agent 出错后：状态变为 error，健康状态变为 dead
  - 所有变化实时反映在健康仪表板中

### 操作 4: Agent 心跳检测

- **页面状态**: 健康仪表板打开，Agent 正常运行
- **用户操作**: 等待一段时间观察
- **预期结果**:
  - 正常 Agent 的 lastHeartbeat 时间持续更新
  - 若模拟 Agent 无响应（停止心跳），健康状态逐步变化：
  - healthy → suspected → hung
  - hung 状态的 Agent 触发恢复机制

### 操作 5: 空状态

- **页面状态**: 系统中没有任何 Agent 会话
- **用户操作**: 打开健康仪表板
- **预期结果**:
  - 显示空状态提示："无活跃 Agent" 或 "No active agents"
  - 列表中没有任何条目

### 操作 6: 关闭设置后重新打开

- **页面状态**: 健康仪表板中有多个 Agent
- **用户操作**: 关闭设置弹窗，再次打开并切换到健康仪表板
- **预期结果**:
  - Agent 列表仍存在
  - 各 Agent 的状态和健康信息已更新到最新
