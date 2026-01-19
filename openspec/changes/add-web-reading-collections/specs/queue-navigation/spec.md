# Spec: Queue Navigation (Read Next / Random)

## ADDED Requirements

### Requirement: Read Next Navigation
The system SHALL navigate to the next due queue item in the active collection when Read Next is used.

#### Scenario: Read Next in toolbar
- **GIVEN** the user has due items in the active collection
- **WHEN** they click Read Next
- **THEN** the next due item (by FSRS order and current queue filter) opens in the appropriate viewer

### Requirement: Random Item Navigation
The system SHALL navigate to a random queue item in the active collection.

#### Scenario: Random Item in toolbar
- **GIVEN** the active collection has queue items
- **WHEN** the user clicks Random Item
- **THEN** a random queue item (respecting the current queue filter) opens in the appropriate viewer

### Requirement: Multi-Type Queue Items
Read Next and Random Item MUST support documents, extracts, flashcards, and RSS items.

#### Scenario: Mixed item types
- **GIVEN** the queue contains multiple item types
- **WHEN** Read Next or Random Item is invoked
- **THEN** the system opens the item using the correct view for its type
