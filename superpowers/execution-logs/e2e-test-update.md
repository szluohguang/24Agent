# 浏览器 E2E 测试更新 — 执行日志

## 2026-05-25

### 背景
- WebUI 三栏布局改造后，原有的 10 个 Playwright E2E 测试未同步更新
- 旧测试引用了已不存在的 UI 元素（时间线 tab、任务标签等）
- `test-server.ts` 依赖旧的 `Orchestrator` 构造函数（缺少 database 参数）

### 更新内容

#### 修复 test-server.ts
- 添加 `better-sqlite3` 内存数据库初始化
- 创建所需的 5 张表（tasks, agents, timeline, config, schedules）
- 传递 database 实例给新的 `Orchestrator` 构造函数

#### 更新 app.spec.ts (7 tests → 9 tests)
- 移除 `text=时间线` 检查（三栏布局无时间线 tab）
- 新增健康面板检查（`text=无活跃 Agent`、`活跃`、`状态`）
- 新增设置齿轮按钮 + 弹窗测试
- 修改测试名反映新布局

#### 更新 i18n.spec.ts (3 tests)
- 移除 `text=时间线`、`text=任务`（无对应元素）
- 添加 `text=无活跃 Agent` 检查

#### 新增 health-schedule.spec.ts (4 tests)
- 健康面板空状态测试
- 设置弹窗打开 + 定时任务管理器显示
- 设置弹窗通过点击背景关闭

### 验证
- `tsc --noEmit` → 通过
- `npm run build` → 通过
- `vitest run` → 139/139 通过（14 文件）
- `playwright test` → 15/15 通过
