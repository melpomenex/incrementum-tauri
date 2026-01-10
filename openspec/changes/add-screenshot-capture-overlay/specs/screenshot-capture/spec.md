## ADDED Requirements
### Requirement: Screenshot capture entry points
The system SHALL allow users to start screenshot capture from the toolbar button and a configurable keyboard shortcut.

#### Scenario: Trigger capture from toolbar
- **WHEN** the user clicks the Screenshot button in the toolbar
- **THEN** the capture selection flow starts

#### Scenario: Trigger capture from shortcut
- **WHEN** the user presses the configured screenshot shortcut
- **THEN** the capture selection flow starts

### Requirement: Screenshot capture selection
The system SHALL let users choose to capture a region, the app window, or a full screen (including outside the app).

#### Scenario: Capture a region
- **WHEN** the user selects region capture and drags a rectangle
- **THEN** the system captures the selected region

#### Scenario: Capture the app window
- **WHEN** the user selects app-window capture
- **THEN** the system captures the app window

#### Scenario: Capture a full screen
- **WHEN** the user selects full-screen capture
- **THEN** the system captures the selected screen

### Requirement: Screenshot shortcut configuration
The system SHALL provide a configurable keyboard shortcut for screenshot capture with a default of Ctrl+Shift+S (Cmd+Shift+S on macOS).

#### Scenario: Update shortcut
- **WHEN** the user changes the screenshot shortcut in Settings
- **THEN** the new shortcut is used for capture

### Requirement: Screenshot persistence
The system SHALL save captured screenshots to the document library with the Screenshots category.

#### Scenario: Save captured screenshot
- **WHEN** a screenshot is captured
- **THEN** a document is created with category "Screenshots" and the image data
