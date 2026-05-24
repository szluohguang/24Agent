## 1. 基础设施搭建

- [x] 1.1 安装新增依赖：`better-sqlite3`、`@types/better-sqlite3`、`node-cron`、`@types/node-cron`
- [x] 1.2 扩展 `types.ts`：添加 `ScheduledTask`、`HealthStatus` 类型；扩展 `AgentState`（最后心跳时间、看门狗超时、健康状态）；扩展 `TaskState`（创建时间、更新时间、优先级）
- [x] 1.3 创建 `src/orchestrator/database.ts`：SQLite 数据库初始化、WAL 模式配置、表创建（任务、代理、时间线、配置、调度）
- [x] 1.4 创建 `src/orchestrator/store.ts`：数据访问层（任务/代理/时间线/配置/调度的 CRUD），封装 better-sqlite3 同步 API
- [x] 1.5 创建 `src/orchestrator/health-monitor.ts`：健康检查管理器（心跳调度器、看门狗定时器、SSE 流监控）
- [x] 1.6 创建 `src/orchestrator/scheduler.ts`：DAG 依赖解析器、调度队列、cron 任务注册器
- [x] 1.7 创建 `src/orchestrator/recovery.ts`：启动恢复逻辑、SSE 自动重连、挂起会话恢复
- [x] 1.8 `package.json` 新增脚本：`npm run db:migrate`（保留未来数据库迁移入口）

## 2. 任务持久化

- [x] 2.1 实现 `database.ts` —— 数据库连接管理、表创建 DDL、WAL/同步模式配置
- [x] 2.2 实现 `store.ts` —— 任务 CRUD（插入/更新/删除/查询，按状态过滤）
- [x] 2.3 实现 `store.ts` —— 代理 CRUD（插入/更新/查询，按任务ID或状态过滤）
- [x] 2.4 实现 `store.ts` —— 时间线批量插入与按会话ID/任务ID查询
- [x] 2.5 实现 `store.ts` —— 配置读写（存在则更新模式，单行配置）
- [x] 2.6 实现 `store.ts` —— 调度任务 CRUD（独立于普通任务表）
- [x] 2.7 重构 `core.ts`：`addTask()`、`dispatchTask()`、`abortTask()`、状态变更时同步写入 SQLite
- [x] 2.8 重构 `core.ts`：时间线事件追加时同步写入 SQLite
- [x] 2.9 实现 `getState()` 从 SQLite 加载完整状态（任务 + 代理 + 时间线 + 配置）
- [x] 2.10 实现 `updateOrchestratorConfig()` 持久化配置变更

## 3. 代理健康检查

- [x] 3.1 实现 `health-monitor.ts` —— 心跳调度器：定时遍历活跃会话调用 `session.status()` 或轻量 ping
- [x] 3.2 实现 `health-monitor.ts` —— 心跳失败处理：首次失败标记可疑，二次失败标记挂起触发恢复
- [x] 3.3 实现 `health-monitor.ts` —— 每个会话的看门狗定时器：120 秒无事件触发超时；收到事件重置定时器
- [x] 3.4 实现 `health-monitor.ts` —— 全局 SSE 流看门狗：60 秒无事件触发重连
- [x] 3.5 重构 `event-stream.ts`：集成看门狗事件通知（事件到达时通知健康监控器）
- [x] 3.6 重构 `core.ts`：`dispatchTask()` 时向健康监控器注册会话；`handleSessionComplete/Error` 时注销

## 4. 自动恢复

- [x] 4.1 实现 `recovery.ts` —— SSE 自动重连：指数退避（1 秒 → 60 秒上限），重连后恢复活跃会话监听
- [x] 4.2 实现 `recovery.ts` —— 挂起会话恢复：中止旧会话 → 增加重试次数 → 创建新会话 → 重新分发
- [x] 4.3 实现 `recovery.ts` —— 启动恢复：从 SQLite 加载所有未完成任务，待处理任务入调度队列，运行中任务重试，失败任务按重试次数决策
- [x] 4.4 重构 `index.ts`：启动流程新增 → 初始化数据库 → 加载已持久化状态 → 执行启动恢复 → 启动健康检查
- [x] 4.5 重构 `index.ts`：新增 `onGracefulShutdown()` 函数，SIGINT/SIGTERM 时刷新状态到 SQLite（5 秒超时）

## 5. 任务调度

- [x] 5.1 实现 `scheduler.ts` —— DAG 依赖解析器：拓扑排序，循环依赖检测报错
- [x] 5.2 实现 `scheduler.ts` —— 调度队列：FIFO 优先级队列，手动任务优先于定时任务
- [x] 5.3 实现 `scheduler.ts` —— `maxParallel` 执行限制：活跃会话数 ≥ maxParallel 时入队等待；会话结束触发出队
- [x] 5.4 实现 `scheduler.ts` —— 自动分发：任务状态变为已完成时检查下游任务依赖，满足则自动分发
- [x] 5.5 实现 `scheduler.ts` —— cron 调度器：使用 node-cron 注册/注销定时任务；触发时创建任务并自动分发
- [x] 5.6 重构 `core.ts`：`addTask()` 时检查循环依赖；新任务入调度队列而非直接分发

## 6. API 扩展

- [x] 6.1 修改 `api.ts` —— 新增 `POST /api/schedule`：创建定时任务
- [x] 6.2 修改 `api.ts` —— 新增 `GET /api/schedule`：列出所有定时任务
- [x] 6.3 修改 `api.ts` —— 新增 `PUT /api/schedule/:id`：更新定时任务（含启用/禁用）
- [x] 6.4 修改 `api.ts` —— 新增 `DELETE /api/schedule/:id`：删除定时任务
- [x] 6.5 增强 `api.ts` —— 修改 `POST /api/task`：支持可选的 `priority` 和 `dependsOn`
- [x] 6.6 增强 `http.ts` —— `/health` 端点升级为深度健康检查：返回数据库状态、活跃会话数、任务统计

## 7. WebSocket 扩展

- [x] 7.1 修改 `websocket.ts` —— 新增客户端消息类型：`schedule-task`、`list-schedules`、`delete-schedule`
- [x] 7.2 修改 `websocket.ts` —— `createBroadcastCallbacks()` 新增调度相关事件广播

## 8. 测试

- [x] 8.1 创建 `src/orchestrator/__tests__/database.test.ts`：数据库初始化、表创建、WAL 模式验证
- [x] 8.2 创建 `src/orchestrator/__tests__/store.test.ts`：所有 CRUD 操作测试（任务/代理/时间线/配置/调度）
- [x] 8.3 创建 `src/orchestrator/__tests__/scheduler.test.ts`：DAG 拓扑排序、循环依赖检测、优先级队列、自动分发、最大并行限制
- [x] 8.4 创建 `src/orchestrator/__tests__/health-monitor.test.ts`：心跳调度、看门狗超时、会话状态转换
- [x] 8.5 创建 `src/orchestrator/__tests__/recovery.test.ts`：SSE 重连退避、启动恢复逻辑、挂起会话恢复
- [x] 8.6 增强 `src/server/__tests__/http.test.ts`：新增调度端点测试、深度健康检查测试
- [x] 8.7 增强 `src/server/__tests__/websocket.test.ts`：新增调度相关消息类型测试

## 9. 集成验证

- [x] 9.1 `npm run typecheck` → 通过
- [x] 9.2 `npm run build` → 通过（tsc + vite build）
- [x] 9.3 `npm run test -- --coverage` → 全部通过，覆盖率 72.31%
- [x] 9.4 启动服务验证：数据库文件创建成功、健康检查启动、调度队列工作
