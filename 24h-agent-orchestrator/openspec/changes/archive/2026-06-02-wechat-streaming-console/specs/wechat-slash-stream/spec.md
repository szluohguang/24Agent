## ADDED Requirements

### Requirement: Slash command /stream to control streaming level
The system SHALL support a `/stream` slash command from WeChat to dynamically change the streaming push level.

#### Scenario: Set streaming to thinking level
- **WHEN** a WeChat user sends `/stream thinking`
- **THEN** the system SHALL set `wechat_stream_level` to `thinking`
- **AND** persist the setting to SQLite
- **AND** reply with confirmation message: "✅ 流式推送级别已设为：思考过程"

#### Scenario: Set streaming to full level
- **WHEN** a WeChat user sends `/stream full`
- **THEN** the system SHALL set `wechat_stream_level` to `full`
- **AND** reply with confirmation message: "✅ 流式推送级别已设为：全部步骤"

#### Scenario: Turn off streaming
- **WHEN** a WeChat user sends `/stream off`
- **THEN** the system SHALL set `wechat_stream_level` to `off`
- **AND** reply with confirmation message: "✅ 流式推送已关闭，仅在任务完成时发送结果"

#### Scenario: Check current streaming level
- **WHEN** a WeChat user sends `/stream`
- **THEN** the system SHALL reply with the current `wechat_stream_level` value

#### Scenario: Invalid parameter
- **WHEN** a WeChat user sends `/stream invalid_value`
- **THEN** the system SHALL reply with usage help: "用法：/stream <off|thinking|full>"

### Requirement: Stream level persisted across restarts
The `wechat_stream_level` MUST be persisted to SQLite config and restored on startup.

#### Scenario: Config survives restart
- **WHEN** the orchestrator restarts
- **THEN** the previously set `wechat_stream_level` value SHALL be restored from SQLite
