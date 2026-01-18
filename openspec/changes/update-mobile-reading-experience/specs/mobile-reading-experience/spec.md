## ADDED Requirements
### Requirement: Premium mobile reading typography
The system SHALL use a premium, reading-optimized typography configuration for RSS, EPUB, and HTML/Markdown on phone-sized viewports.

#### Scenario: Reading typography on a phone
- **WHEN** a user opens RSS, EPUB, or HTML/Markdown content on a phone
- **THEN** body text uses the mobile reading typography rules
- **AND** line length and line height remain readable in a compact layout

### Requirement: Consistent mobile reading layout
The system SHALL apply consistent margins and chrome behavior across RSS, EPUB, and HTML/Markdown reading views to maximize content area on phones.

#### Scenario: Content area consistency
- **WHEN** a user switches between RSS, EPUB, and HTML/Markdown content on a phone
- **THEN** the reading content area uses consistent margins and spacing
- **AND** the visible reading area is maximized relative to surrounding UI chrome
