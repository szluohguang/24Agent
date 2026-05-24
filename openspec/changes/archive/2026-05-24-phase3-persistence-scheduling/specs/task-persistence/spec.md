## 新增需求

### 需求：SQLite 数据库初始化
系统必须在启动时初始化 SQLite 数据库并启用 WAL 模式。
数据库必须位于项目根目录下的 `data/orchestrator.db`。
表创建必须使用 IF NOT EXISTS 模式以保证幂等启动。

#### 场景：启动时创建数据库
- **WHEN** 应用程序启动
- **THEN** `data/orchestrator.db` 数据库文件存在
- **THEN** 所有必需表已创建（任务、代理、时间线、配置）

### 需求：任务 CRUD 持久化
所有任务生命周期操作（添加/分发/完成/中止/失败）必须立即持久化到 SQLite。
任务表必须存储：`id`、`description`、`status`、`dependsOn`（JSON）、`sessionId`、`retryCount`、`maxRetries`、`error`、`permission`、`budget`、`createdAt`、`updatedAt`。

#### 场景：任务创建已持久化
- **WHEN** 调用 `addTask()`
- **THEN** 任务表中出现新行
- **THEN** 该行包含匹配 TaskState 的所有字段

#### 场景：任务状态更新已持久化
- **WHEN** 任务从待处理转换为运行中
- **THEN** 任务表行反映新状态和更新时间

### 需求：代理状态持久化
代理状态（sessionId、taskId、status、startTime、model、provider）必须持久化到代理表。
当代理会话结束时，代理表行必须更新（而非删除）。

#### 场景：分发时创建代理
- **WHEN** `dispatchTask()` 创建新的 ACP 会话
- **THEN** 代理表中出现新行

### 需求：时间线条目持久化
时间线条目必须持久化到时间线表，字段包括：`id`、`time`、`source`、`sessionId`、`type`、`message`。

#### 场景：事件触发时持久化时间线条目
- **WHEN** 任何 SSE 事件产生时间线条目
- **THEN** 时间线表中出现新行

### 需求：配置持久化
编排器配置（权限、预算限制、最大并行数）必须持久化到配置表。
通过 API 的配置变更必须立即更新持久化值。

#### 场景：配置变更已持久化
- **WHEN** 调用 POST /api/config/permission
- **THEN** 配置表反映新的权限级别

### 需求：启动时完整状态恢复
在应用程序启动时，编排器必须从 SQLite 加载所有任务、代理、时间线和配置。
加载的状态必须与关闭前的状态一致（除临时流数据外）。

#### 场景：重启后状态恢复
- **WHEN** 应用程序在正常关闭后重启
- **THEN** 所有先前持久化的任务可通过 `getState()` 获取
- **THEN** 所有先前持久化的时间线条目可用
- **THEN** 最后已知的配置生效
