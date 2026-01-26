## ADDED Requirements
### Requirement: Scroll Mode Assistant Toggle
The system SHALL provide a floating toggle in scroll mode that opens or closes the assistant panel.

#### Scenario: User hides the assistant
- **GIVEN** the user is reading in scroll mode
- **WHEN** the user taps the floating assistant toggle
- **THEN** the assistant panel is hidden without exiting scroll mode

#### Scenario: User shows the assistant
- **GIVEN** the assistant panel is hidden in scroll mode
- **WHEN** the user taps the floating assistant toggle
- **THEN** the assistant panel is shown in its last used position

### Requirement: Scroll Mode Assistant Toggle Persistence
The system SHALL remember the assistant open/closed state for scroll mode across sessions.

#### Scenario: Assistant hidden persists
- **GIVEN** the user hides the assistant in scroll mode
- **WHEN** the app is restarted and scroll mode is reopened
- **THEN** the assistant remains hidden until toggled on
