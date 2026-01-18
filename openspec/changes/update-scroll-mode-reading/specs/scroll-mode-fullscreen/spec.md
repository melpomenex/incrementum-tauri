## ADDED Requirements
### Requirement: Fullscreen Toggle in Scroll Mode
The system SHALL toggle application fullscreen when the user presses F11 while in Scroll Mode, and exit fullscreen on Esc.

#### Scenario: Enter fullscreen in Scroll Mode
- **Given** the user is in Scroll Mode
- **When** the user presses F11
- **Then** the application enters fullscreen

#### Scenario: Exit fullscreen in Scroll Mode
- **Given** the application is in fullscreen while in Scroll Mode
- **When** the user presses Esc
- **Then** the application exits fullscreen
