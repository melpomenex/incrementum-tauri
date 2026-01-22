## ADDED Requirements
### Requirement: Document cover resolution
The system SHALL resolve a cover image for each document in the Documents grid, prioritizing sources in a deterministic order.

#### Scenario: Embedded cover available
- **WHEN** a PDF or EPUB document has an embedded cover image
- **THEN** the embedded cover SHALL be selected as the document cover

#### Scenario: YouTube document
- **WHEN** a document is of file type "youtube" and a thumbnail can be derived
- **THEN** the YouTube thumbnail SHALL be selected as the document cover

#### Scenario: Embedded cover missing
- **WHEN** a PDF or EPUB document has no embedded cover image
- **THEN** the system SHALL attempt to fetch a cover image from Anna's Archive

#### Scenario: No cover available
- **WHEN** no embedded cover, YouTube thumbnail, or Anna's Archive cover is available
- **THEN** the document SHALL display a styled background and icon fallback in the grid

### Requirement: Cover metadata persistence
The system SHALL persist the resolved cover image URL and its source for each document.

#### Scenario: Persist resolved cover
- **WHEN** a cover image is resolved for a document
- **THEN** the cover URL and source SHALL be stored with the document record

### Requirement: Grid mode cover display
The Documents grid mode SHALL render each grid item with its resolved cover image when available.

#### Scenario: Grid item render
- **WHEN** the user views the Documents tab in grid mode
- **THEN** each grid item SHALL render the resolved cover image if present
