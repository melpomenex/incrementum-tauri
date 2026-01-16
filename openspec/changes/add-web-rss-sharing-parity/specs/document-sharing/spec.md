# Document Sharing Specification

## Purpose
Enable users to share links to documents that preserve reading position, highlights, and extracts, allowing recipients to view the content in the same state.

## ADDED Requirements

### Requirement: Shareable Document URLs
The system SHALL generate shareable URLs that encode the document's reading state.

#### Scenario: Generate share link with reading position
- **GIVEN** the user is viewing a document
- **AND** the user has scrolled to page 42
- **WHEN** the user clicks the "Share" button
- **THEN** the system shall generate a URL encoding `pos=42` in the fragment
- **AND** the system shall copy the URL to clipboard

#### Scenario: Generate share link with highlights
- **GIVEN** the user has created highlights on a document
- **AND** the highlights have IDs "h1", "h2", and "h3"
- **WHEN** the user clicks the "Share" button
- **THEN** the system shall generate a URL with `highlights=h1,h2,h3` in the fragment
- **AND** opening the URL shall display the document with those highlights

#### Scenario: Generate share link with extracts
- **GIVEN** the user has saved extracts from a document
- **WHEN** the user clicks the "Share" button
- **THEN** the system shall generate a URL including extract IDs
- **AND** opening the URL shall display the document with those extracts visible

#### Scenario: Generate share link with video timestamp
- **GIVEN** the user is watching a YouTube video at timestamp 1:23 (83 seconds)
- **WHEN** the user clicks the "Share" button
- **THEN** the system shall generate a URL with `pos=83` in the fragment
- **AND** opening the URL shall start the video at 1:23

### Requirement: URL Fragment State Decoding
The system SHALL decode and restore reading state from URL fragments.

#### Scenario: Restore reading position from URL
- **GIVEN** a user opens a shared URL with `#pos=42`
- **WHEN** the document viewer initializes
- **THEN** the system shall scroll to page 42
- **AND** the viewer shall display the content from that position

#### Scenario: Restore highlights from URL
- **GIVEN** a user opens a shared URL with `#highlights=h1,h2,h3`
- **WHEN** the document viewer initializes
- **THEN** the system shall query the database for those highlights
- **AND** the viewer shall display the highlights on the document

#### Scenario: Restore video position from URL
- **GIVEN** a user opens a shared YouTube video URL with `#pos=83`
- **WHEN** the video player initializes
- **THEN** the player shall seek to 83 seconds
- **AND** the video shall be paused at that position

### Requirement: Combined State Sharing
The system SHALL support encoding multiple state parameters in a single URL.

#### Scenario: Share link with position, highlights, and extracts
- **GIVEN** the user is on page 42
- **AND** the user has highlights and extracts
- **WHEN** the user clicks the "Share" button
- **THEN** the URL shall include all state: `#pos=42&highlights=h1,h2&extracts=e1`
- **AND** opening the URL shall restore the complete reading state

### Requirement: Share Button UI
The system SHALL provide a share button in document and video viewers.

#### Scenario: Share button in document viewer
- **GIVEN** the user is viewing a PDF or text document
- **WHEN** the user looks at the toolbar
- **THEN** a "Share" button shall be visible
- **AND** clicking the button shall generate and copy a shareable link

#### Scenario: Share button in YouTube viewer
- **GIVEN** the user is watching a YouTube video
- **WHEN** the user looks at the video controls
- **THEN** a "Share" button shall be visible
- **AND** clicking the button shall generate a link with the current timestamp

### Requirement: Privacy and Permissions
The system SHALL respect document access permissions when generating share links.

#### Scenario: Private document sharing
- **GIVEN** the document is marked as private
- **WHEN** the user generates a share link
- **THEN** the system shall warn that the link requires authentication
- **AND** recipients must be logged in to view the content

#### Scenario: Public document sharing
- **GIVEN** the document is marked as public
- **WHEN** a recipient opens a share link
- **THEN** the system shall display the document without requiring login
- **AND** the reading state shall be restored

## MODIFIED Requirements

### Requirement: Document Viewer URL Routing
The existing document viewer SHALL support URL fragment parsing for state restoration.

#### Scenario: Parse fragment on page load
- **GIVEN** a user navigates to a document URL with a fragment
- **WHEN** the viewer component mounts
- **THEN** the viewer shall parse the URL fragment
- **AND** the viewer shall apply the encoded state
