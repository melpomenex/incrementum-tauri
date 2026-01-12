## ADDED Requirements

### Requirement: Extension connects to Browser Sync Server
The system SHALL allow the browser extension to send link and extract payloads to the desktop app via an HTTP POST endpoint on the loopback interface, defaulting to `127.0.0.1:8766`.

#### Scenario: Extension sends a page link
- **WHEN** the extension sends a POST payload with a URL and title to the configured Browser Sync Server
- **THEN** the desktop app accepts the request and responds with a success indicator

### Requirement: Extension configuration uses the standard port
The system SHALL expose a configurable host and port for the extension connection and initialize defaults to `127.0.0.1:8766`.

#### Scenario: User uses the default connection settings
- **WHEN** the extension is installed with no custom configuration
- **THEN** it targets `127.0.0.1:8766` for Browser Sync Server requests

### Requirement: Extension connection status is visible
The system SHALL provide a way to test and display the connection status between the extension and the Browser Sync Server.

#### Scenario: Extension tests connectivity
- **WHEN** the user runs the extension connection test
- **THEN** the extension reports a reachable or unreachable status based on the server response
