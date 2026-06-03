## ADDED Requirements

### Requirement: Task list split by status
The TreeView SHALL split the task list into two sections: active tasks at the top and completed tasks at the bottom.

#### Scenario: Active section
- **WHEN** there are tasks with status pending, running, awaiting_review, queued, retrying, or scheduled
- **THEN** they SHALL be displayed in the top section labeled "进行中" / "Active"

#### Scenario: Completed section
- **WHEN** there are tasks with status completed, failed, or rejected
- **THEN** they SHALL be displayed in the bottom section labeled "已结束" / "Completed"

#### Scenario: Empty active section
- **WHEN** there are no active tasks
- **THEN** the active section SHALL display an empty state message

#### Scenario: Task re-activation
- **WHEN** a completed task's status changes to pending, running, etc. (e.g., via retry)
- **THEN** it SHALL automatically move from the completed section to the active section

### Requirement: Draggable divider
The divider between the two sections SHALL be draggable to resize the two areas.

#### Scenario: Drag to resize
- **WHEN** the user drags the divider up or down
- **THEN** the sizes of the active and completed sections SHALL adjust accordingly
- **AND** the divider SHALL show a grab cursor on hover

#### Scenario: Minimum size
- **WHEN** dragging would make either section too small
- **THEN** the divider SHALL stop at a minimum section height of 60px

### Requirement: Dependency tree collapsible
Tasks that have dependencies SHALL show their child tasks in a collapsible tree structure, default collapsed.

#### Scenario: Tree collapsed by default
- **WHEN** a task has dependsOn entries
- **THEN** its dependent tasks SHALL be indented and hidden behind a collapse toggle
- **AND** the toggle SHALL default to collapsed state

#### Scenario: Expand to show children
- **WHEN** the user clicks the expand toggle on a parent task
- **THEN** the dependent child tasks SHALL become visible indented below the parent

### Requirement: Console placeholder
The StreamConsole SHALL show a contextual placeholder message: "请选择任务" when no task is selected, and session information when a task is selected.

#### Scenario: No task selected
- **WHEN** no task is selected in the TreeView
- **THEN** the StreamConsole SHALL display "请选择任务" / "Select a task"

#### Scenario: Task selected with session
- **WHEN** a task with an active session is selected
- **THEN** the StreamConsole SHALL display the session's content
