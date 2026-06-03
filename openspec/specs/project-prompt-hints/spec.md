## ADDED Requirements

### Requirement: Goal field placeholder text
ProjectSettings 的 goal textarea SHALL display a placeholder with writing guidance.

#### Scenario: Placeholder visible on empty goal
- **WHEN** goal field is empty and user views ProjectSettings
- **THEN** textarea SHALL display placeholder text with goal writing advice

### Requirement: Description field placeholder text
ProjectSettings 的 description textarea SHALL display a placeholder with writing guidance.

#### Scenario: Placeholder visible on empty description
- **WHEN** description field is empty and user views ProjectSettings
- **THEN** textarea SHALL display placeholder text with description writing advice

### Requirement: System prompt injection
When dispatching a task to a sub-agent, the system prompt SHALL include project goal and description if they are non-empty.

#### Scenario: Goal and description injected into system prompt
- **WHEN** a task is dispatched via sendTaskPrompt
- **AND** project goal or description is non-empty
- **THEN** the system prompt SHALL include a "## Project Context" section with goal and description

#### Scenario: No injection when both empty
- **WHEN** a task is dispatched
- **AND** both project goal and description are empty
- **THEN** the system prompt SHALL NOT include the "## Project Context" section

### Requirement: Slash command set hint
`/project goal set` and `/project desc set` commands SHALL output writing advice after successful set.

#### Scenario: Writing advice shown after goal set
- **WHEN** user runs `/project goal set <text>`
- **THEN** after confirming the goal is set, system SHALL display writing advice for goals
