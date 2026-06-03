## Why

右侧监控面板当前包含 4 个指标卡片（活跃/状态/任务/重试）、Comet 状态区、agent 表格。指标卡片占用大量空间但信息密度低，Comet 状态被挤到底部不醒目，agent 区域缺少滚动条无法容纳大量条目。

## What Changes

- 移除 SystemOverview 的 4 个指标卡片（活跃、状态、任务、重试）
- 仅保留预算单行显示
- Comet 状态区域移到面板最顶部
- Agent 区域改为列表视图，同时支持横向和纵向滚动条

## Capabilities

### New Capabilities
- _(无，仅修改现有组件)_

### Modified Capabilities
- _(无，不涉及 spec 级别变更)_

## Impact

- `src/webui/src/components/HealthDashboard.tsx` — 重组布局：Comet置顶、移除指标卡片、Agent列表加滚动
- `src/webui/src/components/SystemOverview.tsx` — 移除非预算内容，或仅保留 BudgetLine
