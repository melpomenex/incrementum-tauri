## ADDED Requirements
### Requirement: Capture PDF selection context for extracts
When an extract is created from a PDF selection, the system SHALL store selection context including page number, selected text, and selection geometry in both viewport and PDF coordinates.

#### Scenario: Create extract with selection context
- **WHEN** a user creates an extract from selected PDF text
- **THEN** the extract stores the selected text and page number
- **AND** stores selection rectangles in viewport coordinates
- **AND** stores selection rectangles in PDF coordinate space

### Requirement: Preserve multi-page selection segments
The system SHALL store per-page selection segments when a selection spans multiple PDF pages.

#### Scenario: Selection spans multiple pages
- **WHEN** a user selects text across multiple PDF pages
- **THEN** the extract stores selection segments grouped by page number
