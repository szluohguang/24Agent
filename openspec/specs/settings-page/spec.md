## ADDED Requirements

### Requirement: Settings as page
The settings SHALL be a full page instead of a modal overlay, accessible via a navigation tab.

#### Scenario: Navigate to settings
- **WHEN** the user clicks the gear icon
- **THEN** the main content area SHALL switch to the settings page
- **AND** the settings page SHALL have a left-right layout

#### Scenario: Left-right layout
- **WHEN** the settings page is open
- **THEN** the left sidebar SHALL list setting categories (Schedule / History / Webhook / Config / Project)
- **AND** the right content area SHALL show the selected category's form

### Requirement: Project settings
The settings page SHALL have a "Project" category for managing project metadata.

#### Scenario: View project settings
- **WHEN** the user selects "Project" in the settings sidebar
- **THEN** the right panel SHALL show forms for: project directory, project goal, project description

#### Scenario: Edit project settings
- **WHEN** the user edits any field and clicks "Save"
- **THEN** the value SHALL be saved via REST API
- **AND** a success message SHALL be shown
