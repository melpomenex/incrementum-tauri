## ADDED Requirements
### Requirement: Transcript Retrieval via yt-dlp
The system SHALL retrieve YouTube transcripts via yt-dlp in the backend and return time-aligned segments when available.

#### Scenario: Transcript available
- **Given** a YouTube document has captions available
- **When** the user opens the document
- **Then** the backend should return transcript segments with start times and durations

### Requirement: Transcript Caching and Persistence
The system SHALL cache and persist transcript data for YouTube documents and reuse cached results on subsequent loads.

#### Scenario: Transcript cached for subsequent load
- **Given** a YouTube document transcript was previously fetched
- **When** the user opens the document again
- **Then** the application should load the transcript from the cached data without re-running yt-dlp

### Requirement: Transcript Display in Viewer
The system SHALL display transcript content with timestamps in the YouTube viewer and show a clear empty state when no transcript exists.

#### Scenario: Transcript displayed
- **Given** transcript segments are available for a YouTube document
- **When** the user opens the transcript panel
- **Then** the transcript should render with timestamps and synchronized highlighting

#### Scenario: Transcript unavailable
- **Given** no transcript is available for a YouTube document
- **When** the user opens the transcript panel
- **Then** the viewer should show a message indicating the transcript is unavailable
