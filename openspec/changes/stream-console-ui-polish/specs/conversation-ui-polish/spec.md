## ADDED Requirements

### Requirement: Thinking card auto-expand during streaming
The thinking/reasoning card SHALL be expanded automatically while streaming is in progress, and collapse only when the thinking is complete.

#### Scenario: Thinking expands during stream
- **WHEN** a thinking chunk starts receiving content via SSE
- **THEN** the thinking card SHALL be in expanded state (not collapsed)
- **AND** the user can still manually collapse it

#### Scenario: Thinking collapses when done
- **WHEN** the thinking chunk is complete (next chunk type arrives, or session.idle fires)
- **THEN** the thinking card SHALL collapse automatically

### Requirement: User prompt card styling
The user's follow-up prompt card SHALL have a light orange background and right-aligned content to visually distinguish it from AI responses.

#### Scenario: Orange background
- **WHEN** a user message card is rendered
- **THEN** its background SHALL be `#2d1f00` (dark orange)
- **AND** its border SHALL be `#664d00`

#### Scenario: Right-aligned content
- **WHEN** a user message card is rendered
- **THEN** the content SHALL be right-aligned

### Requirement: Filter repeated user prompt from AI response
When the AI starts its response by repeating the user's question, that repeated prefix SHALL be trimmed from the displayed content.

#### Scenario: Trim repeated prefix
- **WHEN** a text chunk's content starts with the last user prompt text
- **THEN** the matching prefix SHALL be removed from the displayed content
- **AND** the remaining text (AI's actual response) SHALL be shown
