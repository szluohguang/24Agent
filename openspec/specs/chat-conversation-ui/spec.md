## ADDED Requirements

### Requirement: Conversation-style message rendering
The StreamConsole SHALL render AI responses as a vertical conversation, with each message displayed as a card containing a header (AI avatar + timestamp) and body.

#### Scenario: Message card layout
- **WHEN** the AI produces a text response
- **THEN** it SHALL be rendered as a message card with:
  - AI avatar/icon on the left
  - Timestamp
  - Message body with the response text
  - A dividing line between messages

### Requirement: Thinking/reasoning collapsible section
The StreamConsole SHALL display AI reasoning/thinking content in a collapsible section, defaulting to collapsed.

#### Scenario: Thinking content collapsed by default
- **WHEN** the AI produces reasoning content
- **THEN** a collapsible section SHALL appear with a "思考" / "Thinking" label
- **AND** the section SHALL be collapsed by default, showing only the label

#### Scenario: Expand thinking content
- **WHEN** the user clicks on the collapsed thinking section
- **THEN** the reasoning content SHALL expand and become visible

### Requirement: Tool call visualization
The StreamConsole SHALL display tool calls with the tool name, parameters, and execution status.

#### Scenario: Tool call card
- **WHEN** the AI calls a tool (bash, file read, etc.)
- **THEN** a tool call card SHALL render showing:
  - Tool name in a monospace font
  - A colored status indicator (running / done / error)
  - Parameters summary

### Requirement: Final response distinction
The StreamConsole SHALL visually distinguish the final AI response from intermediate thinking and tool calls.

#### Scenario: Final response highlighted
- **WHEN** the AI produces its final text response (not reasoning)
- **THEN** it SHALL be rendered in a visually prominent style (slightly different background or border)

### Requirement: Continue prompt input
The follow-up prompt input SHALL be visible when a task with an active session is selected, regardless of the task's running/idle status.

#### Scenario: Input visible for selected session
- **WHEN** a task is selected and has a sessionId
- **THEN** the follow-up input SHALL be visible at the bottom of the StreamConsole
- **AND** the input SHALL send the prompt to the existing ACP session

#### Scenario: Follow-up appends to conversation
- **WHEN** a follow-up prompt is sent
- **THEN** the user's prompt SHALL appear as a user message card in the conversation
- **AND** the AI's response SHALL append below as a new assistant message card
