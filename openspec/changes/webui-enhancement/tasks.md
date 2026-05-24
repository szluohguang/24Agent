## 1. 基础设施搭建

- [x] 1.1 创建 `en-US.json`，补全所有翻译 id（与 zh-CN.json 一一对应），新增面板相关翻译
- [x] 1.2 修改 `I18nProvider.tsx`：加载 en-US.json；添加 `setLocale` 持久化到 localStorage
- [x] 1.3 修改 `useWebSocket.ts`：暴露 `isReconnecting`、`reconnectAttempts`、`lastConnectedAt`；添加 `health-report` 消息类型处理
- [x] 1.4 TypeScript 类型定义：创建 `src/webui/src/types.ts`，统一 WebUI 前端类型

## 2. 健康监控面板

- [x] 2.1 创建 `components/HealthDashboard.tsx`：Agent 健康矩阵表格（sessionId/taskId/status/lastHeartbeat/duration），颜色编码（健康=绿/可疑=黄/挂起=橙/死亡=红）
- [x] 2.2 创建 `components/SystemOverview.tsx`：系统概览卡片（活跃会话数/错误率/重试统计/预算消耗）
- [x] 2.3 实现健康面板实时更新：WebSocket `health-report` 消息处理 + 5 秒轮询 `GET /health` 回退
- [x] 2.4 实现数据过期指示器：断连后数据变为灰色半透明，显示 "数据过期 (X秒前)"
- [x] 2.5 修改 `App.tsx`：新增 "健康面板" 标签页，集成 HealthDashboard + SystemOverview

## 3. 调度管理界面

- [x] 3.1 创建 `components/ScheduleManager.tsx`：调度任务列表（表格：描述/cron 表达式/启用开关/上次触发/下次触发）
- [x] 3.2 创建 `components/ScheduleForm.tsx`：创建/编辑调度表单（描述/cron/权限/预算/重试次数）
- [ ] 3.3 实现 cron 日历预览：输入 cron 表达式时计算并展示未来 5 次触发时间（使用 `cronstrue` 或手动计算）
- [x] 3.4 实现调度 API 调用：对接 `GET/POST/PUT/DELETE /api/schedule`
- [x] 3.5 修改 `App.tsx`：新增 "调度管理" 标签页，集成 ScheduleManager
- [x] 3.6 补充翻译 id：所有调度相关文本加入 zh-CN.json 和 en-US.json

## 4. 恢复状态显示

- [x] 4.1 修改 `ControlBar.tsx`：使用 useWebSocket 新属性显示重连指示器（"重连中 (第X次)" + 脉冲动画）
- [x] 4.2 修改 `Timeline.tsx`：恢复事件颜色编码（hung-recovery=黄, hung-failed=红, retry=橙, max-retries=深红）
- [x] 4.3 修改 `Timeline.tsx`：添加事件类型过滤按钮（全部/恢复事件/普通事件）
- [x] 4.4 修改任务状态图标：在 task-tree 和 App.tsx 中支持 `scheduled`/`queued`/`retrying` 状态
- [x] 4.5 任务重试徽章：retrying 状态任务显示 "重试 2/10" 徽章

## 5. TreeView 组件整合

- [x] 5.1 扩展 `TreeView.tsx`：新增 scheduled/queued/retrying 状态图标和颜色
- [x] 5.2 修改 `App.tsx`：用 TreeView 组件替换内联任务列表渲染
- [x] 5.3 添加任务计数摘要栏（pending/running/completed/failed/scheduled/queued 分类统计）
- [x] 5.4 补充相关翻译 id
- [x] 5.5 清理：删除 App.tsx 中内联的任务渲染逻辑

## 6. 测试

- [ ] 6.1 创建前端组件测试（待补充）
- [ ] 6.2 增强 `useWebSocket` 测试

## 7. 集成验证

- [x] 7.1 `npm run typecheck` → 通过
- [x] 7.2 `npm run build` → 通过（tsc + vite build）
- [x] 7.3 `npm run test` → 全部通过
- [ ] 7.4 启动服务并手动验证
