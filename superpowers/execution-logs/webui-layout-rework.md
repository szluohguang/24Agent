# WebUI 三栏布局改造+状态修复 — 执行日志

## 2026-05-25

### Bug 根因分析
- 后端 `onStateChange` 广播 `{ type: 'state-update' }` 时不携带状态数据
- 前端未处理 `state-update` 消息类型，导致添加任务/分发/中止按钮后界面不刷新

### 后端修复
- `websocket.ts`: `createBroadcastCallbacks` 接受可选 `getState` 参数，`state-update` 广播包含完整状态
- `index.ts`: 传递惰性 `getState` 函数

### 前端 UI 重构
- 三栏布局：左栏（任务树，320px 固定）、中栏（流式控制台，flex:1 自适应）、右栏（健康面板，300px 固定）
- 顶栏：左侧标题，右侧语言切换、连接状态、权限选择、设置齿轮
- 任务输入从底栏 `ControlBar` 移至左栏树下方
- 设置弹窗内嵌 `ScheduleManager`（定时任务管理）
- `TreeView` 新增 subagent 健康信息显示
- 移除旧 `ControlBar` 侧边栏标签导航

### 其他
- 补齐 `en-US.json` 缺失的翻译 key
- 安装 `@playwright/mcp` 及 Chromium 浏览器
- 配置 `opencode.json` MCP server

### 验证
- `npm run typecheck` — ✓ 通过
- `npm run build` — ✓ 通过
- `npm run test` — ✓ 139/139 全部通过（14 个文件）
