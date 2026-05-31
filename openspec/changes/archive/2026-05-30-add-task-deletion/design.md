## Context

当前系统无任务删除功能。任务创建后永久存在于内存 Map 和 SQLite 中，只能通过中止/分发/审核等操作，无法移除。已完成/失败/驳回的冗余任务会持续堆积。

## Goals / Non-Goals

**Goals:**
- 支持通过 REST API 和 WebSocket 删除任务
- WebUI TreeView 中为终态任务（completed/failed/rejected/awaiting_review）显示删除按钮
- 删除时清理关联的 Agent 会话、健康监控注册、DB 记录
- 删除操作记录时间线条目

**Non-Goals:**
- 不实现批量删除
- 不实现软删除（永久物理删除）
- 不实现回收站/恢复功能

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 删除范围 | 仅删除单个任务及关联 Agent | 保持简单，不级联删除依赖任务 |
| 删除方式 | 物理删除（DELETE SQL） | 无软删除需求，避免数据堆积 |
| 操作入口 | TreeView 中终态任务显示"删除"按钮 | 运行中的任务不允许删除（需先中止） |
| 后端静默处理 | 不存在时直接 return | 与 abortTask 行为一致，避免 404 异常 |

## Risks / Trade-offs

- **[风险] 误删**: 用户点错删除不可恢复 → **缓解**: 仅在终态任务显示删除按钮，非终态任务不能删除
