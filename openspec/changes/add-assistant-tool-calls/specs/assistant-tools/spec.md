## ADDED Requirements
### Requirement: Assistant tool inventory expansion
The system SHALL expose at least 10 additional built-in tools to the assistant beyond the current list.

#### Scenario: Assistant shows expanded tool list
- **WHEN** the user requests `/tools`
- **THEN** the assistant lists the expanded set including at least: `create_cloze_card`, `update_document`, `delete_document`, `get_learning_items`, `get_document_extracts`, `submit_review`, `rate_document`, `rate_extract`, `get_statistics`, and `batch_create_cards`.

### Requirement: Tool call execution from assistant output
The system SHALL execute assistant tool calls expressed via a fenced JSON block in assistant responses.

#### Scenario: Assistant emits a tool call block
- **WHEN** the assistant response includes a valid tool call block
- **THEN** the tool is executed and its result is recorded in the assistant message UI.

### Requirement: Document context auto-attachment
The system SHALL attach created extracts and flashcards to the active document when a document context is available and the tool call omits `document_id`.

#### Scenario: Create cloze cards while viewing a document
- **WHEN** the assistant creates cloze cards without specifying `document_id` while a document is active
- **THEN** each created card is associated with that active document.
