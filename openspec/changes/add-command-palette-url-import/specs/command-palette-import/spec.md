# command-palette-import Specification

## ADDED Requirements

### Requirement: URL detection in command palette
The system SHALL detect when a URL is entered in the command palette input and determine the content type.

#### Scenario: YouTube URL detected
- **WHEN** a user pastes or types a YouTube URL (youtube.com, youtu.be)
- **THEN** the system identifies it as a YouTube video
- **AND** displays a YouTube-specific import preview

#### Scenario: RSS feed URL detected
- **WHEN** a user pastes or types an RSS feed URL (contains /feed, .rss, .xml, or /atom)
- **THEN** the system identifies it as an RSS feed
- **AND** displays an RSS subscription preview

#### Scenario: Web page URL detected
- **WHEN** a user pastes or types any other http(s) URL
- **THEN** the system identifies it as a web page
- **AND** displays a web article import preview

#### Scenario: Non-URL input ignored
- **WHEN** a user types text that is not a valid URL
- **THEN** the system treats it as a regular search query
- **AND** normal search results are displayed

### Requirement: Metadata preview for URL imports
The system SHALL fetch and display a preview of the content before import.

#### Scenario: YouTube video preview
- **GIVEN** a detected YouTube URL
- **WHEN** the URL is entered in the command palette
- **THEN** the system fetches video metadata (title, channel, thumbnail, duration)
- **AND** displays a preview card with this information
- **AND** shows an "Import Video" action button

#### Scenario: RSS feed preview
- **GIVEN** a detected RSS feed URL
- **WHEN** the URL is entered in the command palette
- **THEN** the system fetches feed metadata (title, description, recent items)
- **AND** displays a preview with feed title and item count
- **AND** shows a "Subscribe to Feed" action button

#### Scenario: Web page preview
- **GIVEN** a detected web page URL
- **WHEN** the URL is entered in the command palette
- **THEN** the system fetches page metadata (title, description, favicon)
- **AND** displays a preview with page information
- **AND** shows an "Import Article" action button

#### Scenario: Fetch error handling
- **GIVEN** a detected URL that fails to fetch
- **WHEN** the metadata fetch fails
- **THEN** the system displays an error message in the preview
- **AND** offers a retry option
- **AND** allows the user to dismiss and try a different URL

### Requirement: Quick import from command palette
The system SHALL allow users to import the detected content without leaving the command palette.

#### Scenario: Import YouTube video
- **GIVEN** a YouTube URL preview is displayed
- **WHEN** the user activates the import action (click or Enter)
- **THEN** the system imports the YouTube video as a document
- **AND** fetches the transcript if available
- **AND** displays a success toast notification
- **AND** keeps the command palette open for additional imports

#### Scenario: Subscribe to RSS feed
- **GIVEN** an RSS feed URL preview is displayed
- **WHEN** the user activates the subscribe action
- **THEN** the system subscribes to the feed
- **AND** displays a success toast notification
- **AND** keeps the command palette open for additional imports

#### Scenario: Import web article
- **GIVEN** a web page URL preview is displayed
- **WHEN** the user activates the import action
- **THEN** the system imports the page as an article document
- **AND** displays a success toast notification
- **AND** keeps the command palette open for additional imports

#### Scenario: Import progress indication
- **GIVEN** an import action is in progress
- **WHEN** the import is processing
- **THEN** the system shows a loading indicator
- **AND** disables the import button
- **AND** prevents palette closure until complete

### Requirement: Import options configuration
The system SHALL allow quick configuration of import options before confirming.

#### Scenario: Quick tag assignment
- **GIVEN** a URL preview is displayed
- **WHEN** the user activates the tag input field
- **THEN** the system shows existing tags for selection
- **AND** allows typing new tag names
- **AND** applies selected tags to the imported item

#### Scenario: Collection selection
- **GIVEN** a URL preview is displayed
- **WHEN** the user activates the collection dropdown
- **THEN** the system shows available collections
- **AND** allows selecting a target collection for import

#### Scenario: Import without configuration
- **GIVEN** a URL preview is displayed
- **WHEN** the user presses Enter without configuring options
- **THEN** the system imports with default settings (no tags, default collection)

### Requirement: Batch import support
The system SHALL support importing multiple items in sequence without closing the palette.

#### Scenario: Sequential imports
- **GIVEN** a user has imported one item
- **WHEN** the import completes
- **THEN** the command palette remains open
- **AND** the input field is cleared and focused
- **AND** the user can immediately paste another URL

#### Scenario: Import notifications queue
- **GIVEN** a user imports multiple items quickly
- **WHEN** multiple imports complete
- **THEN** each import shows a toast notification
- **AND** notifications are stacked or queued for visibility
- **AND** each notification can be clicked to open the imported item

### Requirement: Duplicate detection
The system SHALL warn when importing content that already exists in the library.

#### Scenario: Duplicate YouTube video
- **GIVEN** a YouTube URL for an already imported video
- **WHEN** the URL is detected
- **THEN** the system shows a warning: "Already imported"
- **AND** offers to open the existing document
- **AND** offers to re-import (create duplicate)

#### Scenario: Duplicate RSS feed
- **GIVEN** an RSS feed URL for an already subscribed feed
- **WHEN** the URL is detected
- **THEN** the system shows a message: "Already subscribed"
- **AND** offers to navigate to the feed view

### Requirement: Keyboard-only operation
The system SHALL support full import workflow using only the keyboard.

#### Scenario: Paste and import workflow
- **GIVEN** the command palette is open (Ctrl+K)
- **WHEN** the user presses Ctrl+V to paste a URL
- **THEN** the URL is detected and preview shown
- **AND** pressing Enter imports immediately
- **AND** the palette clears for the next import

#### Scenario: Navigate import options
- **GIVEN** a URL preview is displayed
- **WHEN** the user presses Tab
- **THEN** focus moves to the tag input
- **AND** subsequent Tab presses move through import options
- **AND** Enter on any option activates it
