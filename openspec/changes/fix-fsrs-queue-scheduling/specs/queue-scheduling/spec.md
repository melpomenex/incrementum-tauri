## ADDED Requirements

### Requirement: FSRS-Based Queue Scheduling
All queue surfaces (Scroll Mode, Queue Page, PWA, Webapp) SHALL schedule documents using the FSRS (Free Spaced Repetition Scheduler) algorithm's `next_reading_date` field as the primary ordering factor, replacing the previous priority_score-based system.

#### Scenario: Queue orders documents by FSRS due date
- **GIVEN** a library contains documents with FSRS scheduling data
- **WHEN** the user loads any queue view (Scroll Mode, Queue Page, etc.)
- **THEN** documents SHALL be ordered primarily by `next_reading_date` (earliest first)
- **AND** documents with `next_reading_date <= now` (due) SHALL appear before future-dated documents
- **AND** documents without `next_reading_date` (new/unread) SHALL appear after due items

#### Scenario: New documents prioritized for first reading
- **GIVEN** a library contains documents that have never been read
- **WHEN** the queue is loaded
- **THEN** documents with no `next_reading_date` SHALL be prioritized for first reading
- **AND** these new documents SHALL be ordered by user-set `priority_rating` (descending)
- **AND** new documents SHALL appear before any documents with future `next_reading_date`

#### Scenario: Overdue documents receive higher priority
- **GIVEN** a document was scheduled for review but the rating is overdue
- **WHEN** the queue is loaded
- **THEN** overdue documents SHALL receive higher priority than currently-due documents
- **AND** priority SHALL decay based on days overdue (more overdue = slightly lower priority)
- **AND** the overdue priority SHALL be calculated as: `10.0 - (days_overdue * 0.1)` with a minimum of 5.0

#### Scenario: FSRS metrics used as secondary sorting
- **GIVEN** multiple documents have the same `next_reading_date`
- **WHEN** the queue orders these documents
- **THEN** documents SHALL be secondarily sorted by `stability` (lower stability = higher priority)
- **AND** documents with equal stability SHALL be sorted by `difficulty` (higher difficulty = higher priority)
- **AND** documents with equal difficulty SHALL be sorted by `priority_rating` (descending)

#### Scenario: User priority rating acts as multiplier
- **GIVEN** a user has set a `priority_rating` (0-10) on a document
- **WHEN** calculating the document's queue position
- **THEN** the `priority_rating` SHALL act as a multiplier on the FSRS-calculated priority
- **AND** the multiplier SHALL range from 0.5x (rating 1) to 2.0x (rating 10)
- **AND** a `priority_rating` of 5 SHALL result in a 1.0x multiplier (no effect)

#### Scenario: Queue excludes future-dated documents by default
- **GIVEN** a document has a `next_reading_date` in the future
- **WHEN** the default queue view is loaded
- **THEN** the document SHALL NOT appear in the queue
- **AND** the document SHALL only appear in the queue when its `next_reading_date` is reached
- **AND** the user MAY opt-in to seeing future-dated documents via a "All Items" filter

### Requirement: Cross-Platform Queue Parity
The queue scheduling behavior MUST be identical across all platforms (Tauri desktop app, PWA, Webapp) to ensure consistent user experience regardless of access method.

#### Scenario: Tauri and Webapp show identical queue order
- **GIVEN** the same user account with identical document library
- **WHEN** the user opens the queue in the Tauri desktop app
- **AND** the user opens the queue in the webapp (or PWA)
- **THEN** the queue order SHALL be identical
- **AND** due documents SHALL appear in the same sequence
- **AND** document counts SHALL match

#### Scenario: Mobile Scroll Mode uses FSRS scheduling
- **GIVEN** the user is accessing the application on a mobile device via PWA
- **WHEN** the user enters Scroll Mode
- **THEN** the document cycle order SHALL follow FSRS `next_reading_date` ordering
- **AND** flashcard interleave SHALL respect FSRS due dates for learning items
- **AND** the mobile experience SHALL match the desktop Scroll Mode behavior

### Requirement: Queue Performance at Scale
The queue system MUST maintain responsive performance even with large document libraries (1000+ documents) by leveraging database indexing and efficient FSRS calculations.

#### Scenario: Queue loads quickly with large library
- **GIVEN** a user has 1000+ documents in their library
- **WHEN** the user loads the queue
- **THEN** the queue SHALL load within 2 seconds
- **AND** the query SHALL use a database index on `documents.next_reading_date`
- **AND** the application SHALL paginate queue items if necessary

#### Scenario: FSRS calculations are cached
- **GIVEN** a document has been rated and its `next_reading_date` calculated
- **WHEN** the queue is subsequently loaded
- **THEN** the cached `next_reading_date` SHALL be used (no recalculation)
- **AND** FS SHALL recalculate `next_reading_date` only when the document is rated
- **AND** batch recalculation SHALL be available for manual scheduling updates
