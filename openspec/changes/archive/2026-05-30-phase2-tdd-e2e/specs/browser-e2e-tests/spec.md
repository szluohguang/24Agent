## ADDED Requirements

### Requirement: Playwright E2E test infrastructure SHALL be configured
A Playwright configuration file SHALL be created for the WebUI E2E tests with Chromium, zh-CN locale, and a webServer pointing to a dedicated test server.

#### Scenario: Config targets chromium with zh-CN locale
- **WHEN** Playwright runs the E2E tests
- **THEN** it SHALL launch Chromium with locale set to `zh-CN`

#### Scenario: Config starts test server before tests
- **WHEN** Playwright starts
- **THEN** it SHALL start the test server via webServer configuration

### Requirement: Test server SHALL support E2E testing
A lightweight test server SHALL be created that uses a mock client instead of a real opencode connection for deterministic testing.

#### Scenario: Test server uses mock client
- **WHEN** the test server starts
- **THEN** it SHALL use a mock ACP client instead of connecting to real opencode

#### Scenario: Test server returns mock responses
- **WHEN** the WebUI sends requests to the test server
- **THEN** the server SHALL return appropriate mock responses for all API endpoints

### Requirement: App E2E tests SHALL verify basic rendering
The E2E tests SHALL verify that the WebUI loads correctly with all core UI elements.

#### Scenario: Page loads successfully
- **WHEN** the WebUI page is loaded
- **THEN** the page SHALL render without errors

#### Scenario: Empty state is displayed initially
- **WHEN** the WebUI loads with no tasks
- **THEN** an empty state message SHALL be displayed

#### Scenario: Language switch button exists
- **WHEN** the WebUI loads
- **THEN** a language switch button SHALL be visible

#### Scenario: Permission selector exists
- **WHEN** the WebUI loads
- **THEN** a permission level selector SHALL be visible

#### Scenario: Input field exists
- **WHEN** the WebUI loads
- **THEN** a task input field SHALL be visible

#### Scenario: Tab buttons exist
- **WHEN** the WebUI loads
- **THEN** tab navigation buttons SHALL be visible

#### Scenario: Connection status is displayed
- **WHEN** the WebUI loads
- **THEN** a connection status indicator SHALL be visible

### Requirement: i18n E2E tests SHALL verify language switching
The E2E tests SHALL verify that the language switching feature works correctly.

#### Scenario: Default language is Chinese
- **WHEN** the WebUI loads without a stored locale preference
- **THEN** the UI text SHALL be displayed in Chinese

#### Scenario: Switch to English works
- **WHEN** the user clicks the language switch button to select English
- **THEN** all UI text SHALL switch to English

#### Scenario: Switch back and forth works
- **WHEN** the user switches from Chinese to English and back to Chinese
- **THEN** the UI text SHALL correctly reflect each language change
