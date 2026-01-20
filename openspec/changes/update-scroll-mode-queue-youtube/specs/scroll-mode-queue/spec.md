## ADDED Requirements
### Requirement: Full Queue Scroll Mode
The system SHALL render scroll mode as a TikTok-style, vertically paged queue that includes all incremental reading queue item types, including YouTube items.

#### Scenario: Mixed queue paging
- **GIVEN** the incremental reading queue contains documents, extracts, flashcards, RSS items, and YouTube items
- **WHEN** the user opens scroll mode
- **THEN** each item appears as a full-page, vertically paged entry and can be navigated sequentially

### Requirement: Scroll Boundary Queue Navigation
The system SHALL advance to the previous or next queue item when the user scrolls beyond the transcript section bounds in a YouTube scroll-mode item.

#### Scenario: Advance on transcript boundary
- **GIVEN** the user is viewing a YouTube item in scroll mode
- **AND** the transcript section is visible in the scroll layout
- **WHEN** the user scrolls past the transcript section boundary in either direction
- **THEN** the queue advances to the previous or next item accordingly
