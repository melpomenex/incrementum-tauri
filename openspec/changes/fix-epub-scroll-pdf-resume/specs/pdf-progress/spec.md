## ADDED Requirements
### Requirement: PDF Reading Position Persistence
The system SHALL persist the PDF reading position (page number and scroll position) in the web reader.

#### Scenario: User leaves and returns to a PDF
- **GIVEN** the user scrolls within a PDF document
- **WHEN** the user switches tabs, closes the document, or restarts the app
- **THEN** the system restores the document to the same page and scroll position when the PDF is reopened

### Requirement: Most-Recent Progress Source
The system SHALL restore PDF progress from the most recent available source between local storage and remote document fields.

#### Scenario: Local and remote progress differ
- **GIVEN** the local stored progress timestamp differs from the remote document progress timestamp
- **WHEN** the PDF is reopened in the web reader
- **THEN** the system restores the most recently updated progress state
