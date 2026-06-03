## 1. 后端 API — 项目配置

- [x] 1.1 Store 新增 getProjectConfig / setProjectConfig 方法
- [x] 1.2 api.ts 新增 GET /api/project/config 和 PUT /api/project/config

## 2. 设置页面重构

- [x] 2.1 App.tsx 新增页面状态，设置弹窗改为独立页面
- [x] 2.2 SettingsPage 组件：左右分栏布局，左侧导航列表
- [x] 2.3 原 Settings Modal 内容迁移到对应标签页（保留全部功能）

## 3. 项目设置 UI

- [x] 3.1 ProjectSettings 组件：目录/目标/描述表单，fetch 调用 API
- [x] 3.2 保护：loading 状态、保存反馈、错误处理

## 4. 项目详情页

- [x] 4.1 ProjectDetail 组件：展示目标/描述/计划/进度/任务统计
- [x] 4.2 项目共享文件：project/ 目录创建

## 5. 验证

- [x] 5.1 TypeScript typecheck 通过
- [x] 5.2 单元测试通过
- [x] 5.3 构建通过
