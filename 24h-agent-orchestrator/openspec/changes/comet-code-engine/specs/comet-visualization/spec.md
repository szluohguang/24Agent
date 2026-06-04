# Comet Visualization — 右侧面板可视化

## ADDED Requirements

### Requirement: State machine flow display
The HealthDashboard SHALL display a vertical state machine flow showing all 5 phases (open/design/build/verify/archive) with status icons and connection lines.

#### Scenario: Five phase nodes
- **WHEN** cometState has active phases
- **THEN** HealthDashboard renders 5 phase nodes in order
- **THEN** each node shows: status icon (✓/●/○), phase name (Chinese), status text
- **THEN** each node shows the corresponding skill command (/comet-open, etc.)
- **THEN** connection lines between nodes show guard pass/fail state

#### Scenario: Active phase highlighted
- **WHEN** phase 'design' is active
- **THEN** the design node shows blue highlight background
- **THEN** completed phases (open) show green
- **THEN** pending phases (build, verify, archive) show gray

### Requirement: Guard status display
The HealthDashboard SHALL display the current guard status with color and Chinese text.

#### Scenario: Guard passed
- **WHEN** guard completes successfully
- **THEN** displays "✓ 通过" in green

#### Scenario: Guard failed
- **WHEN** guard fails
- **THEN** displays "✗ 失败" in red
- **THEN** displays the guardOutput error message below

#### Scenario: Guard running
- **WHEN** guard is executing
- **THEN** displays "⟳ 执行中" in blue

### Requirement: Phase task count badges
The HealthDashboard SHALL show the number of tasks per phase as compact badges.

#### Scenario: Tasks per phase
- **WHEN** there are 2 tasks with cometPhase 'open'
- **THEN** displays badge "开启:2"
- **THEN** active phase badge is highlighted

### Requirement: Comet mode indicator
The HealthDashboard SHALL display the current comet mode (auto/manual) next to the Comet section header.

#### Scenario: Auto mode
- **WHEN** cometMode is 'auto'
- **THEN** shows [auto] badge in green

#### Scenario: Manual mode
- **WHEN** cometMode is 'manual'
- **THEN** shows [manual] badge in yellow
