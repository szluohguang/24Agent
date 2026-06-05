# Comet Mode — 双模式支持

## ADDED Requirements

### Requirement: Comet mode storage
The system SHALL store the comet mode in the `config` table with key `comet_mode`, supporting values 'auto' and 'manual'.

#### Scenario: Default is auto
- **WHEN** no comet_mode is configured
- **THEN** the default value is 'auto'

#### Scenario: Mode persisted across restarts
- **WHEN** user sets mode to 'manual'
- **THEN** value is stored in SQLite config table
- **THEN** after server restart, mode is loaded from config

### Requirement: Mode API endpoint
The system SHALL provide a REST API endpoint to get and set the comet mode.

#### Scenario: GET comet mode
- **WHEN** GET /api/config/comet-mode is called
- **THEN** returns `{ mode: 'auto' }`

#### Scenario: SET comet mode
- **WHEN** POST /api/config/comet-mode with body `{ mode: 'manual' }`
- **THEN** config table is updated
- **THEN** orchestrator.cometMode is updated at runtime (no restart needed)

### Requirement: Mode affects guard failure behavior
When a guard fails, the mode SHALL determine the next action: auto recycles the task, manual pushes error to UI for user decision.

#### Scenario: Auto mode on guard failure
- **WHEN** guard fails in auto mode
- **THEN** task status is set back to 'pending'
- **THEN** scheduler re-enqueues the task for retry

#### Scenario: Manual mode on guard failure
- **WHEN** guard fails in manual mode
- **THEN** engine.guardStatus is set to 'failed'
- **THEN** error is broadcast to frontend
- **THEN** user decides to retry, force, or rollback

### Requirement: Settings page mode selector
The SettingsPage SHALL provide a Comet Mode selector with radio buttons.

#### Scenario: Selector renders
- **WHEN** user opens Settings page
- **THEN** shows "执行模式" section
- **THEN** two radio buttons: "全自动" / "人工干预"
- **THEN** current mode is pre-selected

#### Scenario: Mode change takes effect immediately
- **WHEN** user switches from auto to manual
- **THEN** POST /api/config/comet-mode is called
- **THEN** HealthDashboard updates mode badge instantly
