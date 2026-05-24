## Context

WebUI 当前是简单的单页应用：左侧任务列表、右侧流式控制台/时间线标签页、底部控制栏。Phase 3 新增了健康检查、自动恢复和任务调度三大后端能力，但 WebUI 完全没有对应的展示界面。此外，英文翻译缺失（en-US.json 不存在）、TreeView 组件已编写但未被使用。

前端代码使用 React 19 + react-intl + 原生 WebSocket，无路由库（react-router 等）。

## Goals / Non-Goals

**Goals:**
- 健康监控面板：展示 Agent 健康矩阵（状态/心跳/活跃时长）、系统概览（错误率/重试统计/预算消耗）
- 调度管理界面：查看/创建/启用/禁用 cron 调度任务，调度日历视图预览下次触发时间
- 恢复状态组件：WebSocket 重连指示器（带重连次数）、任务重试/恢复状态可视化、恢复事件时间线高亮
- 英文翻译补全：创建 en-US.json 覆盖所有现有翻译 id
- TreeView 组件整合：替换 App.tsx 内联任务列表；新增 scheduled/queued/retrying 状态图标

**Non-Goals:**
- 不引入 react-router（保持单页，用标签页切换）
- 不新增后端 API（复用 Phase 3 的 /api/schedule 和 /health 端点）
- 不涉及用户登录/鉴权

## Decisions

### D1：布局架构 — 标签页扩展 + 侧边抽屉
现有 App.tsx 使用标签页切换（控制台/时间线）。保持此模式，新增标签：「健康面板」「调度管理」。健康面板作为全幅视图，调度管理独立页面。
- 可选方案：react-router 路由 vs 标签页扩展
- 选择：标签页扩展。无需路由开销，维护简单，与现有模式一致

### D2：健康面板 — 实时轮询 + 事件驱动
健康数据来源：
- 定时调用 `GET /health`（每 5 秒）获取系统概览
- WebSocket `health-report` 消息（后端广播）获取 Agent 健康状态变更
- 心跳数据从现有 `agent-state` 消息派生
- 所有状态缓存在前端，断连后显示灰色"数据过期"

### D3：调度管理 — 纯 API 驱动
调度 CRUD 全部通过 `GET/POST/PUT/DELETE /api/schedule` 完成，不走 WebSocket 广播。
新增一个独立视图，功能：
- 调度任务列表（表格形式，显示 cron 表达式/描述/启用状态/下次触发时间）
- 创建/编辑调度（cron 输入 + 描述/权限/预算/重试配置）
- 启用/禁用切换开关
- 日历预览（基于 cron 解析器在前端预览未来 5 次触发时间）

### D4：恢复状态 — WebSocket hook 增强
修改 `useWebSocket.ts`：
- 暴露 `isReconnecting: boolean` 和 `reconnectAttempts: number`
- 暴露 `lastConnectedAt: number | null`
ControlBar 使用这些状态显示重连进度条或指示灯
时间线组件按事件 type 字段实现严重性颜色编码

### D5：TreeView 组件复用
TreeView 已存在于 `components/TreeView.tsx`，但 App.tsx 直接渲染任务列表。将其替换为 TreeView 组件，并扩展支持 scheduled/queued/retrying 状态。

### D6：英文翻译
创建 `en-US.json`，所有翻译 id 与 zh-CN.json 一一对应。在 I18nProvider 中加载该文件。

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| 健康面板轮询 5s 间隔可能增加服务端负载 | 后端 /health 是轻量查询（内存状态），5s 间隔无压力 |
| cron 表达式前端解析需要额外依赖 | 使用 `cronstrue` 库将 cron 转为可读文本（已有 node-cron 类型知识） |
| WebUI 文件变大，单组件维护成本升高 | 拆分为独立组件文件，每个面板独立文件，App.tsx 只做组合 |
| 无状态管理库（Redux/Zustand），状态通过 props 层层传递 | 保持现状，App.tsx 作为唯一状态持有者，状态量不大 |
