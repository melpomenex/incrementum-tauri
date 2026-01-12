## ADDED Requirements
### Requirement: Vimium Mode Control
The system SHALL provide a Vimium mode with the full default Vimium command set, enabling app-wide keyboard navigation and actions.

#### Scenario: User uses Vimium scrolling commands
- **Given** Vimium mode is enabled
- **When** the user presses the default scroll keys (e.g., j/k/h/l, gg/G)
- **Then** the app should scroll the active view accordingly

#### Scenario: User navigates via hints
- **Given** Vimium mode is enabled
- **When** the user activates link hints and types a hint sequence
- **Then** the targeted control should activate or open in a new tab based on the command

### Requirement: Vimium Hints and Command Execution UI
The system SHALL provide on-screen hints and a command execution interface so users can understand and invoke Vimium actions within the application.

#### Scenario: User opens the command execution UI
- **Given** Vimium mode is enabled
- **When** the user invokes the default command execution shortcut
- **Then** the app should display a command input UI listing available commands and execute the selected command
