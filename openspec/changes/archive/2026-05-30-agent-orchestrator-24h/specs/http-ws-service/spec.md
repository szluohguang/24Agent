## ADDED Requirements

### Requirement: HTTP server SHALL use Fastify
The system SHALL create a Fastify HTTP server with WebSocket plugin support.

#### Scenario: Server starts on port 3000
- **WHEN** the HTTP server is started
- **THEN** it SHALL listen on port 3000

### Requirement: Server SHALL expose REST API endpoints
The server SHALL register REST API routes for task management, configuration, schedules, and human review.

#### Scenario: GET /api/state returns system state
- **WHEN** a GET request is sent to `/api/state`
- **THEN** the current workspace state SHALL be returned

#### Scenario: POST /api/task creates a task
- **WHEN** a POST request is sent to `/api/task` with task description
- **THEN** a new task SHALL be created

#### Scenario: POST /api/task/:taskId/dispatch dispatches a task
- **WHEN** a POST request is sent to `/api/task/:taskId/dispatch`
- **THEN** the task SHALL be dispatched to an ACP session

#### Scenario: POST /api/task/:taskId/abort aborts a task
- **WHEN** a POST request is sent to `/api/task/:taskId/abort`
- **THEN** the task SHALL be aborted

#### Scenario: DELETE /api/task/:taskId deletes a task
- **WHEN** a DELETE request is sent to `/api/task/:taskId`
- **THEN** the task SHALL be deleted from memory and database

#### Scenario: POST /api/config updates configuration
- **WHEN** a POST request is sent to `/api/config/permission`, `/api/config/budget`, or `/api/config/parallel`
- **THEN** the corresponding configuration SHALL be updated

#### Scenario: CRUD for /api/schedule exists
- **WHEN** GET, POST, PUT, DELETE requests are sent to `/api/schedule`
- **THEN** schedules SHALL be listed, created, updated, and deleted

#### Scenario: Review endpoints exist
- **WHEN** POST requests are sent to `/api/task/:taskId/approve` and `/api/task/:taskId/reject`
- **THEN** tasks SHALL be approved or rejected

#### Scenario: GET /api/tasks/awaiting-review returns review queue
- **WHEN** a GET request is sent to `/api/tasks/awaiting-review`
- **THEN** all tasks awaiting human review SHALL be returned

### Requirement: Server SHALL support WebSocket connections
The server SHALL expose a `/ws` WebSocket endpoint for real-time bidirectional communication with the WebUI.

#### Scenario: Clients connect to /ws endpoint
- **WHEN** a WebSocket client connects to `/ws`
- **THEN** the server SHALL send the full state snapshot

#### Scenario: Client messages trigger orchestrator actions
- **WHEN** a client sends a JSON message with type `create-task`, `dispatch-task`, `abort-task`, or `delete-task`
- **THEN** the corresponding orchestrator method SHALL be invoked

#### Scenario: Broadcast sends updates to all clients
- **WHEN** the system state changes
- **THEN** state updates, timeline entries, stream deltas, and agent state changes SHALL be broadcast to all connected WebSocket clients

### Requirement: Server SHALL serve the WebUI
The server SHALL serve static files from the webui/dist directory and provide SPA fallback.

#### Scenario: SPA fallback works
- **WHEN** a GET request is sent to an unknown frontend route
- **THEN** index.html SHALL be served
