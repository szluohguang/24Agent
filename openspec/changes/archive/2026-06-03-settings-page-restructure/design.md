---
archived-with: 2026-06-03-settings-page-restructure
status: final
status: final
---
## Context

当前设置以弹窗（Modal）形式展示，覆盖主内容。项目目录、目标、描述等配置无 UI。项目共享文件（计划/进度）存储位置不明确。

## Goals / Non-Goals

**Goals:**
- 设置弹窗改为独立页面，不覆盖主内容
- 左右分栏：左侧导航 + 右侧内容
- 项目设置：目录/目标/描述的修改表单
- 项目详情：目标和进度概览
- REST API：项目配置 get/set
- project/ 目录：共享信息文件

**Non-Goals:**
- 不改 Agent 调度逻辑
- 不重建认证系统

## Decisions

1. **页面路由** — 在 App.tsx 顶部导航栏增加标签页切换（主页 / 设置 / 项目），用 useState<string> 控制当前页面。

2. **设置页面布局** — SettingsPage 组件，左侧 200px 固定宽度的导航列表，右侧填充剩余宽度显示对应内容。

3. **项目配置存储** — 用 SQLite config 表存储 directory/goal/description。新增 `ProjectStore` 类或扩展 Store。

4. **共享文件** — 项目根目录下的 `project/` 文件夹，包含 `plan.md`（项目计划）和 `progress.md`（项目进度）。由 Orchestrator 在任务状态变更时写入。

5. **API 路由** — `GET /api/project/config` 和 `PUT /api/project/config`。

## Risks / Trade-offs

- [低] 项目详情页的数据需要聚合多个来源（任务 + 配置 + 文件），首次加载可能需要多个请求。
