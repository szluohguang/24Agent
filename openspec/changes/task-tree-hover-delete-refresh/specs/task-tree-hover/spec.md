## ADDED Requirements

### Requirement: Delete button available for all tasks
All task items in the TreeView SHALL have a delete button regardless of task status. The button SHALL be placed at the rightmost side of the action bar.

#### Scenario: Delete button visible on all tasks
- **WHEN** any task is displayed in the task list
- **THEN** a delete button SHALL be visible in its action bar
- **AND** the delete button SHALL be right-aligned (rightmost position)

### Requirement: Task item hover — border only
The task item on mouse hover SHALL only change its border color, NOT its background, to visually distinguish hover from selected state.

#### Scenario: Hover highlights border only
- **WHEN** the user moves the mouse over a task item
- **THEN** the task item's border SHALL change to `#58a6ff`
- **AND** the background SHALL remain unchanged
- **AND** the change SHALL use smooth transition (`transition: border-color 0.15s`)

#### Scenario: Hover exits
- **WHEN** the user moves the mouse out of a task item
- **THEN** the border SHALL revert to default (`#30363d`) or to selected state (`#58a6ff`)

### Requirement: All action buttons hover highlight
All action buttons (Dispatch, Abort, Delete) SHALL have hover effects. The highlight SHALL be border-only, without changing background or text color.

#### Scenario: Dispatch button hover
- **WHEN** the user hovers over a Dispatch button
- **THEN** the button's border SHALL change to `#3fb950` (green)

#### Scenario: Abort button hover
- **WHEN** the user hovers over an Abort button
- **THEN** the button's border SHALL change to `#f85149` (red)

#### Scenario: Delete button hover
- **WHEN** the user hovers over a Delete button
- **THEN** the button's border SHALL change to `#da3633` (red)

### Requirement: Delete confirmation for running tasks
When the user clicks the delete button on a task that is currently running, a confirmation dialog SHALL appear before proceeding.

#### Scenario: Running task deletion confirmation
- **WHEN** the user clicks the delete button on a running task
- **THEN** a confirmation dialog SHALL appear with the message "该任务正在执行中，确认停止并删除？"
- **AND** clicking "确认" SHALL abort the task then delete it
- **AND** clicking "取消" SHALL close the dialog without action

### Requirement: Task list refresh on delete
The WebUI SHALL immediately remove a deleted task from the displayed list.

#### Scenario: Task removed on delete confirmaiton
- **WHEN** the user clicks the delete button
- **AND** the server confirms via `task-deleted` message
- **THEN** the task SHALL be immediately removed from the displayed list
- **AND** selection SHALL be cleared if the deleted task was selected
