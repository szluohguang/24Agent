## 新增需求

### 需求：DAG 依赖解析器
系统必须使用拓扑排序解析任务依赖。
带有 `dependsOn` 的任务只有在所有依赖任务状态为 `completed` 时才能被分发。
循环依赖必须在 `addTask()` 时检测并拒绝。

#### 场景：按依赖排序分发
- **WHEN** 任务 A 依赖于任务 B，且两者都已添加
- **THEN** 任务 B 首先被分发
- **THEN** 任务 A 仅在任务 B 完成后才被分发

#### 场景：循环依赖被拒绝
- **WHEN** 任务 A 依赖于 B，B 依赖于 C，C 依赖于 A
- **THEN** `addTask()` 抛出错误："检测到循环依赖"

### 需求：依赖完成时自动分发
当任务转换为 `completed` 时，系统必须检查所有依赖它的任务。
如果下游任务的所有依赖都已满足，该下游任务必须自动分发。

#### 场景：下游任务自动分发
- **WHEN** 任务 B 完成且存在任务 A（dependsOn: [B]）
- **THEN** 任务 A 自动分发
- **THEN** 创建时间线条目："任务 A 自动分发（依赖 B 已完成）"

### 需求：并行度强制限制
`maxParallel` 配置必须在分发时强制生效。
当 `maxParallel` 个并发会话活跃时，新分发请求必须排队等待空闲槽位。
排队任务必须在运行会话结束时立即分发。

#### 场景：并行度限制生效
- **WHEN** maxParallel 为 3 且已有 3 个会话在运行
- **THEN** 新的分发请求被排队（而非拒绝）
- **THEN** 当一个会话结束时，排队任务自动分发

### 需求：基于 cron 的任务调度
系统必须支持使用标准 cron 表达式调度任务。
新的 `ScheduledTask` 接口必须包含：`id`、`description`、`cronExpr`、`permission`、`budget`、`maxRetries`、`enabled`、`lastTriggered`。
定时任务必须持久化到数据库。

#### 场景：cron 任务按计划触发
- **WHEN** 系统时钟匹配已注册的 cron 表达式
- **THEN** 使用调度描述创建一个新任务
- **THEN** 新任务自动分发
- **THEN** 数据库中的 `lastTriggered` 更新

#### 场景：禁用的 cron 任务不触发
- **WHEN** 定时任务的 `enabled` 为 false
- **THEN** 不评估该任务的 cron 表达式

### 需求：任务调度 API 端点
REST API 必须公开定时任务的 CRUD 端点：
- `POST /api/schedule` — 创建定时任务
- `GET /api/schedule` — 列出所有定时任务
- `PUT /api/schedule/:id` — 更新定时任务（包括启用/禁用）
- `DELETE /api/schedule/:id` — 删除定时任务

#### 场景：调度 CRUD 正常工作
- **WHEN** 使用有效的 cron 表达式和描述向 /api/schedule 发送 POST 请求
- **THEN** 创建新定时任务并注册到 cron 引擎
- **THEN** 定时任务出现在 GET /api/schedule 的响应中

### 需求：手动任务优先级队列
手动分发的任务必须优先于自动调度的任务。
在同一优先级内，任务必须按 FIFO 顺序分发。

#### 场景：手动任务优先于定时任务
- **WHEN** 定时 cron 任务和手动任务都在队列中
- **THEN** 手动任务首先被分发
