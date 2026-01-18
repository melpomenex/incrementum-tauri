## MODIFIED Requirements
### Requirement: Document Review and Navigation
The system SHALL support rating documents during reading, which triggers rescheduling and navigation across document reading experiences, including Scroll Mode.

#### Scenario: User rates a document after reading
- **Given** the user is viewing a document in the "Document" view mode
- **When** the user selects a rating (Again, Hard, Good, Easy) via the `HoverRatingControls` or keyboard shortcuts
- **Then** the application should submit the rating to the backend with the time spent
- **And** the backend should reschedule the document using FSRS
- **And** the application should automatically navigate to the next document in the queue

#### Scenario: User rates a document in Scroll Mode
- **Given** the user is viewing a document item in Scroll Mode
- **When** the user selects a rating
- **Then** the application should submit the rating to the backend with the time spent
- **And** the backend should reschedule the document using FSRS
- **And** the rated document should be removed from the Scroll Mode item list
- **And** the application should automatically advance to the next item in the queue
