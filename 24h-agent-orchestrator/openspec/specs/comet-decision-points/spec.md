# Comet Decision Points — 决策点引擎

## ADDED Requirements

### Requirement: Decision points defined in orchestration
The system SHALL support the following decision points as defined in comet-orchestration.json: open-review, design-review, build-mode-select, verify-result, finish-branch.

#### Scenario: Decision point activates
- **WHEN** `reachDecisionPoint('open-review')` is called
- **THEN** engine.activeDecision is set with the decision prompt and options
- **THEN** broadcast to frontend with comet-state-update

### Requirement: Auto mode executes default action
In auto mode, the system SHALL automatically execute the first transition action when a decision point is reached, without user interaction.

#### Scenario: Auto resolves decision
- **WHEN** mode is 'auto' and reachDecisionPoint fires
- **THEN** the first option with 'transition:' action is executed automatically
- **THEN** activeDecision is cleared

### Requirement: Manual mode presents decision in UI
In manual mode, the system SHALL present the decision options in the HealthDashboard decision card and wait for user selection.

#### Scenario: Decision card appears
- **WHEN** mode is 'manual' and reachDecisionPoint fires
- **THEN** HealthDashboard shows a decision card with prompt and option buttons
- **THEN** no automatic action is taken

#### Scenario: User selects option
- **WHEN** user clicks "确认" on the decision card
- **THEN** `evaluateDecision({ decisionId, choice })` is called via WebSocket
- **THEN** the corresponding action is executed (e.g., transition:design)
- **THEN** activeDecision is cleared

#### Scenario: Verify result decision
- **WHEN** verify guard fails in manual mode
- **THEN** reachDecisionPoint('verify-result') is called
- **THEN** options shown: "修复" / "接受偏差" / "回滚"

### Requirement: Decision card in HealthDashboard
The HealthDashboard SHALL render a decision card in the Comet section when activeDecision is set.

#### Scenario: Decision card layout
- **WHEN** activeDecision exists
- **THEN** a card with ⚡ icon and prompt text is displayed
- **THEN** option buttons are rendered below
- **THEN** clicking a button sends WS message { type: 'comet-decision', decisionId, choice }
