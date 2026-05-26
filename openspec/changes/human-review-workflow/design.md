## Context

当前系统为全自动闭环：任务创建后自动调度分发，Agent 执行完毕自动评估并标记完成。`strict` 权限级别虽配置了 `action: 'ask'`，但 orchestrator 没有任何审批处理逻辑和事件监听，导致该级别名存实亡。

核心问题：
- TaskStatus 仅有 `pending | running | completed | failed`，无待审核状态
- evaluator 评估后直接标记 complete，无人确认环节
- 无审批 API / WebSocket 端点
- 无审批 UI

## Goals / Non-Goals

**Goals:**
- strict 权限级别下，任务执行完进入 `awaiting_review` 状态，等待人工审核
- 审核人可通过/驳回（驳回时附带反馈意见）
- 驳回后反馈作为上下文注入 re-dispatch prompt
- 审核记录写入 timeline，可追溯
- trusted/safe 级别保持现有自动完成行为

**Non-Goals:**
- 不实现 ACP SDK 层面的逐操作审批（action: 'ask' 的完整处理），仅聚焦任务级结果审核
- 不实现多级审批或审批人角色管理
- 不实现审批通知推送（邮件/桌面等）

## Decisions

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 审核触发条件 | 全部任务/按级别/按标签 | **按权限级别** | 复用现有三档体系，strict 需审核，trusted/safe 自动完成，最小侵入 |
| 驳回行为 | 重置 pending / 标记 rejected | **标记 rejected** | 保留驳回历史，与 pending 区分，用户可手动 re-dispatch |
| 反馈传递 | 单独字段 / timeline 注入 | **timeline + re-dispatch 上下文** | timeline 保证可追溯，re-dispatch 自动注入反馈到 prompt |
| 审核数据存储 | 内存 / SQLite | **SQLite store 扩展** | 与现有持久化策略一致，审核记录随任务持久化 |
| 审核面板位置 | 弹窗 / 内嵌三栏 | **内嵌三栏中间栏底部** | 遵循现有布局模式，选中待审核任务时显示 |

## Risks / Trade-offs

- **[风险] 审核阻塞**: 若用户长时间不审核，任务卡在 awaiting_review → **缓解**: 可在未来版本加审核超时自动处理机制
- **[风险] concurrent 审核冲突**: 多个 WebSocket 客户端同时审核同一任务 → **缓解**: 后端加任务级锁，审核操作幂等
- **[风险] 驳回反馈丢失**: 数据库异常导致 feedback 未持久化 → **缓解**: feedback 写入在事务中与状态变更一起提交
