## ADDED Requirements
### Requirement: Mobile Bottom Navigation Actions
The system SHALL provide a functional mobile bottom navigation that opens or activates the corresponding tabs for Home (Dashboard), Documents, Review, RSS, Stats (Analytics), Queue, and Settings.

#### Scenario: User selects a bottom navigation item
- **WHEN** the user taps a bottom navigation item
- **THEN** the corresponding tab SHALL become active, creating the tab if it does not already exist

### Requirement: Mobile Bottom Navigation Visibility
The system SHALL hide the mobile bottom navigation during full-screen reading modes.

#### Scenario: User enters full-screen reading
- **WHEN** full-screen reading mode is active
- **THEN** the bottom navigation SHALL be hidden until full-screen reading ends

### Requirement: Mobile Navigation Source of Truth
The system SHALL use a single mobile navigation component as the authoritative source for bottom nav behavior.

#### Scenario: Mobile navigation rendering
- **WHEN** the app renders mobile navigation
- **THEN** it SHALL use the canonical mobile navigation component
