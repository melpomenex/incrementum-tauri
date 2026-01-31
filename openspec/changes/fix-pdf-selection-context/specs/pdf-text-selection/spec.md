## ADDED Requirements
### Requirement: Accurate PDF text selection
The system SHALL render a PDF text layer aligned with the canvas so that user selections highlight only the dragged text range and are visibly highlighted.

#### Scenario: User selects a passage in a PDF
- **WHEN** the user drags to select text on a PDF page
- **THEN** only the highlighted passage is selected (not the full page)
- **AND** the selection highlight is visible

#### Scenario: Selection remains accurate after zoom changes
- **WHEN** the user changes zoom mode or scale
- **THEN** selecting a passage still highlights only the dragged text range

### Requirement: Selection support across web and Tauri
The system SHALL support accurate PDF text selection in both web/PWA and Tauri environments.

#### Scenario: User selects text in the Tauri app
- **WHEN** a user selects text in a PDF within the Tauri build
- **THEN** the selection highlights only the dragged text range
