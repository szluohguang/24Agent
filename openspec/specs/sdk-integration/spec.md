# sdk-integration Specification

## Purpose
TBD - created by archiving change agent-orchestrator-24h. Update Purpose after archive.
## Requirements
### Requirement: opencode SDK SHALL be initialized as a server
The system SHALL call `createOpencodeServer()` which initializes the `@opencode-ai/sdk/v2` and starts the ACP server on localhost:4096.

#### Scenario: Server starts successfully
- **WHEN** `createOpencodeServer()` is called
- **THEN** an ACP server SHALL be created and listening on port 4096

### Requirement: ACP client SHALL support session CRUD
The ACP manager SHALL provide functions to create, send prompts to, get messages from, get diffs from, and abort ACP sessions.

#### Scenario: createSubAgentSession creates a session
- **WHEN** `createSubAgentSession()` is called with a model and permission level
- **THEN** a new ACP session SHALL be created

#### Scenario: sendTaskPrompt sends prompts to a session
- **WHEN** `sendTaskPrompt()` is called with a session and prompt parts
- **THEN** the prompt SHALL be sent to the session

#### Scenario: getSessionMessages retrieves results
- **WHEN** `getSessionMessages()` is called with a session ID
- **THEN** the session messages SHALL be returned

#### Scenario: getSessionDiff retrieves changes
- **WHEN** `getSessionDiff()` is called with a session ID
- **THEN** the session diff SHALL be returned

#### Scenario: abortSession aborts a session
- **WHEN** `abortSession()` is called with a session ID
- **THEN** the session SHALL be aborted

### Requirement: Permission rulesets SHALL be configurable per level
The system SHALL support three permission levels: trusted (allow all), safe (allow with dangerous operation guards), and strict (ask on all operations).

#### Scenario: Trusted level allows all permissions
- **WHEN** `buildPermissionRuleset('trusted')` is called
- **THEN** all permissions SHALL be allowed with pattern `**`

#### Scenario: Safe level allows common operations with guards
- **WHEN** `buildPermissionRuleset('safe')` is called
- **THEN** read, edit, bash, glob, grep, list, webfetch, question SHALL be allowed
- **AND** destructive operations SHALL require approval

#### Scenario: Strict level asks on all operations
- **WHEN** `buildPermissionRuleset('strict')` is called
- **THEN** all permissions SHALL require approval

