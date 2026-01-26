# browser-extension-sync Specification Deltas

## MODIFIED Requirements

### Requirement: Browser Extension Connection
The system SHALL allow the browser extension to send link and extract payloads to the desktop app via an HTTP POST endpoint on the loopback interface, defaulting to `127.0.0.1:8766`, AND SHALL support cloud sync via readsync.org as a fallback when the local server is unavailable.

#### Scenario: Local server connection
- **WHEN** the desktop app is running and the extension sends a request to localhost:8766
- **THEN** the request is processed locally
- **AND** the extension displays "Connected to Local Server" status

#### Scenario: Cloud sync fallback
- **WHEN** the local server is unavailable
- **THEN** the extension attempts to connect to readsync.org
- **AND** the request is queued for later sync to the desktop app
- **AND** the extension displays "Connected to Cloud" status

#### Scenario: Connection status display
- **WHEN** the extension popup is opened
- **THEN** the current connection status is displayed (Local, Cloud, or Offline)
- **AND** a green indicator shows active sync
- **AND** pending sync count is displayed

### Requirement: Configurable Host and Port
The system SHALL expose a configurable host and port for the extension connection and initialize defaults to `127.0.0.1:8766`, AND SHALL support cloud sync configuration via readsync.org API endpoint.

#### Scenario: Cloud sync configuration
- **WHEN** a user configures cloud sync in settings
- **THEN** the system stores the readsync.org API endpoint
- **AND** authentication credentials are stored securely
- **AND** the extension uses these credentials for cloud sync

### Requirement: Connection Status Testing
The system SHALL provide a way to test and display the connection status between the extension and the Browser Sync Server, including cloud sync status.

#### Scenario: Testing local connection
- **WHEN** a user runs the connection test
- **THEN** the extension attempts to reach localhost:8766
- **AND** reports "Local server reachable" or "Local server unavailable"

#### Scenario: Testing cloud connection
- **WHEN** a user runs the connection test
- **THEN** the extension attempts to reach readsync.org
- **AND** reports authentication status and sync capability

## ADDED Requirements

### Requirement: Offline Sync Queue
The browser extension SHALL queue operations when both local server and cloud sync are unavailable, and sync when connectivity is restored.

#### Scenario: Offline capture
- **WHEN** a user captures content while offline
- **THEN** the capture is stored in the extension's offline queue
- **AND** the user sees "Queued for sync" status
- **AND** the queue persists across browser sessions

#### Scenario: Sync on reconnect
- **WHEN** connectivity is restored (local or cloud)
- **THEN** queued items are automatically synced
- **AND** the user is notified of successful sync
- **AND** failed items remain in queue for retry

#### Scenario: Queue management
- **WHEN** a user opens the extension popup
- **THEN** the number of pending items is displayed
- **AND** the user can view and manage queued items
- **AND** the user can manually trigger sync

### Requirement: Cross-Device Position Sync
The system SHALL sync reading positions across devices via cloud storage.

#### Scenario: Position sync to cloud
- **WHEN** a user updates their reading position
- **THEN** the position is sent to the cloud sync service
- **AND** other devices can retrieve the latest position

#### Scenario: Position restore from cloud
- **WHEN** a user opens a document on a different device
- **THEN** the system fetches the latest position from cloud
- **AND** the document opens at the synced position

#### Scenario: Conflict resolution
- **WHEN** positions are updated on multiple devices simultaneously
- **THEN** the system uses last-write-wins based on timestamps
- **AND** the user is notified of the conflict resolution

### Requirement: In-Page Reading Mode
The browser extension SHALL provide a distraction-free reading mode for web pages.

#### Scenario: Activating reading mode
- **WHEN** a user activates reading mode on a web page
- **THEN** the page is transformed into a clean, readable format
- **AND** ads, sidebars, and navigation are removed
- **AND** the content is displayed in a reader-friendly font and layout

#### Scenario: Reading mode position tracking
- **WHEN** a user scrolls in reading mode
- **THEN** the scroll position is tracked
- **AND** the position is synced to the desktop app
- **AND** the user can resume reading in the desktop app

### Requirement: In-Page Highlighting
The browser extension SHALL allow users to highlight text on web pages and sync highlights to Incrementum.

#### Scenario: Creating a highlight
- **WHEN** a user selects text and chooses "Highlight"
- **THEN** the text is highlighted with a yellow background
- **AND** the highlight is stored with position data
- **AND** the highlight is synced to the desktop app

#### Scenario: Synced highlights display
- **WHEN** a user views the document in the desktop app
- **THEN** web highlights are displayed as extracts
- **AND** the user can convert highlights to learning items

### Requirement: Extension Quick Capture UI
The browser extension SHALL provide an enhanced popup UI for quick content capture.

#### Scenario: Enhanced popup display
- **WHEN** a user clicks the extension icon
- **THEN** the popup shows current page title and URL
- **AND** connection status is displayed (Local/Cloud/Offline)
- **AND** pending sync count is shown
- **AND** quick actions are available: Save Page, Save Selection, Add to Queue

#### Scenario: Save with tags
- **WHEN** a user saves a page
- **THEN** the popup allows adding tags before saving
- **AND** tag suggestions are displayed based on page content
- **AND** the user can select a collection for organization

### Requirement: Auto-Bookmark Sync
The browser extension SHALL sync bookmarks from the browser to Incrementum collections.

#### Scenario: Bookmark sync
- **WHEN** a user creates a browser bookmark
- **THEN** the bookmark is optionally synced to Incrementum
- **AND** the bookmark appears in a "Browser Bookmarks" collection
- **AND** the user can import the full page content later
