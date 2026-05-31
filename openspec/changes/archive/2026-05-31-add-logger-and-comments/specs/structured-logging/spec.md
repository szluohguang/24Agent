## ADDED Requirements

### Requirement: Logger structed logging
The system SHALL provide a Logger class supporting 4 log levels (DEBUG/INFO/WARN/ERROR), file output, and debug/production mode switching.

#### Scenario: Logger writes to both console and file
- **WHEN** Logger.info() is called
- **THEN** the message appears on stdout AND is appended to the daily log file

#### Scenario: Production mode filters debug logs
- **WHEN** NODE_ENV=production and a DEBUG-level call is made
- **THEN** no output is produced

#### Scenario: Production mode allows core-tagged info logs
- **WHEN** NODE_ENV=production and Logger.info('task-create', '...') is called
- **THEN** the message appears on stdout AND is written to the log file

#### Scenario: Production mode filters non-core info logs
- **WHEN** NODE_ENV=production and Logger.info('heartbeat', '...') is called
- **THEN** no output is produced

#### Scenario: Error logs always output regardless of mode
- **WHEN** NODE_ENV=production and Logger.error('...') is called
- **THEN** the message appears on stderr AND is written to the log file

#### Scenario: Logger creates daily log files
- **WHEN** Logger is initialized
- **THEN** it creates or appends to `logs/orchestrator-YYYY-MM-DD.log`

#### Scenario: Logger can be reset for testing
- **WHEN** Logger.resetInstance() is called
- **THEN** the previous file stream is closed and a new Logger is created

### Requirement: Source file comments
All core source files SHALL have Chinese comments explaining key logic blocks.

#### Scenario: Comments cover intent
- **WHEN** reading any core source file
- **THEN** each non-trivial class/method/block has a Chinese comment explaining its purpose

### Requirement: Console call replacement
All `console.log/warn/error` calls in source files SHALL be replaced with Logger instance calls.

#### Scenario: No console calls remain
- **WHEN** searching for `console.log`, `console.warn`, `console.error` in source files
- **THEN** no matches are found in the `src/` directory (excluding tests and third-party code)
