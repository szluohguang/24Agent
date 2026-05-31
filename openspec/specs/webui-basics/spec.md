# webui-basics Specification

## Purpose
TBD - created by archiving change agent-orchestrator-24h. Update Purpose after archive.
## Requirements
### Requirement: WebUI SHALL be a React application with Vite
The frontend SHALL be built with React, TypeScript, and Vite.

#### Scenario: Dev server runs on port 5173
- **WHEN** the Vite dev server starts
- **THEN** it SHALL listen on port 5173
- **AND** SHALL proxy `/api` and `/ws` to the backend

### Requirement: WebUI SHALL connect to backend via WebSocket
The useWebSocket hook SHALL provide an auto-reconnecting WebSocket connection to the backend.

#### Scenario: Hook provides connection state
- **WHEN** `useWebSocket()` is called
- **THEN** it SHALL return connected state, lastMessage, and send function

#### Scenario: Auto-reconnect on disconnect
- **WHEN** the WebSocket connection drops
- **THEN** the hook SHALL attempt to reconnect every 3 seconds

#### Scenario: Hook exposes reconnection state
- **WHEN** reconnecting
- **THEN** isReconnecting and reconnectAttempts SHALL be exposed

### Requirement: WebUI SHALL display tasks in a tree view
The main panel SHALL display tasks with status icons and action buttons.

#### Scenario: Tasks are shown with status indicators
- **WHEN** tasks are loaded
- **THEN** each task SHALL show its status with a colored icon

#### Scenario: Dispatch and abort buttons exist
- **WHEN** a pending task is selected
- **THEN** a dispatch button SHALL be visible
- **WHEN** a running task is selected
- **THEN** an abort button SHALL be visible

### Requirement: WebUI SHALL display a stream console
A console component SHALL display real-time text deltas from the ACP session.

#### Scenario: Console shows streaming text
- **WHEN** a task is running and producing text deltas
- **THEN** the console SHALL display the streaming output in real-time

### Requirement: WebUI SHALL display a timeline
A timeline component SHALL show chronological events with source-based coloring.

#### Scenario: Timeline shows events
- **WHEN** events occur during task execution
- **THEN** they SHALL be displayed in the timeline with color coding by source

### Requirement: WebUI SHALL have a control bar
A control bar SHALL provide permission level selection, task creation input, and connection status.

#### Scenario: Control bar renders
- **WHEN** the WebUI loads
- **THEN** a control bar SHALL be visible with permission selector, text input, and connection indicator

### Requirement: WebUI SHALL support internationalization
The WebUI SHALL support Chinese (default) and English languages with a language switch.

#### Scenario: Default language is Chinese
- **WHEN** the WebUI loads
- **THEN** all UI text SHALL be displayed in Chinese

#### Scenario: Language switch toggles between zh and en
- **WHEN** the user clicks the language switch button
- **THEN** the UI SHALL toggle between Chinese and English

