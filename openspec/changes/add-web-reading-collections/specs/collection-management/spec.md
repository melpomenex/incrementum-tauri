# Spec: Collection Management

## ADDED Requirements

### Requirement: Default Collection
The system SHALL create and use a default collection for new users and Demo Mode.

#### Scenario: First launch in Demo Mode
- **GIVEN** the user has not authenticated
- **WHEN** they open the app
- **THEN** the system creates or selects a default Demo collection
- **AND** documents, extracts, and learning items belong to that collection

### Requirement: Collection Creation and Switching
The system SHALL allow users to create and switch active collections.

#### Scenario: User creates a new collection
- **WHEN** the user creates a collection with a name
- **THEN** the collection is available to select as the active collection

#### Scenario: User switches active collection
- **GIVEN** multiple collections exist
- **WHEN** the user selects a different collection
- **THEN** queue views, document lists, and graph views are scoped to the active collection

### Requirement: Collection Scoping
All queue and review operations MUST be scoped to the active collection.

#### Scenario: Queue scoping
- **GIVEN** an active collection is selected
- **WHEN** queue items are loaded
- **THEN** only items belonging to that collection are included
