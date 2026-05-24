## 背景

当前系统所有状态存储在内存中（`Orchestrator` 类的 `Map<taskId, TaskState>`、`Map<agentId, AgentState>`、`timeline: TimelineEntry[]`），进程重启即丢失。ACP 子代理会话无健康检测，SSE 事件流无断连重连。`dependsOn` 字段虽存储依赖信息但从未执行解析。`maxParallel` 配置存在但分发时未实际限制。

## 目标 / 非目标

**目标：**
- SQLite 持久化支撑进程重启后状态恢复
- ACP 会话心跳检测 + 超时自动中止
- SSE 断连指数退避自动重连
- DAG 依赖解析器自动按序分发任务
- 定时/周期任务调度（cron 表达式）
- 启动时恢复未完成/卡住的任务
- 深度健康检查端点

**非目标：**
- 多进程/分布式编排（保持单进程）
- WebUI 实时同步新增功能（留给后续阶段）
- 任务执行结果持久化存储（`TaskResult` 保持在内存）
- 外部消息队列（如 Redis Bull/RabbitMQ）

## 设计决策

### D1：SQLite via better-sqlite3
- **可选方案**：`sql.js` (WASM)、`better-sqlite3` (原生)、`pg` (PostgreSQL)
- **选择**：`better-sqlite3` 同步 API 更适合 Node.js 单进程场景，无事件循环阻塞问题，零配置嵌入式
- **备选**：如需纯 JS 无原生编译，可用 `sql.js`

### D2：持久化范围 — 仅持久化核心状态
- **选择**：持久化任务、代理、时间线、配置。不持久化流文本（体积大、实时性高、重连后丢弃）
- **权衡**：进程重启后代理流丢失，需重新监听

### D3：健康检查 — 主动心跳 + 被动超时
- **主动**：每 30 秒对活跃 ACP 会话调用 `session.status()` 或轻量 ping
- **被动**：SSE 事件流上设看门狗定时器，若某会话超过 120 秒无任何事件（delta/idle/error），判定超时
- **SSE 全局**：若全局流 60 秒无事件（含 keepalive），触发重连

### D4：SSE 自动重连 — 指数退避
- 首次重连延迟 1 秒，之后每次 ×2，上限 60 秒
- 重连后恢复所有活跃会话的监听
- 重连期间产生的事件标记为已丢失，但任务不中止

### D5：DAG 调度器 — 单层依赖解析
- 任务 `dependsOn` 用拓扑排序解析，仅支持 DAG（有向无环图），循环依赖报错
- 任务状态变更时触发邻居检测：前置任务已完成 → 后置任务自动分发
- `maxParallel` 在调度层面限制同时运行数

### D6：定时调度 — node-cron
- 引入 `node-cron`，支持标准的 cron 表达式
- 新增 `TaskSchedule` 类型：`{ taskDescription, cronExpr, permission, budget, maxRetries, enabled }`
- 调度触发等同于手动 `addTask()` + `dispatchTask()`

### D7：启动恢复策略
1. 从 SQLite 加载所有未完成的任务（pending/running/failed）
2. 待处理任务：检查依赖 → 若就绪则入调度队列
3. 运行中任务：清理旧会话 → 重新分发（等价于重试）
4. 失败任务：根据重试次数决定是否自动重试
5. 所有加载任务保留原始配置

## 风险 / 权衡

| 风险 | 缓解措施 |
|---|---|
| better-sqlite3 原生编译在 CI/某些环境失败 | 降级方案：提供 sql.js WASM 回退；install 脚本检测 |
| 健康检查引入额外 ACP SDK 调用开销 | 心跳间隔 ≥ 30 秒，且仅在会话无数据流时触发主动检查 |
| 进程突然崩溃（SIGKILL）导致 SQLite 写丢失 | SQLite WAL 模式减少损坏风险；关键写入使用 `PRAGMA synchronous = FULL` |
| 启动恢复时重复分发已完成的远程代理 | 通过 sessionId 持久化避免；分发前检查远程会话状态 |
| node-cron 在时区变更时行为不确定 | 固定 UTC 时间；文档中标注时区配置 |
