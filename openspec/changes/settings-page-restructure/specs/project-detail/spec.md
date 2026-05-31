## ADDED Requirements

### Requirement: Project detail page
The WebUI SHALL have a project detail page showing the project goal, description, plan, progress, and task status.

#### Scenario: View project detail
- **WHEN** the user navigates to the project detail page
- **THEN** the page SHALL display:
  - Project goal
  - Project description
  - Project plan (from project/plan.md)
  - Overall progress summary
  - Task status overview (counts per status)

### Requirement: Shared project store
The system SHALL maintain shared project files in a dedicated directory for Agent collaboration.

#### Scenario: Shared files location
- **WHEN** the project plan or progress is updated
- **THEN** the information SHALL be written to the project/ directory
- **AND** all agents SHALL read from this directory for shared context
