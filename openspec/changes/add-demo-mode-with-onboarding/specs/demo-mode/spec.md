## ADDED Requirements

### Requirement: Demo Mode Default State
The application SHALL start in an unauthenticated "demo mode" that allows users to use all core features without creating an account, storing all data locally in the browser.

#### Scenario: First-time user starts the app
- **WHEN** a user opens Incrementum in a web browser for the first time
- **THEN** the app loads in demo mode (unauthenticated state)
- **AND** a "Demo Mode" indicator is visible in the UI
- **AND** the user can create documents, extracts, and learning items
- **AND** all data is stored locally in IndexedDB

#### Scenario: Demo mode persistence across sessions
- **WHEN** a user in demo mode refreshes the page or closes and reopens the browser
- **THEN** all previously created data (documents, extracts, learning items, video positions) is restored
- **AND** the app remains in demo mode

### Requirement: Demo Mode Functionality
The application SHALL provide full core functionality in demo mode, with the limitation that data is stored locally and not synced across devices.

#### Scenario: Create document in demo mode
- **WHEN** a user in demo mode imports a document
- **THEN** the document is stored in IndexedDB
- **AND** the document is visible in the documents list

#### Scenario: YouTube position tracking in demo mode
- **WHEN** a user in demo mode watches a YouTube video
- **THEN** the current playback position is saved to IndexedDB every 5 seconds
- **AND** when the video is reloaded, playback resumes from the saved position

#### Scenario: Create extract in demo mode
- **WHEN** a user in demo mode creates an extract from a document
- **THEN** the extract is stored in IndexedDB
- **AND** the extract is associated with the correct document

#### Scenario: Create learning item in demo mode
- **WHEN** a user in demo mode creates a learning item
- **THEN** the learning item is stored in IndexedDB
- **AND** the learning item appears in the review queue

### Requirement: Demo Mode Visual Indicators
The application SHALL clearly indicate when the user is in demo mode, while allowing full functionality.

#### Scenario: Demo mode indicator in header
- **WHEN** a user is in demo mode
- **THEN** a "Local Mode" or "Demo" indicator is visible in the header
- **AND** clicking the indicator shows a tooltip explaining the benefits of signing up

#### Scenario: Demo mode in sync status
- **WHEN** a user views the sync status indicator
- **THEN** it displays "Local Mode" or "Demo" when unauthenticated
- **AND** it displays "Synced" when authenticated

### Requirement: Demo Mode to Account Migration
The application SHALL preserve all local demo mode data when a user creates an account or signs in.

#### Scenario: Migrate demo data on signup
- **WHEN** a user in demo mode creates a new account
- **THEN** all local IndexedDB data is preserved
- **AND** the data is synced to the server after successful registration
- **AND** the user's documents, extracts, and learning items remain accessible

#### Scenario: Migrate demo data on login
- **WHEN** a user in demo mode logs into an existing account
- **THEN** all local IndexedDB data is synced to the server
- **AND** any server-side data is merged with local data
- **AND** conflicts are resolved by preferring local data (demo user's recent work)

### Requirement: Return to Demo Mode After Logout
The application SHALL return to demo mode after logout, preserving any new local data created during the authenticated session.

#### Scenario: Logout returns to demo mode
- **WHEN** an authenticated user logs out
- **THEN** the app returns to demo mode
- **AND** the sync status indicator shows "Local Mode"
- **AND** the user can continue using the app with local storage
