## ADDED Requirements

### Requirement: Real-time streaming to WeChat during task execution
The system SHALL push task execution events to WeChat in real-time when `wechat_stream_level` is not `off` and `consoleToWechat` is enabled.

#### Scenario: Thinking chunk pushed at thinking level
- **WHEN** an SSE event with type `message.part.updated` and part type `reasoning` arrives for an active session
- **AND** the user's WeChat config has `wechat_stream_level` set to `thinking` or `full`
- **THEN** the system SHALL send an incremental thinking update to the user's WeChat within 500ms

#### Scenario: Tool call notification at thinking level
- **WHEN** an SSE event `session.next.tool.called` arrives
- **AND** `wechat_stream_level` is `thinking` or `full`
- **THEN** the system SHALL send a tool call notification to WeChat with tool name and key input

#### Scenario: Text delta push at full level
- **WHEN** a `session.next.text.delta` event arrives
- **AND** `wechat_stream_level` is `full`
- **THEN** the system SHALL accumulate the delta and flush to WeChat via throttled (300ms) merge

#### Scenario: Tool result summary at full level
- **WHEN** a tool result is received
- **AND** `wechat_stream_level` is `full`
- **THEN** the system SHALL send a summary of the tool result (first 200 chars) to WeChat

### Requirement: Throttled merge buffering per session
The system SHALL maintain a per-session message buffer with throttled flush to prevent message overload.

#### Scenario: Multiple deltas merged into one message
- **WHEN** multiple text deltas arrive within 300ms for the same session
- **THEN** they SHALL be merged into a single WeChat message

#### Scenario: Serialized send order per session
- **WHEN** multiple messages are queued for the same session
- **THEN** they SHALL be sent serially (one after the other completes), preserving order

### Requirement: SendTyping indicator during streaming
The system SHALL periodically call `sendTyping` to show "typing" indicator while streaming is active.

#### Scenario: Typing indicator active during task
- **WHEN** a session is actively streaming chunks to WeChat
- **THEN** the system SHALL call `sendTyping` API at least every 10 seconds during activity

### Requirement: Final result still sent on completion
When a task completes, the system SHALL still send the final comprehensive result regardless of stream level.

#### Scenario: Full result on session complete
- **WHEN** a session completes and `consoleToWechat` is enabled
- **THEN** the system SHALL flush remaining buffer
- **AND** send the final task completion message with summary, cost, and artifacts
