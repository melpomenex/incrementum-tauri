## ADDED Requirements

### Requirement: First-Time User Detection
The application SHALL detect first-time users and display an onboarding flow.

#### Scenario: First visit detection
- **WHEN** a user opens Incrementum for the first time
- **THEN** the application checks for an onboarding completion flag in localStorage
- **AND** if not found, the onboarding flow is initiated

#### Scenario: Returning user skips onboarding
- **WHEN** a user who has completed onboarding opens Incrementum
- **THEN** the onboarding flow is not displayed
- **AND** the user is taken directly to the main app

### Requirement: Welcome Screen
The application SHALL display a welcome screen that introduces the app and its value proposition.

#### Scenario: Welcome screen content
- **WHEN** a first-time user opens the app
- **THEN** a welcome screen is displayed with:
  - App name and tagline
  - Brief description of what Incrementum does
  - Three key feature highlights (documents, extracts, spaced repetition)
  - A "Get Started" button

#### Scenario: Welcome screen navigation
- **WHEN** the user clicks "Get Started"
- **THEN** the welcome screen is dismissed
- **AND** the feature tour begins (if user chose tour)
- **OR** the main app is displayed (if user chose to skip)

### Requirement: Feature Tour
The application SHALL offer an optional guided tour of key features.

#### Scenario: Feature tour steps
- **WHEN** a user starts the feature tour
- **THEN** the tour displays steps for:
  - Importing documents (PDF, EPUB, YouTube)
  - Creating extracts
  - Creating learning items for spaced repetition
  - Using the review queue
  - Tracking progress

#### Scenario: Skip tour option
- **WHEN** the feature tour is displayed
- **THEN** a "Skip Tour" button is available on each step
- **AND** clicking "Skip Tour" dismisses the tour and shows the main app

#### Scenario: Complete tour
- **WHEN** a user completes all tour steps
- **THEN** the tour is dismissed
- **AND** the signup prompt is displayed

### Requirement: Signup Prompt
The application SHALL display a signup prompt that explains the benefits of creating an account while allowing users to continue in demo mode.

#### Scenario: Signup prompt content
- **WHEN** a user completes the welcome flow
- **THEN** a signup prompt is displayed with:
  - Headline: "Ready to sync across devices?"
  - Benefits list:
    - Access your data from any device
    - Automatic backup of your documents and progress
    - Sync learning progress across devices
  - "Create Account" button (opens LoginModal in register mode)
  - "Continue with Demo" button

#### Scenario: Choose to create account
- **WHEN** the user clicks "Create Account"
- **THEN** the LoginModal is displayed in register mode
- **AND** upon successful registration, local demo data is synced to the server

#### Scenario: Choose demo mode
- **WHEN** the user clicks "Continue with Demo"
- **THEN** the onboarding flow is marked as complete
- **AND** the main app is displayed in demo mode
- **AND** the user can still sign up later via the header

### Requirement: Onboarding Completion
The application SHALL mark onboarding as complete and allow users to dismiss the flow early.

#### Scenario: Mark onboarding complete
- **WHEN** a user completes any onboarding path (tour, skip, or signup)
- **THEN** a flag is set in localStorage (`incrementum_onboarding_complete: true`)
- **AND** subsequent visits do not show onboarding

#### Scenario: Dismiss onboarding early
- **WHEN** a user clicks outside the onboarding modal/overlay
- **THEN** the onboarding is dismissed
- **AND** the flag is NOT set (onboarding will show again on next visit)
- **AND** the user can still use the app normally

### Requirement: Onboarding Re-access
The application SHALL allow users to view the onboarding flow again from settings.

#### Scenario: Show onboarding again
- **WHEN** a user selects "Show Welcome Tour" in settings
- **THEN** the onboarding completion flag is temporarily ignored
- **AND** the welcome screen is displayed again
