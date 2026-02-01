## ADDED Requirements
### Requirement: Archive completed YouTube documents
The system SHALL allow users to archive a YouTube document after finishing playback, preserving the link while removing it from scheduling.

#### Scenario: Archive prompt after playback completes
- **GIVEN** a user finishes watching a YouTube document
- **WHEN** the playback reaches the end
- **THEN** the system SHALL present an option to archive the document

#### Scenario: Archived YouTube document is excluded from queues
- **GIVEN** a YouTube document is archived
- **WHEN** the queue is generated in any mode (standard or scroll)
- **THEN** the archived document SHALL NOT be scheduled or shown in the queue

#### Scenario: Archived YouTube document remains searchable
- **GIVEN** a YouTube document is archived
- **WHEN** the user searches documents
- **THEN** the archived document SHALL appear in search results
