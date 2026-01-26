# reader-position Specification Deltas

## MODIFIED Requirements

### Requirement: Persist Reader ViewState
The system SHALL persist a ViewState object per document using a stable document key and optional user/profile scoping, and SHALL support a unified DocumentPosition enum for all document types.

#### Scenario: Saving unified position for PDF document
- **WHEN** a user reads a PDF document and scrolls to page 5
- **THEN** the system persists a DocumentPosition::Page { page: 5, offset: 0.0 }
- **AND** the position is stored in both current_page and position_json fields

#### Scenario: Saving unified position for EPUB document
- **WHEN** a user reads an EPUB document
- **THEN** the system persists a DocumentPosition::CFI { cfi: "/body/DocFragment[2]/chap1[4]!", offset: 0.0 }
- **AND** the position is stored in both current_cfi and position_json fields

#### Scenario: Saving unified position for video
- **WHEN** a user watches a video and pauses at 123 seconds
- **THEN** the system persists a DocumentPosition::Time { seconds: 123 }
- **AND** the position can be restored across sessions

## ADDED Requirements

### Requirement: Unified Position Model
The system SHALL provide a unified DocumentPosition enum that abstracts position tracking for all document types (PDF, EPUB, HTML/Markdown, video).

#### Scenario: Position type detection
- **WHEN** a document is opened
- **THEN** the system determines the appropriate DocumentPosition variant based on file_type
- **AND** the position is stored and restored using the unified model

#### Scenario: Position to progress percentage
- **WHEN** a DocumentPosition is available
- **THEN** the system calculates a progress percentage (0.0 to 1.0) for display
- **AND** the percentage is shown on document thumbnails and progress bars

### Requirement: Visual Progress Indicators
The system SHALL display visual progress indicators for documents showing reading completion status.

#### Scenario: Progress bar on document thumbnail
- **WHEN** a document is displayed in a grid or list view
- **THEN** a progress bar shows the completion percentage
- **AND** the progress is calculated from the DocumentPosition

#### Scenario: Reading time estimate
- **WHEN** a document is displayed
- **THEN** the system shows estimated reading time remaining
- **AND** the estimate is based on word count and average reading speed (250 WPM default)

### Requirement: Continue Reading Page
The system SHALL provide a "Continue Reading" page that displays documents with active reading sessions, grouped by progress.

#### Scenario: Continue Reading displays active documents
- **WHEN** a user navigates to the Continue Reading page
- **THEN** documents with non-zero progress are displayed
- **AND** documents are grouped by progress ranges (0-25%, 26-75%, 76-99%)
- **AND** each document card shows progress percentage and time remaining

#### Scenario: One-click resume from Continue Reading
- **WHEN** a user clicks a document card on Continue Reading page
- **THEN** the document opens at the last saved position
- **AND** the reading session is tracked for statistics

### Requirement: Position Bookmarks
The system SHALL allow users to create bookmarks at specific positions within documents.

#### Scenario: Creating a bookmark
- **WHEN** a user presses Ctrl/Cmd + B while reading
- **THEN** a bookmark is created at the current position
- **AND** the user is prompted to name the bookmark
- **AND** the bookmark is stored in the bookmarks table

#### Scenario: Navigating to a bookmark
- **WHEN** a user selects a bookmark from the bookmarks list
- **THEN** the document viewer navigates to the bookmarked position
- **AND** the DocumentPosition is applied to restore the exact view

#### Scenario: Listing bookmarks
- **WHEN** a user views the bookmarks panel
- **THEN** all bookmarks for the current document are displayed
- **AND** each bookmark shows name, position, and creation date
- **AND** bookmarks are sortable by name or date

### Requirement: Reading Streaks
The system SHALL track reading streaks to encourage consistent reading habits.

#### Scenario: Daily reading streak calculation
- **WHEN** a user completes a reading session (documents read or time spent)
- **THEN** the system checks if this continues a daily streak
- **AND** the streak counter is incremented if yesterday also had activity
- **AND** the streak is reset to 1 if there was a gap day

#### Scenario: Streak visualization
- **WHEN** a user views the dashboard or stats
- **THEN** a heatmap shows reading activity over the past 365 days
- **AND** current streak count is prominently displayed
- **AND** streak milestones (7, 30, 100 days) trigger notifications

### Requirement: Reading Session Tracking
The system SHALL track reading sessions to calculate reading statistics and goals.

#### Scenario: Starting a reading session
- **WHEN** a user opens a document
- **THEN** a reading session record is created with start_time
- **AND** the session tracks document_id and start position

#### Scenario: Ending a reading session
- **WHEN** a user closes a document or switches to another
- **THEN** the reading session is updated with end_time and duration
- **AND** pages_read or progress made is recorded
- **AND** the session contributes to daily reading goals

### Requirement: Keyboard Shortcuts for Reading
The system SHALL provide keyboard shortcuts for common reading navigation actions.

#### Scenario: Quick bookmark creation
- **WHEN** a user presses Ctrl/Cmd + B
- **THEN** a bookmark is created at the current position
- **AND** a naming prompt is shown

#### Scenario: Resume reading shortcut
- **WHEN** a user presses Ctrl/Cmd + Shift + R
- **THEN** the most recently read document is opened
- **OR** the Continue Reading page is displayed if no recent document

#### Scenario: Navigation shortcuts
- **WHEN** a user presses Space or Shift + Space
- **THEN** the document scrolls down or up respectively
- **WHEN** a user presses J or K
- **THEN** the next or previous page is displayed (for paged content)
