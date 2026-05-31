## ADDED Requirements

### Requirement: Vitest configuration SHALL support coverage reporting
The vitest.config.ts SHALL be enhanced with coverage configuration using @vitest/coverage-v8 provider and both lcov and html reporters.

#### Scenario: Coverage config produces lcov report
- **WHEN** `vitest run --coverage` is executed
- **THEN** a coverage/lcov.info file SHALL be generated in the coverage directory

#### Scenario: Coverage config produces html report
- **WHEN** `vitest run --coverage` is executed
- **THEN** an HTML coverage report SHALL be generated in the coverage directory

### Requirement: Test setup file SHALL configure global mocks
A vitest setup file SHALL be created that configures global mocks for the opencode SDK before all tests run.

#### Scenario: SDK module is mocked globally
- **WHEN** any test imports from `@opencode-ai/node-sdk`
- **THEN** the module SHALL return a mock implementation with `createOpencode`, `ACPTokenProvider`, and `ACPSession` stubs

### Requirement: Mock factory functions SHALL be available to all tests
A `src/test-utils/factories.ts` file SHALL provide factory functions for creating mock objects used across test files.

#### Scenario: createMockClient returns a mock ACP client
- **WHEN** tests call `createMockClient()`
- **THEN** a mock object SHALL be returned with `session.create`, `session.get`, `session.abort`, `session.messages`, `session.diff`, and `global.event` methods

#### Scenario: createMockCallbacks returns mock orchestrator callbacks
- **WHEN** tests call `createMockCallbacks()`
- **THEN** a mock object SHALL be returned with `onStateUpdate`, `onTimeline`, `onStreamDelta`, `onLog` callbacks

#### Scenario: createOrchestratorWithMockClient returns configured orchestrator
- **WHEN** tests call `createOrchestratorWithMockClient()`
- **THEN** an Orchestrator instance SHALL be returned with budget and permission defaults

### Requirement: Unused mock files SHALL be removed
Legacy mock files (mockClient.ts, mockSdk.ts) that have been replaced by the factory system SHALL be deleted.

#### Scenario: Deletion does not break imports
- **WHEN** delete operations are performed
- **THEN** no remaining import in the codebase SHALL reference `mockClient` or `mockSdk`

### Requirement: Infrastructure SHALL be verified
After setup, the test infrastructure SHALL be verified by running the full test suite with coverage.

#### Scenario: Full test run with coverage succeeds
- **WHEN** `vitest run --coverage` is executed after setup
- **THEN** all existing tests SHALL pass and coverage reports SHALL be generated
