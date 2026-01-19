# Spec: Extract and Learning Item Creation

## ADDED Requirements

### Requirement: Unified Extract Creation Flow
The system SHALL provide a single extract creation flow that supports extracts, cloze deletions, and Q&A cards.

#### Scenario: Create extract from selection
- **GIVEN** the user selects text in a document
- **WHEN** they open the extract creation dialog
- **THEN** the selection is prefilled as the extract content

#### Scenario: Create cloze card from extract flow
- **GIVEN** the extract creation dialog is open
- **WHEN** the user chooses “Create Cloze”
- **THEN** a cloze learning item is created from the extract content

#### Scenario: Create Q&A card from extract flow
- **GIVEN** the extract creation dialog is open
- **WHEN** the user chooses “Create Q&A” and provides a question/answer
- **THEN** a Q&A learning item is created and linked to the extract

### Requirement: Scheduled Learning Items
Learning items created from extracts MUST be scheduled via FSRS.

#### Scenario: Scheduling after creation
- **WHEN** a cloze or Q&A item is created from an extract
- **THEN** the item is inserted into the FSRS scheduling pipeline
- **AND** it appears in the queue according to the active filter mode
