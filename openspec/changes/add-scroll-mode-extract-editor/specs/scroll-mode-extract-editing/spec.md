## ADDED Requirements

### Requirement: Scroll Mode Extract Markdown Editor
The system SHALL render a full markdown editor for extract items in scroll mode, prefilled with the extract text and notes, and allow users to edit both.

#### Scenario: User edits an extract in scroll mode
- **WHEN** the user navigates to an extract item in scroll mode
- **THEN** the markdown editor is shown with the extract content and notes loaded for editing

### Requirement: Scroll Mode Imported Web Article Markdown Editor
The system SHALL render a full markdown editor for imported web article items in scroll mode, prefilled with the article text and notes, and allow users to edit both.

#### Scenario: User edits an imported web article in scroll mode
- **WHEN** the user navigates to a web article that originated from the browser extension in scroll mode
- **THEN** the markdown editor is shown with the article content and notes loaded for editing

### Requirement: Auto-Save Scroll Mode Edits
The system SHALL automatically persist edits made in the scroll mode markdown editor to the underlying extract or imported web article record.

#### Scenario: Auto-save updates persist
- **WHEN** the user edits content or notes in the markdown editor
- **THEN** the system saves the changes automatically and the updated text appears on the next open
