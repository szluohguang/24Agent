## ADDED Requirements

### Requirement: 日志详情页面
系统 SHALL 提供一个日志详情页面，按时间倒序展示所有系统日志。

#### Scenario: 时间倒序
- **WHEN** 用户打开日志详情页
- **THEN** 日志按时间倒序排列（最新在最上面）

#### Scenario: 初始加载
- **WHEN** 用户打开日志详情页
- **THEN** 通过 `GET /api/logs` 获取最近 500 条日志

#### Scenario: 实时更新
- **WHEN** 新日志产生
- **THEN** WebSocket `system-log` 消息推送到前端，日志列表实时追加

### Requirement: 类型筛选
日志详情页 SHALL 支持按类型（all/info/warning/error）筛选日志。

#### Scenario: 筛选 all
- **WHEN** 用户选择"全部"
- **THEN** 显示所有日志

#### Scenario: 筛选 info
- **WHEN** 用户选择"info"
- **THEN** 仅显示 info 类型日志

#### Scenario: 筛选 warning
- **WHEN** 用户选择"warning"
- **THEN** 仅显示 warning 类型日志

#### Scenario: 筛选 error
- **WHEN** 用户选择"error"
- **THEN** 仅显示 error 类型日志

### Requirement: 错误确认机制
日志详情页 SHALL 支持用户点击 error 条目标记为已读（acknowledged），从而解除状态栏的 error 固定。

#### Scenario: 标记已读
- **WHEN** 用户在日志详情页点击一条 error 日志
- **THEN** 该日志标记为 acknowledged，状态栏如果显示此 error 则允许被覆盖

### Requirement: 日志条目展示
每条日志 SHALL 展示时间、类型图标/颜色标签、来源、消息内容、计数（如合并）。

#### Scenario: 日志条目格式
- **WHEN** 用户查看日志列表
- **THEN** 每条日志显示：[时间] [类型标签] [来源] 消息内容
