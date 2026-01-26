## ADDED Requirements
### Requirement: PDF Scroll Position Restore Across Modes
The system SHALL restore the most recent PDF scroll position when reopening a PDF in any app mode.

#### Scenario: Resume after switching modes
- **GIVEN** the user scrolls within a PDF in scroll mode
- **WHEN** the user opens the same PDF in standard document view
- **THEN** the PDF restores to the most recent page and scroll position

#### Scenario: Resume after reopening
- **GIVEN** the user scrolls within a PDF in standard document view
- **WHEN** the user closes and reopens the PDF later
- **THEN** the PDF restores to the most recent page and scroll position

### Requirement: Consistent PDF Scroll Persistence
The system SHALL persist PDF scroll position updates through a single shared mechanism regardless of app mode.

#### Scenario: Persist from any viewer
- **GIVEN** the user scrolls within a PDF in any mode
- **WHEN** the scroll position changes
- **THEN** the latest scroll position is saved for future restoration
