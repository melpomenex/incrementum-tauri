# document-rating Specification

## Purpose
TBD - created by archiving change review-document-reading. Update Purpose after archive.
## Requirements
### Requirement: Document Review and Navigation
The system SHALL support rating documents during reading, which triggers rescheduling and navigation.

#### Scenario: User rates a document after reading
- **Given** the user is viewing a document in the "Document" view mode
- **When** the user selects a rating (Again, Hard, Good, Easy) via the `HoverRatingControls` or keyboard shortcuts
- **Then** the application should submit the rating to the backend with the time spent
- **And** the backend should reschedule the document using FSRS
- **And** the application should automatically navigate to the next document in the queue

### Requirement: Persistence of Scheduling Data
Document scheduling data MUST be persisted to the database.

#### Scenario: Document scheduling persistence
- **Given** a document is rated
- **When** the rating is processed
- **Then** the document's `next_reading_date`, `stability`, `difficulty`, `reps`, and `total_time_spent` should be updated in the database
- **And** the new schedule should be reflected in the Queue view

### Requirement: Tracking Reading Time
The system MUST track the time spent reading a document for accurate scheduling metrics.

#### Scenario: Time tracking
- **Given** the user opens a document
- **When** the user rates the document
- **Then** the time spent viewing the document since it was opened (or last rated) should be recorded and added to the document's `total_time_spent`

