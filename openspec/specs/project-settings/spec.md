## ADDED Requirements

### Requirement: Project settings API
The server SHALL provide REST API endpoints for getting and setting project configuration.

#### Scenario: GET /api/project/config
- **WHEN** the client sends GET /api/project/config
- **THEN** the server SHALL return { directory, goal, description } as JSON

#### Scenario: PUT /api/project/config
- **WHEN** the client sends PUT /api/project/config with { directory, goal, description }
- **THEN** the server SHALL update and persist the values
- **AND** SHALL return { success: true }
