## ADDED Requirements

### Requirement: ViewState storage per document
The system SHALL persist a ViewState object per document using a stable document key and optional user/profile scoping.

#### Scenario: Store per-document state without collisions
- **WHEN** a user reads two different documents
- **THEN** each document's ViewState is stored under a distinct key

### Requirement: ViewState schema
The system SHALL store ViewState fields including docId, pageNumber, scale, updatedAt, and optional dest, rotation, viewMode, and fallback scroll values.

#### Scenario: Capture minimum required fields
- **WHEN** the user changes the reading position
- **THEN** the persisted ViewState includes docId, pageNumber, scale, and updatedAt

### Requirement: Anchored destination preference
The system SHALL prefer an anchored destination (PDF XYZ) when PDF.js integration is available and store it in ViewState.

#### Scenario: Store anchored dest from PDF.js
- **WHEN** the user scrolls in a PDF.js viewer with coordinate mapping support
- **THEN** the ViewState includes a dest object with XYZ coordinates

### Requirement: Fallback position persistence
The system SHALL persist a fallback position (scrollTop or scrollPercent) when an anchored destination is unavailable.

#### Scenario: Store fallback scroll position
- **WHEN** the viewer cannot compute a PDF destination
- **THEN** the ViewState stores scrollTop or scrollPercent alongside pageNumber

### Requirement: Debounced, coalesced writes
The system SHALL debounce ViewState writes and avoid persisting when no meaningful state changes occurred.

#### Scenario: Avoid excessive writes while scrolling
- **WHEN** the user scrolls continuously
- **THEN** the system writes ViewState no more than the configured rate and only when state changes

### Requirement: Deterministic restore sequence
The system SHALL restore ViewState by applying view parameters (scale, rotation, viewMode) before positioning, and only after layout readiness.

#### Scenario: Restore after layout initialization
- **WHEN** a document is reopened
- **THEN** the viewer applies scale and mode, waits for readiness, and then navigates to the stored position

### Requirement: Restore verification and retry
The system SHALL verify that the restored position matches the intended page/area and retry once if it does not.

#### Scenario: Retry when restore drifts
- **WHEN** the first restore lands outside the acceptable tolerance
- **THEN** the system performs a single retry after the next render tick

### Requirement: Storage key priority
The system SHALL use a stable document identifier in this order: app-level documentId, content hash when available, then PDF.js fingerprint.

#### Scenario: Select stable key for persistence
- **WHEN** a document has both an app id and a fingerprint
- **THEN** the app id is used for the ViewState key

### Requirement: Lifecycle-triggered save
The system SHALL save the most recent ViewState during lifecycle events such as visibility change, page hide, and route transitions.

#### Scenario: Save on visibility change
- **WHEN** the user switches tabs or minimizes the app
- **THEN** the system persists the latest ViewState

### Requirement: Backend sync extension
The system SHALL extend progress sync to include ViewState payloads while remaining backward-compatible with existing progress fields.

#### Scenario: Sync ViewState for cross-device restore
- **WHEN** ViewState is updated locally
- **THEN** the backend receives the new ViewState along with existing progress metadata

### Requirement: Corrupt or missing ViewState handling
The system SHALL fall back to page 1 if the stored ViewState is missing or invalid.

#### Scenario: Invalid stored state
- **WHEN** the stored ViewState cannot be parsed
- **THEN** the viewer opens on page 1 with default scale
