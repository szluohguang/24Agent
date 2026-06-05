# Code Guards — 代码门禁引擎

## ADDED Requirements

### Requirement: Exit guards run before phase transition
The system SHALL run the appropriate exit guard before advancing to the next phase. Each phase has a corresponding TypeScript guard function.

#### Scenario: Successful guard passes
- **WHEN** a phase subtask completes and `engine.transition(nextPhase)` is called
- **THEN** `CodeGuards.checkExit(currentPhase)` runs the corresponding guard
- **THEN** if all checks pass, guard returns `{ success: true }` and phase advances

#### Scenario: Guard fails blocks transition
- **WHEN** a guard check fails (e.g., missing file)
- **THEN** guard returns `{ success: false, message: "..." }`
- **THEN** transition is rejected, phase stays at current
- **THEN** engine.guardStatus is set to 'failed'
- **THEN** engine.guardOutput contains the error message

### Requirement: Entry guards validate preconditions
The system SHALL run entry guards when a phase is entered, to validate that all preconditions are met.

#### Scenario: Entry guard passes
- **WHEN** phase transitions from open to design
- **THEN** entry guard for design runs (proposal.md exists)
- **THEN** if pass, phase becomes active

#### Scenario: Entry guard fails
- **WHEN** entry guard fails on phase enter
- **THEN** phase stays at previous, error broadcasted

### Requirement: Open exit guard validates artifacts
`checkOpenExit()` SHALL verify that `proposal.md`, `design.md`, and `tasks.md` exist and are non-empty in the change directory.

#### Scenario: All artifacts exist
- **WHEN** open-exit guard runs
- **THEN** it checks proposal.md, design.md, tasks.md exist
- **THEN** it checks each file is non-empty
- **THEN** if all pass, returns success

#### Scenario: Missing artifact blocks
- **WHEN** proposal.md is missing
- **THEN** guard returns `{ success: false, message: "proposal.md is missing" }`

### Requirement: Build exit guard validates completion
`checkBuildExit()` SHALL verify that isolation and build_mode are set in .comet.yaml, and all tasks in tasks.md are completed.

#### Scenario: All tasks done
- **WHEN** build-exit guard runs with all tasks marked `[x]`
- **THEN** guard checks isolation and build_mode are set
- **THEN** guard verifies no `[ ]` tasks remain
- **THEN** returns success

#### Scenario: Pending tasks block
- **WHEN** there are unfinished tasks `[ ]`
- **THEN** guard returns list of pending tasks

### Requirement: Verify exit guard validates report
`checkVerifyExit()` SHALL verify that verify_result is set, verification_report exists, and branch_status is handled.

#### Scenario: Complete verification
- **WHEN** verify-exit guard runs with all fields set
- **THEN** checks verify_result !== 'pending'
- **THEN** checks verification_report file exists
- **THEN** checks branch_status === 'handled'
- **THEN** returns success

### Requirement: Archive exit has no guard
`checkArchiveExit()` SHALL always return success since archive is the final phase.

#### Scenario: Always passes
- **WHEN** archive-exit guard runs
- **THEN** returns `{ success: true }`
