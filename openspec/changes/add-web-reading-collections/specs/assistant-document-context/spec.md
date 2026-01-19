# Spec: Assistant Document Context (PDF)

## ADDED Requirements

### Requirement: PDF Context Window
The system SHALL provide the Assistant a sliding window of PDF text around the current reading position.

#### Scenario: Assistant context while reading a PDF
- **GIVEN** the user is viewing a PDF document
- **WHEN** the Assistant context is assembled
- **THEN** the system includes text from the current page and adjacent pages in the context window

### Requirement: Token Budget Respect
The Assistant context MUST respect the user-configured token budget.

#### Scenario: Token-limited context
- **GIVEN** the user has configured an Assistant token limit
- **WHEN** the context is prepared
- **THEN** the system trims the PDF text window to fit within the configured budget

### Requirement: Selection Priority
Selected text SHALL be prioritized in the Assistant context when present.

#### Scenario: User highlights text
- **GIVEN** the user has selected text in the PDF
- **WHEN** the Assistant context is prepared
- **THEN** the selected text is included and prioritized within the context window

### Requirement: Optional OCR Context
The system SHALL use OCR text when the user enables OCR for the document.

#### Scenario: OCR enabled
- **GIVEN** OCR is enabled for a PDF
- **WHEN** the Assistant context is prepared
- **THEN** OCR text is preferred over non-OCR extracted text for the context window
