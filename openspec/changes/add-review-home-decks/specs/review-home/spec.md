## ADDED Requirements

### Requirement: Review home entry point
The system SHALL provide a Review home page that acts as the primary entry point to review sessions.

#### Scenario: User opens Review
- **WHEN** the user navigates to Review
- **THEN** the Review home page is displayed instead of starting a session immediately

### Requirement: Review home stats
The Review home page SHALL display key review metrics, including total due, due today, new vs review counts, estimated time to complete, and current streak.

#### Scenario: Stats shown for active deck
- **WHEN** a deck is active
- **THEN** the displayed metrics are scoped to that deck

#### Scenario: Stats shown for all decks
- **WHEN** "All decks" is active
- **THEN** the displayed metrics reflect the full collection

### Requirement: Deck list and actions
The Review home page SHALL show a deck list with per-deck due counts and provide actions to start a session for the active deck.

#### Scenario: User starts a session
- **WHEN** the user selects "Start review" on the Review home page
- **THEN** the review session begins using the active deck scope

#### Scenario: User switches deck from home
- **WHEN** the user selects a deck from the Review home page
- **THEN** the active deck is updated and the stats refresh
