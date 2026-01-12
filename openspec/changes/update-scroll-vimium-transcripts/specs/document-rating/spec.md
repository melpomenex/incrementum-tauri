## MODIFIED Requirements
### Requirement: Document Review and Navigation
The system SHALL support rating documents during reading in any document viewing mode, which triggers rescheduling and navigation.

#### Scenario: User rates a document after reading
- **Given** the user is viewing a document in the "Document" view mode
- **When** the user selects a rating (Again, Hard, Good, Easy) via the `HoverRatingControls` or keyboard shortcuts
- **Then** the application should submit the rating to the backend with the time spent
- **And** the backend should reschedule the document using FSRS
- **And** the application should automatically navigate to the next document in the queue

#### Scenario: User rates a document in scroll mode
- **Given** the user is viewing a document in scroll mode
- **When** the user selects a rating using scroll mode controls or keyboard shortcuts
- **Then** the application should submit the rating to the backend with the time spent
- **And** the application should automatically navigate to the next item in the queue
