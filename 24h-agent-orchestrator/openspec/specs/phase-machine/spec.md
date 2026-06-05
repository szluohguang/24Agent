# Phase Machine — 阶段状态机集成

## ADDED Requirements

### Requirement: Phase validation during task dispatch
The system SHALL validate that a task's `cometPhase` matches the current Comet engine phase before dispatching.

#### Scenario: Phase matches
- **WHEN** a task with `cometPhase: 'design'` is dispatched
- **AND** the current engine phase is 'design'
- **THEN** dispatch proceeds normally

#### Scenario: Phase mismatch
- **WHEN** a task with `cometPhase: 'design'` is dispatched
- **AND** the current engine phase is still 'open'
- **THEN** dispatch is rejected with error: "Phase mismatch: task phase 'design' ≠ engine phase 'open'"

### Requirement: Auto phase advance on task completion
When a phase subtask completes successfully, the system SHALL automatically advance the Comet engine to the next phase.

#### Scenario: Forward advance
- **WHEN** a [open] subtask completes with status 'completed'
- **AND** the task has `cometPhase: 'open'`
- **THEN** `engine.transition('design')` is called
- **THEN** if guard passes, engine.phase becomes 'design'

#### Scenario: Verify fail triggers rollback
- **WHEN** a [verify] subtask completes with status 'failed'
- **AND** cometMode is 'auto'
- **THEN** `engine.rollbackTransition('build')` is called
- **THEN** verify and build tasks are recycled for re-dispatch

### Requirement: Rollback transition
`rollbackTransition(targetPhase)` SHALL safely revert the phase state and recycle affected tasks.

#### Scenario: Verify rolls back to build
- **WHEN** rollbackTransition('build') is called from verify
- **THEN** all tasks with cometPhase in [build, verify] are set to pending
- **THEN** their sessionIds are cleared
- **THEN** .comet.yaml phase is set back to 'build'
- **THEN** scheduler re-enqueues the tasks

### Requirement: Force transition bypasses guard
`forceTransition(targetPhase)` SHALL advance the phase without running exit guards.

#### Scenario: Admin overrides guard
- **WHEN** guard fails
- **AND** cometMode is 'manual'
- **AND** user clicks "强制推进"
- **THEN** `forceTransition('design')` is called
- **THEN** phase advances to 'design' without running guard
