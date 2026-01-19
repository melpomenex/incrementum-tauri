# Spec: Reading Progress Persistence

## ADDED Requirements

### Requirement: Cross-Device PDF Progress Sync
The system SHALL persist PDF reading progress across devices for authenticated users.

#### Scenario: Save progress while reading
- **GIVEN** the user is authenticated
- **WHEN** they scroll or change pages in a PDF
- **THEN** the system saves page number, scroll percent, and updated timestamp to the server

#### Scenario: Restore progress on another device
- **GIVEN** the user is authenticated and has saved progress
- **WHEN** they open the same PDF on another device
- **THEN** the viewer restores to the most recently saved page/scroll position

### Requirement: Demo Mode Local Progress
The system SHALL store PDF progress locally when not authenticated.

#### Scenario: Demo Mode progress
- **GIVEN** the user is in Demo Mode
- **WHEN** they reopen a PDF
- **THEN** the viewer restores the last locally saved page/scroll position

### Requirement: Conflict Resolution
The system SHALL resolve progress conflicts using the most recent timestamp.

#### Scenario: Progress update conflict
- **GIVEN** the user has both local and server progress data
- **WHEN** the document is opened
- **THEN** the system uses the latest updated timestamp to choose which position to restore
