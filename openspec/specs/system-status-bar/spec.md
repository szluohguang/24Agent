## ADDED Requirements

### Requirement: StatusBar 底部固定显示
系统主界面底部 SHALL 始终显示一个固定高度的状态栏（28px），不随页面切换消失。

#### Scenario: 始终可见
- **WHEN** 用户在主页/设置/项目详情间切换
- **THEN** 底部状态栏始终固定显示

### Requirement: 颜色分级显示
状态栏 SHALL 按日志级别使用不同颜色：info=蓝色(#58a6ff)，warning=黄色(#d29922)，error=红色(#da3633)。

#### Scenario: info 级别
- **WHEN** 最新日志为 info 类型
- **THEN** 状态栏背景或文字为蓝色

#### Scenario: warning 级别
- **WHEN** 最新日志为 warning 类型
- **THEN** 状态栏背景或文字为黄色

#### Scenario: error 级别
- **WHEN** 最新日志为 error 类型
- **THEN** 状态栏背景或文字为红色

### Requirement: Error 消息持久化
Error 级别的日志 SHALL NOT 被新消息自动覆盖。只有用户点击查看并确认后（acknowledged = true）才允许新消息覆盖。

#### Scenario: error 不被覆盖
- **WHEN** 状态栏显示一条 error 消息
- **THEN** 新消息到达时，状态栏继续保持显示该 error

#### Scenario: 用户查看后解除
- **WHEN** 用户点击状态栏打开日志详情页，并点击了该 error 条目
- **THEN** 该 error 标记为 acknowledged，允许被新消息覆盖

### Requirement: 消息合并
高频重复消息 SHALL 被合并。同源同类型 500ms 内多条消息合并为一条，计数加一。

#### Scenario: 消息合并
- **WHEN** 同一 source 同一 type 的消息在 500ms 内多次触发
- **THEN** 合并为一条显示，末尾标注 `(×N)`

### Requirement: 日志来源接入
系统 SHALL 从以下来源采集日志：健康检查失败、WebSocket 异常、agent 错误/重试/hung/dead、预算超限、API 调用错误。

#### Scenario: 健康检查失败
- **WHEN** `GET /health` 返回非 200 或网络异常
- **THEN** 产生一条 type=error 的日志

#### Scenario: Agent 错误
- **WHEN** agent session 发生 error
- **THEN** 产生一条 type=error 的日志

#### Scenario: 服务恢复
- **WHEN** 健康检查从失败恢复为成功
- **THEN** 产生一条 type=info 的日志

### Requirement: 状态栏交互
状态栏 SHALL 支持点击，点击后打开日志详情页面。

#### Scenario: 点击打开日志
- **WHEN** 用户点击状态栏
- **THEN** 打开日志详情页（LogViewer 组件），按时间倒序展示
