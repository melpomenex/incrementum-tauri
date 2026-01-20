## ADDED Requirements
### Requirement: YouTube Progress Persistence in Scroll Mode
The system SHALL persist and restore YouTube playback position while navigating items in scroll mode.

#### Scenario: Restore playback position
- **GIVEN** a user has played a YouTube item in scroll mode
- **WHEN** the user navigates away and returns to the same item later
- **THEN** playback resumes near the last recorded position
