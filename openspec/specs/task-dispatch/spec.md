# task-dispatch Specification

## Purpose
TBD - created by archiving change agent-orchestrator-24h. Update Purpose after archive.
## Requirements
### Requirement: Orchestrator SHALL manage the full task lifecycle
The Orchestrator class SHALL support creating, dispatching, aborting, and deleting tasks with state tracking.

#### Scenario: Tasks are created with unique IDs
- **WHEN** `addTask()` is called with a description
- **THEN** a task SHALL be created with a unique ID and pending status

#### Scenario: Tasks are dispatched to ACP sessions
- **WHEN** `dispatchTask()` is called with a task ID
- **THEN** an ACP session SHALL be created and the task SHALL transition to running

#### Scenario: Tasks can be aborted
- **WHEN** `abortTask()` is called with a running task ID
- **THEN** the ACP session SHALL be aborted and the task SHALL transition to failed

#### Scenario: Tasks can be deleted
- **WHEN** `deleteTask()` is called with a task ID
- **THEN** the task SHALL be removed from memory and database

### Requirement: SSE events SHALL be subscribed and routed
The event-stream module SHALL subscribe to the global event stream from opencode and route events to appropriate handlers.

#### Scenario: Text delta events are streamed
- **WHEN** a `session.next.text.delta` SSE event is received
- **THEN** the text delta SHALL be passed to the onTextDelta handler

#### Scenario: Tool called events are recorded
- **WHEN** a `session.next.tool.called` SSE event is received
- **THEN** a timeline entry SHALL be created

#### Scenario: Session idle triggers completion
- **WHEN** a `session.idle` SSE event is received
- **THEN** the session idle handler SHALL be triggered to evaluate results

#### Scenario: Session error is handled
- **WHEN** a `session.error` or `session.next.step.failed` SSE event is received
- **THEN** the error SHALL be handled gracefully

### Requirement: Task results SHALL be evaluated on completion
The evaluator SHALL extract summary, cost, tokens, and artifacts from completed session messages and diffs.

#### Scenario: Evaluator extracts result from session
- **WHEN** a session completes and `evaluateTaskCompletion()` is called
- **THEN** the summary, cost, tokens, and changed files SHALL be extracted

### Requirement: Database SHALL persist tasks and state
A SQLite database SHALL persist tasks, agents, timeline entries, config, reviews, and schedules.

#### Scenario: Database is initialized on startup
- **WHEN** the system starts
- **THEN** the SQLite database SHALL be initialized with WAL mode and all required tables

#### Scenario: Tasks are persisted and recoverable
- **WHEN** a task is created or updated
- **THEN** its state SHALL be persisted to the database

