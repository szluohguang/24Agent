# Comet Design Handoff

- Change: right-panel-rework
- Phase: design
- Mode: compact
- Context hash: 9c3dd53b21e04bff59e9db2cabea588896698a8e054d2bbbc40a5cd2a682429e

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/right-panel-rework/proposal.md

- Source: openspec/changes/right-panel-rework/proposal.md
- Lines: 1-23
- SHA256: 5eb88ffe5a18352a2a3d460f31b0ed73eff2389029077468c4e61a1627aaaacd

```md
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
```

## openspec/changes/right-panel-rework/design.md

- Source: openspec/changes/right-panel-rework/design.md
- Lines: 1-36
- SHA256: 08fa754da37b9590b11f7947322914f06ba64f5d40469834f9872846fd745fc5

```md
## Context

右侧面板当前布局：
```
SystemOverview (4 cards + budget line)
Agent table (no scroll)
Comet status (bottom, conditional)
```

目标布局：
```
Comet status (top, always show)
Budget one-liner (inline)
Agent list (scrollable both axes)
```

## Goals / Non-Goals

**Goals:**
- 移除 4 个指标卡片
- Comet 置顶（始终展示，无变更时显示"无活跃变更"）
- Agent 区域改为带横向+纵向滚动条的列表

**Non-Goals:**
- 不修改 agent 数据获取逻辑
- 不修改 comet 状态结构

## Decisions

### 布局重组

HealthDashboard 渲染顺序改为：

1. Comet 状态区（原 conditional 改为 always render）
2. 预算单行（简化 SystemOverview，仅保留 BudgetLine）
3. Agent 列表（div 包裹，overflow: auto 同时启用 x/y 滚动）
```

## openspec/changes/right-panel-rework/tasks.md

- Source: openspec/changes/right-panel-rework/tasks.md
- Lines: 1-6
- SHA256: 1b27cb2992e99f96fc7ef1493f046f793e69356a5659e77a0df25ea65e2f2fd6

```md
## 1. 面板重组

- [ ] 1.1 HealthDashboard.tsx: Comet 状态移到最顶部，始终渲染
- [ ] 1.2 HealthDashboard.tsx: 移除 SystemOverview 组件引用和 4 个指标卡片，仅保留预算单行
- [ ] 1.3 HealthDashboard.tsx: Agent 区域添加横向+纵向滚动条
- [ ] 1.4 编译验证和测试
```

