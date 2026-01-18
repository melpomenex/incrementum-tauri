# Spec: Sync Policy & Tier Enforcement

## ADDED Requirements

### Requirement: Tier-Based Sync
The system SHALL enforce synchronization limits based on the user's subscription tier.

#### Scenario: Free User File Sync
- **GIVEN** the user is on the "Free" tier
- **WHEN** the sync process attempts to upload a file (PDF, EPUB)
- **THEN** the upload SHALL be blocked/skipped
- **AND** the user SHALL be notified (if manually triggered) that file sync requires a Paid plan
- **BUT** metadata (documents, extracts, settings) SHALL still sync

#### Scenario: Paid User File Sync
- **GIVEN** the user is on the "Paid" tier
- **WHEN** the sync process runs
- **THEN** all data, including large files, SHALL be synchronized to the server

### Requirement: Demo to Account Transition
The system SHALL preserve user data when transitioning from Demo Mode to an Account.

#### Scenario: Signing up after using Demo
- **GIVEN** the user has created local documents/settings in Demo Mode
- **WHEN** they sign up or log in
- **THEN** the system SHALL upload/merge the local data to the new account
- **AND** "Keep settings intact" requirement is met

#### Scenario: Settings Preservation
- **WHEN** the user logs in
- **THEN** their local preferences (theme, UI settings) SHALL be preserved (or merged with server settings if newer)
