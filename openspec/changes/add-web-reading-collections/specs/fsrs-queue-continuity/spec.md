# Spec: FSRS Queue Continuity

## ADDED Requirements

### Requirement: Review Session Resume
The system SHALL resume review sessions from the next due item instead of restarting from the beginning.

#### Scenario: Resume after refresh
- **GIVEN** the user has an in-progress review session
- **WHEN** they refresh or reopen the app
- **THEN** the session resumes at the next due item
- **AND** items already rated in the session are excluded

### Requirement: Persisted Session State
The system SHALL persist review session state per user and collection.

#### Scenario: Persist session state
- **WHEN** the user rates an item in a review session
- **THEN** the session state is updated with the item status and timestamp

### Requirement: FSRS Due Ordering
Review sessions MUST be assembled using FSRS due ordering for the active collection.

#### Scenario: Build session queue
- **GIVEN** a review session is started
- **WHEN** the session queue is generated
- **THEN** due items are ordered by FSRS scheduling
