## 为什么需要 Phase 3

当前系统所有状态（任务、代理、时间线）保存在内存中，进程重启即丢失。ACP 会话无健康检查机制，仅在 SSE 事件到达时被动响应；静默挂起、SSE 断连等场景会导致任务永久卡在运行中状态。任务依赖（dependsOn）虽被存储但从未执行，无调度能力。需要引入持久化、健康检查、自动恢复和任务调度四大能力，使系统达到生产可用级别。

## 变更内容

### 新增能力

- `task-persistence`：使用 SQLite 持久化编排器状态（任务、代理、时间线、配置），支持进程重启后恢复到断点
- `agent-health-check`：为 ACP 子代理引入心跳检测、会话超时监控、SSE 断连自动重连
- `auto-recovery`：进程启动时恢复未完成任务；静默会话超时后自动中止并重试；SSE 断连指数退避重连
- `task-scheduling`：实现 DAG 依赖解析器自动按序分发任务；添加定时/周期调度能力；引入优先级队列

### 修改的能力

- `orchestrator-core`：状态管理从纯内存改为持久化存储；分发时实际执行并行度限制；新增恢复/重试入口
- `event-stream-observer`：添加 SSE 连接健康监控（看门狗定时器）和自动重连逻辑
- `acp-manager`：添加会话健康检测原语（ping/status）；会话操作添加超时控制

## 影响范围

| 区域 | 影响 |
|---|---|
| 新增依赖 | `better-sqlite3` 或 `sql.js`、`node-cron` |
| 核心模块 | `core.ts` 重构状态管理；`types.ts` 扩展类型定义 |
| 服务模块 | `http.ts` 的 `/health` 升级为深度健康检查 |
| API | 新增调度相关 REST 端点；批量操作端点 |
| 启动流程 | `index.ts` 新增数据库初始化 + 状态恢复步骤 |
| 配置项 | 新增 persistence.enabled、health-check.interval、recovery.auto 等 |
| 测试 | 新增持久化/调度/健康检查单元测试 + E2E 测试 |
