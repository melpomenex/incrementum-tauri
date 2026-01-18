## ADDED Requirements

### Requirement: Deck tag manager
The system SHALL provide a tag manager area where users can view and edit the tag filters associated with each study deck.

#### Scenario: User adds a tag to a deck
- **WHEN** the user adds a tag to a deck's tag filters
- **THEN** items with that tag become eligible for that deck

#### Scenario: User removes a tag from a deck
- **WHEN** the user removes a tag from a deck's tag filters
- **THEN** items with only that tag are no longer eligible for that deck

### Requirement: Deck naming control
The system SHALL allow users to rename study decks without changing the underlying tag filters.

#### Scenario: User renames a deck
- **WHEN** the user renames a study deck
- **THEN** the deck name updates while the tag filters remain intact
