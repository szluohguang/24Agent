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
