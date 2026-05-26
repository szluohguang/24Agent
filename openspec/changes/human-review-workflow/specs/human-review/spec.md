## ADDED Requirements

### Requirement: Task enters awaiting_review state after strict-mode execution
When a task is executed under `strict` permission level and the Agent completes execution (session becomes idle), the system SHALL set the task status to `awaiting_review` instead of `completed`. The evaluation result (summary, cost, tokens, artifacts) SHALL be stored with the task for the review panel to display.

#### Scenario: strict mode task completes into awaiting_review
- **WHEN** a task with permission level `strict` finishes Agent execution
- **THEN** the task status SHALL be `awaiting_review`
- **AND** the evaluation result SHALL be stored and accessible
- **AND** a timeline entry of type `awaiting-review` SHALL be recorded

#### Scenario: trusted/safe mode task completes normally
- **WHEN** a task with permission level `trusted` or `safe` finishes Agent execution
- **THEN** the task status SHALL be `completed` (existing behavior unchanged)

### Requirement: User can approve a task
The system SHALL provide an API and WebSocket endpoint to approve an `awaiting_review` task. Upon approval, the task status SHALL change to `completed`. An optional feedback message MAY be attached to the approval.

#### Scenario: Approve a task via REST API
- **WHEN** a POST request is sent to `/api/task/:taskId/approve` with an optional `feedback` field
- **THEN** the task status SHALL change to `completed`
- **AND** a timeline entry of type `review-approved` SHALL be recorded

#### Scenario: Approve non-existent task returns 404
- **WHEN** a POST request is sent to `/api/task/:taskId/approve` for a non-existent task ID
- **THEN** the response SHALL be HTTP 404

#### Scenario: Approve a task that is not awaiting_review returns 409
- **WHEN** a POST request is sent to `/api/task/:taskId/approve` for a task that is not in `awaiting_review` status
- **THEN** the response SHALL be HTTP 409 Conflict

### Requirement: User can reject a task with feedback
The system SHALL provide an API and WebSocket endpoint to reject an `awaiting_review` task. Rejection SHALL require a `feedback` string. Upon rejection, the task status SHALL change to `rejected`.

#### Scenario: Reject a task via REST API
- **WHEN** a POST request is sent to `/api/task/:taskId/reject` with a `feedback` field
- **THEN** the task status SHALL change to `rejected`
- **AND** a timeline entry of type `review-rejected` SHALL be recorded with the feedback text

#### Scenario: Reject without feedback returns 400
- **WHEN** a POST request is sent to `/api/task/:taskId/reject` without a `feedback` field
- **THEN** the response SHALL be HTTP 400 Bad Request

### Requirement: Rejected tasks can be re-dispatched with feedback context
When a `rejected` task is re-dispatched, the system SHALL automatically inject the rejection feedback into the Agent's prompt as context. The feedback SHALL be clearly marked as "前次执行反馈" so the Agent understands it should address the feedback.

#### Scenario: Re-dispatch rejected task includes feedback in prompt
- **WHEN** a task in `rejected` status is dispatched
- **THEN** the prompt sent to the Agent SHALL include the rejection feedback as context
- **AND** the task status SHALL be set to `running`

### Requirement: System provides task review list
The system SHALL provide an API endpoint to list all tasks currently in `awaiting_review` status, including their evaluation results (summary, cost, tokens, artifacts).

#### Scenario: List awaiting review tasks
- **WHEN** a GET request is sent to `/api/tasks/awaiting-review`
- **THEN** the response SHALL include all tasks with status `awaiting_review`
- **AND** each task SHALL include its evaluation summary, cost, and artifact list

### Requirement: WebUI review panel
The WebUI SHALL display a review panel when a task in `awaiting_review` status is selected. The panel SHALL show the task description, execution summary, cost, token usage, and changed files. The panel SHALL provide "Approve" and "Reject" buttons. The "Reject" button SHALL open a feedback text input.

#### Scenario: Review panel shows for awaiting_review task
- **WHEN** a user selects a task with `awaiting_review` status in the TreeView
- **THEN** the review panel SHALL be visible in the middle column below the StreamConsole
- **AND** it SHALL display the task description, execution summary, cost, and file changes
- **AND** it SHALL show "Approve" button and "Reject with Feedback" button

#### Scenario: Approve from WebUI
- **WHEN** user clicks "Approve" in the review panel
- **THEN** an `approve-task` WebSocket message SHALL be sent
- **AND** the task status SHALL update to `completed`
- **AND** the review panel SHALL close

#### Scenario: Reject with feedback from WebUI
- **WHEN** user clicks "Reject with Feedback", enters feedback text, and confirms
- **THEN** a `reject-task` WebSocket message SHALL be sent with the feedback
- **AND** the task status SHALL update to `rejected`
- **AND** the review panel SHALL close

### Requirement: Review history is viewable
The system SHALL provide an API endpoint to retrieve review history for a specific task, including all approve/reject actions with timestamps and feedback.

#### Scenario: Get review history
- **WHEN** a GET request is sent to `/api/task/:taskId/review-history`
- **THEN** the response SHALL include all review actions for that task
- **AND** each entry SHALL include action type, feedback (if any), reviewer, and timestamp
