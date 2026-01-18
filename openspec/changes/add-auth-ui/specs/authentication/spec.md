## ADDED Requirements

### Requirement: User Login Interface
The system SHALL provide a user interface for users to log in with their email and password credentials.

#### Scenario: User opens login modal
- **WHEN** user clicks "Sign in" button
- **THEN** the login modal SHALL be displayed with email and password fields

#### Scenario: User successfully logs in
- **WHEN** user provides valid email and password credentials
- **THEN** the system SHALL authenticate the user and store the auth token
- **AND** the login modal SHALL close
- **AND** the user's email SHALL be displayed in the UI

#### Scenario: User fails login with invalid credentials
- **WHEN** user provides invalid email or password
- **THEN** the system SHALL display an error message in the modal
- **AND** the modal SHALL remain open

### Requirement: User Registration Interface
The system SHALL provide a user interface for users to register a new account.

#### Scenario: User switches to registration mode
- **WHEN** user clicks "Don't have an account? Sign up" link
- **THEN** the modal SHALL switch to registration mode
- **AND** a confirm password field SHALL be displayed

#### Scenario: User successfully registers
- **WHEN** user provides valid email, password, and matching confirm password
- **THEN** the system SHALL create a new account
- **AND** the user SHALL be automatically logged in
- **AND** the modal SHALL close

#### Scenario: User fails registration with mismatched passwords
- **WHEN** user provides passwords that do not match
- **THEN** the system SHALL display "Passwords do not match" error
- **AND** the modal SHALL remain open

### Requirement: User Logout Interface
The system SHALL provide a user interface for authenticated users to log out.

#### Scenario: User views authenticated state
- **WHEN** user is logged in
- **THEN** the system SHALL display a sync status indicator
- **AND** the user's avatar with first letter of email SHALL be shown
- **AND** a user menu SHALL be available on hover

#### Scenario: User logs out
- **WHEN** authenticated user clicks "Sign out" in the user menu
- **THEN** the system SHALL clear the stored auth token
- **AND** the user SHALL be logged out
- **AND** the UI SHALL update to show unauthenticated state

### Requirement: Authentication State Persistence
The system SHALL maintain authentication state across page reloads and app restarts.

#### Scenario: User returns to app after login
- **WHEN** user refreshes the page or restarts the app after logging in
- **THEN** the system SHALL restore the authentication state from stored token
- **AND** the user SHALL remain logged in if token is valid

#### Scenario: Token expires
- **WHEN** stored auth token has expired
- **THEN** the system SHALL clear the invalid token
- **AND** the user SHALL be logged out
- **AND** the UI SHALL show unauthenticated state

### Requirement: Sync Status Display
The system SHALL display the current sync status to authenticated users.

#### Scenario: User is not authenticated
- **WHEN** user is not logged in
- **THEN** the system SHALL display "Sign in to sync" button
- **AND** clicking it SHALL open the login modal

#### Scenario: User is authenticated and synced
- **WHEN** user is logged in and last sync was successful
- **THEN** the system SHALL display "Synced" status with checkmark icon
- **AND** the time since last sync SHALL be shown on hover

#### Scenario: Sync is in progress
- **WHEN** a sync operation is in progress
- **THEN** the system SHALL display "Syncing..." with spinner icon
- **AND** the sync button SHALL be disabled

#### Scenario: Sync has error
- **WHEN** last sync operation failed
- **THEN** the system SHALL display error status with alert icon
- **AND** the error message SHALL be shown on hover
