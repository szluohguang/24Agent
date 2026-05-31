# backend-unit-tests Specification

## Purpose
TBD - created by archiving change phase2-tdd-e2e. Update Purpose after archive.
## Requirements
### Requirement: Orchestrator core module SHALL have unit tests
The `src/orchestrator/core.ts` module SHALL have comprehensive unit tests covering all public methods and edge cases.

#### Scenario: addTask creates tasks correctly
- **WHEN** `addTask()` is called with valid parameters
- **THEN** a new task SHALL be created with a unique ID
- **AND** the task SHALL have the specified dependencies if provided
- **AND** a timeline entry SHALL be recorded

#### Scenario: addTask handles edge cases
- **WHEN** `addTask()` is called
- **THEN** it SHALL return a unique ID for each call
- **AND** it SHALL record a timeline entry on creation

#### Scenario: dispatchTask dispatches valid tasks
- **WHEN** `dispatchTask()` is called with an existing task ID
- **THEN** the task SHALL be dispatched to the ACP manager

#### Scenario: dispatchTask returns error for non-existent task
- **WHEN** `dispatchTask()` is called with a non-existent task ID
- **THEN** it SHALL throw or return an error indicating the task was not found

#### Scenario: dispatchTask enforces budget limits
- **WHEN** `dispatchTask()` is called and the budget limit has been reached
- **THEN** the dispatch SHALL be rejected with a budget limit error

#### Scenario: abortTask aborts running tasks
- **WHEN** `abortTask()` is called with an existing task ID that is running
- **THEN** the task SHALL be aborted and its session cleaned up

#### Scenario: abortTask handles non-existent task
- **WHEN** `abortTask()` is called with a non-existent task ID
- **THEN** it SHALL throw or return an error

#### Scenario: abortTask handles task without session
- **WHEN** `abortTask()` is called on a task that has no active session
- **THEN** it SHALL handle the case gracefully without errors

#### Scenario: getState returns current system state
- **WHEN** `getState()` is called with no tasks
- **THEN** it SHALL return an empty state object
- **WHEN** called with tasks present
- **THEN** it SHALL return the state including all tasks

#### Scenario: configuration methods return correct values
- **WHEN** `getPermissionLevel()` is called
- **THEN** it SHALL return the configured permission level
- **WHEN** `getBudget()` is called
- **THEN** it SHALL return the configured budget
- **WHEN** `getMaxParallel()` is called
- **THEN** it SHALL return the configured parallel task limit

#### Scenario: session lifecycle transitions correctly
- **WHEN** a session completes in idle state
- **THEN** the task SHALL transition to completed status
- **WHEN** a session encounters an error
- **THEN** the task SHALL retry according to retry policy
- **WHEN** max retries are exceeded
- **THEN** the task SHALL transition to failed status

### Requirement: ACP manager module SHALL have unit tests
The `src/orchestrator/acp-manager.ts` module SHALL have unit tests covering permission ruleset building, session management, and prompt sending.

#### Scenario: buildPermissionRuleset returns correct rules per level
- **WHEN** `buildPermissionRuleset()` is called with `trusted`
- **THEN** it SHALL return permissive rules
- **WHEN** called with `safe`
- **THEN** it SHALL return restricted rules
- **WHEN** called with `strict`
- **THEN** it SHALL return the most restrictive rules

#### Scenario: createSubAgentSession creates sessions
- **WHEN** `createSubAgentSession()` is called with valid parameters
- **THEN** it SHALL return a session object with a sessionId
- **AND** it SHALL handle data without wrapping when already a Data object

#### Scenario: sendTaskPrompt sends prompt to session
- **WHEN** `sendTaskPrompt()` is called with a session and prompt text
- **THEN** it SHALL send the prompt to the session

#### Scenario: getSessionMessages retrieves messages
- **WHEN** `getSessionMessages()` is called with a session ID
- **THEN** it SHALL return the messages for that session
- **AND** it SHALL unwrap Data objects if present

#### Scenario: getSessionDiff retrieves diffs
- **WHEN** `getSessionDiff()` is called with a session ID
- **THEN** it SHALL return the diff for that session

#### Scenario: abortSession aborts a running session
- **WHEN** `abortSession()` is called with a session ID
- **THEN** the session SHALL be aborted

#### Scenario: createOpencodeServer creates a server instance
- **WHEN** `createOpencodeServer()` is called
- **THEN** it SHALL return a server instance

### Requirement: Event stream module SHALL have unit tests
The `src/observer/event-stream.ts` module SHALL have unit tests covering event routing, timeline recording, and error handling.

#### Scenario: Text delta events are routed correctly
- **WHEN** a text delta event is received
- **THEN** it SHALL be routed to the stream delta callback

#### Scenario: Tool called events create timeline entries
- **WHEN** a tool called event is received
- **THEN** a timeline entry SHALL be created

#### Scenario: Shell started events create timeline entries
- **WHEN** a shell started event is received
- **THEN** a timeline entry SHALL be created

#### Scenario: Shell ended events are processed
- **WHEN** a shell ended event is received
- **THEN** the event SHALL be processed without errors

#### Scenario: Session idle events trigger completion
- **WHEN** a session idle event is received
- **THEN** the idle handler SHALL be triggered

#### Scenario: Session error events are handled
- **WHEN** a session error event is received
- **THEN** the error SHALL be handled and propagated

#### Scenario: session.next.step.failed events are handled
- **WHEN** a session.next.step.failed event is received
- **THEN** the error SHALL be routed to the error handler

#### Scenario: AbortSignal stops event processing
- **WHEN** the AbortSignal is triggered during event processing
- **THEN** event processing SHALL stop cleanly

#### Scenario: Empty payloads are skipped
- **WHEN** an event with an empty or null payload is received
- **THEN** the event SHALL be silently skipped

### Requirement: Evaluator module SHALL have unit tests
The `src/observer/evaluator.ts` module SHALL have unit tests covering extraction of summaries, costs, tokens, and artifacts.

#### Scenario: Evaluator extracts summary, cost, and tokens
- **WHEN** messages contain a result with summary, cost, and token fields
- **THEN** the evaluator SHALL extract and return these values

#### Scenario: Evaluator extracts artifacts
- **WHEN** messages contain result artifacts
- **THEN** the evaluator SHALL extract and return the artifact list

#### Scenario: Evaluator returns empty values for no assistant messages
- **WHEN** there are no assistant messages in the conversation
- **THEN** the evaluator SHALL return empty/zero values

#### Scenario: Evaluator handles Data wrapping
- **WHEN** messages are wrapped in Data objects
- **THEN** the evaluator SHALL unwrap and process them correctly

#### Scenario: Evaluator tolerates non-object summary
- **WHEN** the summary field is not an object
- **THEN** the evaluator SHALL handle it without throwing an error

### Requirement: WebSocket module SHALL have unit tests
The `src/server/websocket.ts` module SHALL have unit tests covering broadcast callbacks, timeline broadcasting, and stream delta broadcasting.

#### Scenario: Broadcast callback structure is correct
- **WHEN** data is broadcast to WebSocket clients
- **THEN** the broadcast callback SHALL have the correct structure with client iteration

#### Scenario: Broadcast with no clients does not throw
- **WHEN** broadcast is called with an empty client set
- **THEN** it SHALL NOT throw an exception

#### Scenario: Timeline entries are broadcast
- **WHEN** a timeline entry is created
- **THEN** it SHALL be broadcast to all connected clients

#### Scenario: Stream deltas are broadcast
- **WHEN** a stream delta event is received
- **THEN** it SHALL be broadcast to all connected clients

#### Scenario: Agent state updates are broadcast
- **WHEN** an agent state change occurs
- **THEN** the new state SHALL be broadcast to all clients

#### Scenario: State updates are broadcast
- **WHEN** the system state changes
- **THEN** the updated state SHALL be broadcast to all clients

### Requirement: HTTP API tests SHALL be enhanced
The existing `src/server/__tests__/http.test.ts` SHALL be enhanced with comprehensive API endpoint testing.

#### Scenario: GET / returns index page
- **WHEN** a GET request is sent to `/`
- **THEN** the response SHALL be 200 with the index page

#### Scenario: GET /health returns health status
- **WHEN** a GET request is sent to `/health`
- **THEN** the response SHALL be 200 with health information

#### Scenario: GET /api/state returns system state
- **WHEN** a GET request is sent to `/api/state`
- **THEN** the response SHALL be 200 with the current system state

#### Scenario: SPA fallback serves index.html
- **WHEN** a GET request is sent to an unknown route
- **THEN** the response SHALL serve the SPA index.html

#### Scenario: POST /api/task creates a new task
- **WHEN** a POST request is sent to `/api/task` with valid body
- **THEN** the response SHALL be 201 with the created task

#### Scenario: POST /api/task rejects invalid body
- **WHEN** a POST request is sent to `/api/task` with invalid body
- **THEN** the response SHALL be 400

#### Scenario: POST /api/task/:taskId/dispatch dispatches an existing task
- **WHEN** a POST request is sent to `/api/task/:taskId/dispatch` for an existing task
- **THEN** the response SHALL be 200
- **WHEN** sent for a non-existent task
- **THEN** the response SHALL be 404

#### Scenario: POST /api/task/:taskId/abort aborts a task
- **WHEN** a POST request is sent to `/api/task/:taskId/abort` for an existing task
- **THEN** the response SHALL be 200

#### Scenario: POST /api/config updates configuration
- **WHEN** a POST request is sent to `/api/config` with permission, budget, or parallel settings
- **THEN** the configuration SHALL be updated and return 200

