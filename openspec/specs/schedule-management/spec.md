# schedule-management Specification

## Purpose
TBD - created by archiving change webui-enhancement. Update Purpose after archive.
## Requirements
### Requirement: Schedule List View

The user must see all existing schedules in a table layout with control actions.

#### Scenario: View schedule list on page load
WHEN the user navigates to the Schedules page
THEN the WebUI sends `GET /api/schedule` and renders a table with columns: Description, Cron Expression, Enabled, Last Triggered, Next 5 Triggers, Actions

#### Scenario: Table shows 5 next trigger times per row
WHEN the table renders each schedule row
THEN the "Next 5 Triggers" cell displays a comma-separated list of the next 5 calculated execution times based on the cron expression and the server's current time

#### Scenario: Pagination/general empty state
WHEN the API returns an empty schedule list
THEN the table shows a "No schedules configured" placeholder with a button to create the first schedule

#### Scenario: API error on list fetch
WHEN `GET /api/schedule` fails (network error or non-2xx)
THEN the page displays an inline error banner with the message "Failed to load schedules" and a Retry button that re-fetches the list

### Requirement: Enable/Disable Toggle Switch

The user can toggle a schedule on or off without navigating away from the list view.

#### Scenario: Toggle a schedule to enabled
WHEN the user clicks the toggle switch on a currently disabled schedule row
THEN the WebUI sends `PUT /api/schedule/{id}` with body `{ "enabled": true }`, the toggle updates to the "on" state, and a success toast "Schedule enabled" appears
AND IF the request fails, the toggle reverts to its previous state and an error toast "Failed to update schedule" appears

#### Scenario: Toggle a schedule to disabled
WHEN the user clicks the toggle switch on a currently enabled schedule row
THEN the WebUI sends `PUT /api/schedule/{id}` with body `{ "enabled": false }`, the toggle updates to the "off" state, and a success toast "Schedule disabled" appears
AND IF the request fails, the toggle reverts and an error toast appears

### Requirement: Create Schedule Form

The user can create a new schedule through a dedicated form.

#### Scenario: Open create schedule form
WHEN the user clicks the "Create Schedule" button on the list page
THEN the WebUI opens a modal or navigates to a form page with the following fields:
- Description (text input, required, max 200 characters)
- Cron Expression (text input, required, validated against standard 5-field cron syntax)
- Permission Level (dropdown, required, options: "admin", "user", "guest")
- Budget (number input, required, min 0, step 0.01, placeholder "0.00")
- Max Retries (number input, required, min 0, max 10, default 3)

#### Scenario: Calendar preview shows next 5 trigger times
WHEN the user types or modifies the Cron Expression field in the create form
THEN the WebUI computes the next 5 execution times from the current server time using a cron parser library (e.g., `cron-parser` on the frontend) and displays them in a preview box below the input
AND IF the cron expression is invalid or empty, the preview box shows "Invalid cron expression"

#### Scenario: Submit create schedule form
WHEN the user fills all required fields and clicks "Save"
THEN the WebUI sends `POST /api/schedule` with JSON body `{ "description": "...", "cron_expression": "...", "permission_level": "...", "budget": 0.0, "max_retries": 3 }`
AND upon 2xx response, the form closes, a success toast "Schedule created" appears, and the list re-fetches
AND IF the response is 4xx, the form shows server validation errors inline below the relevant fields
AND IF the request fails with network error, an error toast "Failed to create schedule" appears

#### Scenario: Cancel create schedule
WHEN the user clicks "Cancel" in the create form
THEN the form closes and no data is sent to the API

### Requirement: Edit Schedule Form

The user can modify an existing schedule's fields.

#### Scenario: Open edit schedule form
WHEN the user clicks the "Edit" icon on a schedule row in the list
THEN the WebUI opens a modal or form page pre-populated with the current schedule values for: Description, Cron Expression, Permission Level, Budget, Max Retries

#### Scenario: Calendar preview in edit form
WHEN the user changes the Cron Expression field in the edit form
THEN the WebUI re-computes and shows the next 5 trigger times in real time, identical to the create form behavior

#### Scenario: Submit edit schedule form
WHEN the user modifies one or more fields and clicks "Save"
THEN the WebUI sends `PUT /api/schedule/{id}` with JSON body containing only the changed fields (partial update)
AND upon 2xx response, the form closes, a success toast "Schedule updated" appears, and the list re-fetches
AND IF the response is 4xx, inline validation errors appear
AND IF the request fails, an error toast "Failed to update schedule" appears

#### Scenario: Cancel edit schedule
WHEN the user clicks "Cancel" in the edit form
THEN the form closes and no data is sent to the API

### Requirement: Delete Schedule

The user can permanently delete a schedule.

#### Scenario: Delete a schedule with confirmation
WHEN the user clicks the "Delete" icon on a schedule row
THEN a confirmation dialog appears: "Are you sure you want to delete schedule '{description}'? This action cannot be undone." with "Cancel" and "Delete" buttons

#### Scenario: Confirm delete
WHEN the user clicks "Delete" in the confirmation dialog
THEN the WebUI sends `DELETE /api/schedule/{id}`
AND upon 2xx response, the dialog closes, a success toast "Schedule deleted" appears, and the list re-fetches
AND IF the request fails, an error toast "Failed to delete schedule" appears

#### Scenario: Cancel delete
WHEN the user clicks "Cancel" in the confirmation dialog
THEN the dialog closes and no API call is made

