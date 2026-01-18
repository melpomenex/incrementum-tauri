## ADDED Requirements
### Requirement: Browser-Only Install Prompt
The system SHALL show the PWA install prompt only in browser environments and only when the app is installable and not already installed.

#### Scenario: Browser install prompt eligibility
- **WHEN** the app is running in a browser, is installable, and not already installed
- **THEN** the install prompt SHALL be shown upon the install prompt trigger event

#### Scenario: Tauri environment
- **WHEN** the app is running in Tauri
- **THEN** the install prompt SHALL NOT be shown
