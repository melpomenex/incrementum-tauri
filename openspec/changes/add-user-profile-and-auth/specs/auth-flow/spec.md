# Spec: Authentication Flow

## ADDED Requirements

### Requirement: Default Demo Mode
The application SHALL default to "Demo Mode" when no user is authenticated.

#### Scenario: First launch
- **GIVEN** the user has installed the app
- **WHEN** they launch it for the first time
- **THEN** they SHALL immediately land in the main application interface (not a login screen)
- **AND** a "Demo Mode" or "Guest" indicator SHALL be visible

#### Scenario: Demo functionality
- **GIVEN** the user is in Demo Mode
- **THEN** all features SHALL function using local storage
- **AND** no data SHALL be sent to the server

### Requirement: User Authentication
The system SHALL provide mechanisms for users to sign up and log in.

#### Scenario: Sign up with Email
- **WHEN** the user chooses to sign up with email
- **THEN** they SHALL provide email and password
- **AND** the system SHALL create a new account with "Free" tier by default

#### Scenario: Sign up with OAuth
- **WHEN** the user chooses "Sign in with Google" (or other providers)
- **THEN** the system SHALL redirect to the provider's auth page
- **AND** upon successful callback, create an account (if new) or log in (if existing)

### Requirement: Authentication State Persistence
The system SHALL persist authentication state.

#### Scenario: App restart
- **GIVEN** the user was logged in
- **WHEN** they restart the app
- **THEN** they SHALL remain logged in

#### Scenario: Explicit Logout
- **WHEN** the user clicks "Log out"
- **THEN** the system SHALL clear authentication tokens
- **AND** the app SHALL revert to Demo Mode (or prompt to clear local data)
