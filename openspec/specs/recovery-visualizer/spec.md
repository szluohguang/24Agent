# recovery-visualizer Specification

## Purpose
TBD - created by archiving change webui-enhancement. Update Purpose after archive.
## Requirements
### Requirement: WebSocket reconnection indicator in control bar

The control bar at the top of the agent detail panel must visually communicate the WebSocket connection state, including an animated "Reconnecting..." state when the socket is recovering.

#### Scenario: Disconnected — show reconnecting indicator

WHEN the WebSocket connection drops AND `isReconnecting` is `true`
THEN the control bar displays a pulsing amber/orange badge with text "Reconnecting... (attempt X)" where X is the current `reconnectAttempts` count
AND the badge has a CSS pulse animation (glow/opacity cycle at 1s interval)
AND a tooltip on hover shows "WebSocket reconnecting, attempt X of Y (max)"

#### Scenario: Connected — show green indicator

WHEN the WebSocket is connected AND `isReconnecting` is `false`
THEN the control bar displays a solid green dot (8px diameter, no animation)
AND no text label is shown
AND a tooltip on hover shows "Connected since {lastConnectedAt formatted as HH:mm:ss}"

#### Scenario: Disconnected permanently — show red indicator

WHEN the WebSocket connection is closed AND reconnection has been exhausted (max attempts reached) AND `isReconnecting` transitions to `false`
THEN the control bar displays a solid red dot (8px diameter)
AND a tooltip on hover shows "Connection lost — refresh the page to reconnect"

### Requirement: Task retry status badge in task tree

Each task node in the agent task tree must visually indicate if the task is currently in a retry cycle, showing the retry count and max retries.

#### Scenario: Task retrying — show retry badge

WHEN a task's status is `"retrying"`
THEN the task tree node displays a right-aligned amber badge with text `retry {attempt}/{max}` (e.g., `retry 2/10`)
AND the task row has a subtle amber left-border (3px)
AND a tooltip on the badge shows "Retry attempt {attempt} of {max} — next retry in ~{delay}s"

#### Scenario: Task not retrying — no badge

WHEN a task's status is anything other than `"retrying"`
THEN no retry badge is shown on the task tree node
AND no left-border color change is applied

### Requirement: Recovery events in timeline with color coding

Timeline entries for recovery-related event types must receive special visual treatment distinct from normal log events.

#### Scenario: Hung detection event

WHEN a timeline event has type `"hung-recovery"`
THEN the event entry displays with a yellow left-border (3px) and a yellow tinted background
AND the event icon is a warning triangle (⚠️)
AND the text prefix reads "Hung Recovery: {message}"

#### Scenario: Hung failure event

WHEN a timeline event has type `"hung-failed"`
THEN the event entry displays with a red left-border (3px) and a red tinted background
AND the event icon is a cross mark (❌)
AND the text prefix reads "Hung Failed: {message}"

#### Scenario: Standard retry event

WHEN a timeline event has type `"retry"`
THEN the event entry displays with an orange left-border (3px) and an orange tinted background
AND the event icon is a refresh arrow (🔄)
AND the text prefix reads "Retry: {message}"

#### Scenario: Max retries reached event

WHEN a timeline event has type `"max-retries"`
THEN the event entry displays with a red left-border (3px) and a red tinted background (same as hung-failed)
AND the event icon is a stop sign (🛑)
AND the text prefix reads "Max Retries: {message}"

#### Scenario: Normal event — no recovery treatment

WHEN a timeline event has a type other than `"hung-recovery"`, `"hung-failed"`, `"retry"`, or `"max-retries"`
THEN no recovery-specific styling or icon is applied
AND the event renders with the default timeline entry style

### Requirement: Timeline filter by event type

The timeline panel must include quick-filter buttons that allow the user to filter events by category.

#### Scenario: Filter set to "recovery events"

WHEN the user clicks the "Recovery" filter button
THEN the timeline displays ONLY events with types `"hung-recovery"`, `"hung-failed"`, `"retry"`, and `"max-retries"`
AND the filter button becomes visually active (filled/highlighted state)
AND other filter buttons become inactive

#### Scenario: Filter set to "all events"

WHEN the user clicks the "All" filter button
THEN the timeline displays ALL events regardless of type
AND the "All" filter button becomes visually active
AND other filter buttons become inactive

#### Scenario: Filter set to "normal events"

WHEN the user clicks the "Normal" filter button
THEN the timeline displays ONLY events whose types are NOT `"hung-recovery"`, `"hung-failed"`, `"retry"`, or `"max-retries"`
AND the "Normal" filter button becomes visually active
AND other filter buttons become inactive

#### Scenario: Filter buttons layout

WHEN the timeline panel renders
THEN filter buttons appear as a horizontal row at the top of the timeline, above the event list
AND the buttons are: [All] [Normal] [Recovery]
AND the "All" button is active by default on initial render

### Requirement: useWebSocket hook — expose reconnection state

The `useWebSocket` hook must expose three new properties so that UI components can react to reconnection state changes.

#### Scenario: Hook returns isReconnecting

WHEN the WebSocket is in the process of reconnecting (between disconnect and successful reconnect, or until max attempts exhausted)
THEN the `useWebSocket` hook returns `isReconnecting: true` as a boolean value
OTHERWISE it returns `isReconnecting: false`

#### Scenario: Hook returns reconnectAttempts

WHEN the WebSocket reconnection logic increments its attempt counter
THEN the `useWebSocket` hook returns `reconnectAttempts` as a number reflecting the current attempt count (1-based, starting at 1)
AND after a successful reconnect, `reconnectAttempts` resets to `0`
AND after max attempts are exhausted, `reconnectAttempts` retains its final value

#### Scenario: Hook returns lastConnectedAt

WHEN the WebSocket establishes a successful connection
THEN the `useWebSocket` hook returns `lastConnectedAt` as a `Date` object reflecting the timestamp of the most recent successful connection
AND this value persists across reconnection cycles until a new connection succeeds
AND on initial render before any connection, `lastConnectedAt` is `null`

