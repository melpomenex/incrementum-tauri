## ADDED Requirements

### Requirement: Login Modal Access
The application SHALL provide access to the login modal from the main application interface.

#### Scenario: Open login from header
- **WHEN** an unauthenticated user clicks the "Sign In" button in the header
- **THEN** the LoginModal is displayed in login mode
- **AND** the user can enter email and password credentials

#### Scenario: Open signup from header
- **WHEN** an unauthenticated user clicks the "Sign In" button and selects "Create Account"
- **THEN** the LoginModal is displayed in register mode
- **AND** the user can enter email, password, and confirm password

### Requirement: User Menu for Authenticated Users
The application SHALL display a user menu when the user is authenticated.

#### Scenario: User menu content
- **WHEN** a user is authenticated
- **THEN** a user avatar or icon is displayed in the header
- **AND** clicking it reveals a dropdown menu with:
  - User's email address
  - "Settings" option
  - "Logout" option

#### Scenario: Logout from user menu
- **WHEN** an authenticated user clicks "Logout" in the user menu
- **THEN** the user is logged out
- **AND** the app returns to demo mode
- **AND** the user menu is replaced with a "Sign In" button
- **AND** the sync status indicator shows "Local Mode"

### Requirement: Auth State Persistence
The application SHALL maintain authentication state across page refreshes and browser sessions.

#### Scenario: Auth persists across refresh
- **WHEN** an authenticated user refreshes the page
- **THEN** the user remains authenticated
- **AND** the user menu is displayed
- **AND** the sync status indicator shows "Synced"

#### Scenario: Auth persists across browser sessions
- **WHEN** an authenticated user closes and reopens the browser
- **THEN** the user remains authenticated
- **AND** the JWT token is stored and reused

### Requirement: Authentication Success Callbacks
The application SHALL update the UI and trigger data sync upon successful authentication.

#### Scenario: Successful login
- **WHEN** a user successfully logs in
- **THEN** the LoginModal is closed
- **AND** the header updates to show the user menu
- **AND** the sync status indicator updates to "Synced"
- **AND** any local demo data is synced to the server

#### Scenario: Successful registration
- **WHEN** a user successfully creates an account
- **THEN** the LoginModal is closed
- **AND** the user is automatically logged in
- **AND** any local demo data is synced to the server
- **AND** the welcome/onboarding flow is marked as complete

### Requirement: Authentication Error Handling
The application SHALL display helpful error messages when authentication fails.

#### Scenario: Invalid credentials
- **WHEN** a user enters invalid email or password
- **THEN** an error message is displayed in the LoginModal
- **AND** the modal remains open for retry

#### Scenario: Network error
- **WHEN** authentication fails due to network issues
- **THEN** an error message explaining the network issue is displayed
- **AND** the user can retry or continue in demo mode

#### Scenario: Weak password on registration
- **WHEN** a user attempts to register with a password less than 8 characters
- **THEN** a validation error is displayed
- **AND** the modal remains open for correction

### Requirement: Sync Status Display
The application SHALL display the current sync status and provide access to sync controls.

#### Scenario: Sync status when authenticated
- **WHEN** a user is authenticated and sync is working
- **THEN** the sync status indicator shows "Synced"
- **AND** the indicator shows the last sync time
- **AND** clicking the indicator triggers a manual sync

#### Scenario: Sync status when demo mode
- **WHEN** a user is in demo mode (unauthenticated)
- **THEN** the sync status indicator shows "Local Mode"
- **AND** clicking the indicator shows a prompt to sign up

#### Scenario: Sync in progress
- **WHEN** a sync operation is in progress
- **THEN** the sync status indicator shows a spinner
- **AND** the text displays "Syncing..."

#### Scenario: Sync error
- **WHEN** a sync operation fails
- **THEN** the sync status indicator shows an error state
- **AND** clicking the indicator displays the error message
