## ADDED Requirements
### Requirement: Create extract from selection in scroll mode
The system SHALL allow users to create an extract from a text selection while reading in scroll mode for PDF, EPUB, markdown, and HTML/RSS document items.

#### Scenario: Create extract from selection in scroll mode
- **GIVEN** the user is reading a PDF, EPUB, markdown, or HTML/RSS document in scroll mode
- **AND** the user selects text in the current item
- **WHEN** the user chooses the extract action
- **THEN** the system creates an extract containing the selected text
- **AND** the extract is linked to the active document

### Requirement: Confirm extract creation in scroll mode
The system SHALL show a confirmation toast after an extract is successfully created in scroll mode.

#### Scenario: Toast appears after extract creation
- **GIVEN** the user creates an extract in scroll mode
- **WHEN** the extract is saved successfully
- **THEN** the system shows a confirmation toast
