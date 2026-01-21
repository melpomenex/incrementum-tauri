## ADDED Requirements
### Requirement: Continuous EPUB Scrolling
The system SHALL render EPUB documents in a continuous vertical scroll flow in the web reader.

#### Scenario: User scrolls through an EPUB
- **WHEN** an EPUB document is opened in the web reader
- **THEN** the reader allows scrolling through all sections of the book without being limited to the first section

### Requirement: EPUB TOC Navigation
The system SHALL navigate to the selected EPUB table-of-contents item in the web reader.

#### Scenario: User selects a TOC entry
- **WHEN** the user clicks any TOC item in the EPUB TOC list
- **THEN** the reader scrolls to the corresponding section and updates the current location
