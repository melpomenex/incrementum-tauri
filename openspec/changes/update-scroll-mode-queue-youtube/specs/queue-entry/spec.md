## ADDED Requirements
### Requirement: Start Optimal Session Opens Incremental Reading Queue
The system SHALL route the primary "Start Optimal Session" action to the incremental reading queue in scroll mode rather than flashcard review.

#### Scenario: Start optimal session opens queue
- **GIVEN** the user is on the queue experience entry point
- **WHEN** the user selects "Start Optimal Session"
- **THEN** the app opens scroll mode with the incremental reading queue
