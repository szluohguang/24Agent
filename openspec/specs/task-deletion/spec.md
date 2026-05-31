# task-deletion Specification

## Purpose
TBD - created by archiving change add-task-deletion. Update Purpose after archive.
## Requirements
### Requirement: User can delete a task via REST API
The system SHALL provide a `DELETE /api/task/:taskId` endpoint that removes the task and its associated Agent data from memory and database.

#### Scenario: Delete existing task returns 200
- **WHEN** a DELETE request is sent to `/api/task/:taskId` for an existing task
- **THEN** the task SHALL be removed from the in-memory task map
- **AND** the task SHALL be deleted from the SQLite database
- **AND** any associated Agent session SHALL be cleaned up

#### Scenario: Delete non-existent task is silent
- **WHEN** a DELETE request is sent to `/api/task/:taskId` for a task that does not exist
- **THEN** the response SHALL be 200

### Requirement: User can delete a task via WebSocket
The system SHALL support a `delete-task` WebSocket message type that triggers task deletion.

#### Scenario: Delete task via WebSocket
- **WHEN** a client sends `{ type: 'delete-task', taskId: '...' }` via WebSocket
- **THEN** the task SHALL be deleted
- **AND** the server SHALL respond with `{ type: 'task-deleted', taskId: '...' }`

### Requirement: WebUI shows Delete button for terminal-state tasks
The TreeView component SHALL display a "Delete" button for tasks in `completed`, `failed`, `rejected`, and `awaiting_review` states. Running and pending tasks SHALL NOT show the Delete button.

#### Scenario: Delete button visible for completed task
- **WHEN** a task has status `completed`
- **THEN** a "Delete" button SHALL be visible on that task row

#### Scenario: Delete button NOT visible for running task
- **WHEN** a task has status `running`
- **THEN** there SHALL NOT be a "Delete" button on that task row

### Requirement: Task deletion is recorded in timeline
When a task is deleted, the system SHALL record a timeline entry with type `task-delete`.

#### Scenario: Delete creates timeline entry
- **WHEN** a task is deleted
- **THEN** a timeline entry with type `task-delete` SHALL be recorded
- **AND** the message SHALL include the deleted task's description

