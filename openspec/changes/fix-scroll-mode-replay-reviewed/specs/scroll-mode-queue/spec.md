## ADDED Requirements

### Requirement: Scroll Mode Queue Session Freshness
Scroll Mode SHALL always start with a fresh queue snapshot that excludes items whose FSRS `next_reading_date` is in the future, ensuring previously-reviewed items are not replayed.

#### Scenario: Reviewed items excluded on scroll mode restart
- **GIVEN** the user rated 3 documents in Scroll Mode during a session
- **AND** those documents were rescheduled to a future `next_reading_date`
- **WHEN** the user exits Scroll Mode and re-enters
- **THEN** those 3 documents SHALL NOT appear in the new scroll queue
- **AND** only currently-due items (`next_reading_date <= now`) SHALL be shown

#### Scenario: Fresh queue fetch on mount
- **GIVEN** the user has cached queue data from a previous session
- **WHEN** the user enters Scroll Mode
- **THEN** the queue SHALL be freshly fetched from the backend
- **AND** the queue SHALL NOT use stale cached item lists
- **AND** the starting index SHALL be reset to 0

#### Scenario: Rating updates are committed before queue refresh
- **GIVEN** the user rates a document in Scroll Mode
- **WHEN** the rating is submitted
- **THEN** the `next_reading_date` update SHALL be committed to the database synchronously
- **AND** any subsequent queue fetch SHALL reflect the new schedule
- **AND** the rated item SHALL be immediately removed from the local scroll list

### Requirement: Scroll Mode Index Reset on New Session
Scroll Mode SHALL NOT restore position indices from previous sessions that may reference a different queue state, preventing index-queue mismatch bugs.

#### Scenario: Index reset prevents out-of-bounds access
- **GIVEN** a previous Scroll Mode session ended at index 15 of 20 items
- **AND** the user rated several items, reducing the due count to 5
- **WHEN** the user re-enters Scroll Mode
- **THEN** the index SHALL start at 0
- **AND** the previous index (15) SHALL NOT be restored (as it would be out of bounds)
- **AND** the user SHALL see the first due item in the fresh queue
