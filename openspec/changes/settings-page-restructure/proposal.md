## Why

设置弹窗在当前 UI 中覆盖在主内容之上，无法与其他面板同时查看。项目目录、目标、描述等配置只能通过环境变量设置，没有 UI 管理入口。项目计划和进度信息缺少统一的展示和共享位置。

## What Changes

1. **设置改为独立页面** — 右上角齿轮图标激活设置页面（非顶部 tab 导航）
2. **左右分栏布局** — 左侧设置项导航列表（项目设置排第一），右侧显示对应设置内容
3. **项目设置** — 项目目录（支持系统文件选择对话框）、项目目标、项目描述的查看和编辑
4. **目标/描述优化按钮** — 调用 AI 接口对项目目标和描述进行内容优化
5. **REST API** — 项目设置的 get/set 接口、文本优化接口
6. **项目信息共享文件** — 项目计划、进度、任务进展写入独立文件夹供各 Agent 共享

## Capabilities

### New Capabilities
- `settings-page`: 设置弹窗改为独立页面，左右分栏布局
- `project-settings`: 项目目录/目标/描述的 UI 和 API
- `project-detail`: 项目详情页，展示计划和进度
- `project-shared-store`: 项目信息共享文件存储

### Modified Capabilities
- `webui-basics`: 设置入口从弹窗改为页面路由

## Impact

- `src/webui/src/App.tsx`: 替换设置弹窗为页面路由
- `src/webui/src/components/SettingsPage.tsx`: 新建设置页面（左右分栏）
- `src/webui/src/components/ProjectSettings.tsx`: 项目设置表单
- `src/webui/src/components/ProjectDetail.tsx`: 项目详情页
- `src/server/api.ts`: 新增项目设置 REST API
- `src/orchestrator/core.ts`: 新增项目配置管理方法
- `project/` 目录: 项目计划/进度/任务信息共享文件
