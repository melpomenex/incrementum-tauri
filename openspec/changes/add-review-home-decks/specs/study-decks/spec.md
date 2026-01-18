## ADDED Requirements

### Requirement: Study deck model and selection
The system SHALL allow users to define multiple study decks, each with a name and an associated set of tag filters, and SHALL allow exactly one active deck selection (or an "All decks" selection).

#### Scenario: User selects a deck
- **WHEN** the user selects a study deck
- **THEN** the system marks that deck as the active selection

#### Scenario: User selects all decks
- **WHEN** the user selects "All decks"
- **THEN** the system clears any active deck filter

### Requirement: Active deck persistence
The system SHALL persist the active deck selection across sessions.

#### Scenario: App restart
- **WHEN** the user restarts the app
- **THEN** the previously active deck selection is restored

### Requirement: Deck membership via tags
The system SHALL include items in a deck-scoped view when their tags match the active deck's tag filters, and SHALL exclude untagged items from deck-scoped views.

#### Scenario: Tagged item included
- **WHEN** an item has at least one tag that matches the active deck's tag filters
- **THEN** the item appears in deck-scoped views

#### Scenario: Untagged item excluded
- **WHEN** an item has no tags
- **THEN** the item does not appear in deck-scoped views

### Requirement: Anki deck seeding
The system SHALL seed study decks from existing Anki-imported deck tags when no study decks have been configured.

#### Scenario: First run with existing Anki imports
- **WHEN** the user has Anki-imported items and no study decks configured
- **THEN** the system creates study decks based on the Anki deck tags
