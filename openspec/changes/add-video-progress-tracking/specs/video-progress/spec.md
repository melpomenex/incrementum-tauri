# video-progress Specification

## Purpose
Enable users to resume video playback from their last viewed position, supporting long-form educational content and incremental learning workflows.

## ADDED Requirements

### Requirement: Video Timestamp Storage
The system SHALL store the current playback position for video and audio documents.

#### Scenario: Storing playback position during video viewing
- **Given** a user is watching a YouTube video
- **When** 10 seconds have elapsed during playback
- **Then** the system should save the current timestamp (in seconds) to the document's `current_timestamp` field
- **And** the timestamp should be persisted to the database

#### Scenario: Saving position on pause
- **Given** a user is watching a video
- **When** the user pauses playback
- **Then** the system should immediately save the current timestamp

#### Scenario: Saving position on navigation
- **Given** a user is watching a video
- **When** the user navigates away from the video
- **Then** the system should save the current timestamp before unmounting

### Requirement: Automatic Resume Playback
The system SHALL automatically seek to the saved timestamp when opening a previously viewed video.

#### Scenario: Resuming from saved position
- **Given** a user previously watched 5 minutes of a 30-minute video
- **When** the user opens the video again
- **Then** the video player should automatically seek to approximately 5:00
- **And** playback should remain paused (auto-play should not start)

#### Scenario: Handling completed videos
- **Given** a user has watched 95% or more of a video
- **When** the user opens the video again
- **Then** the system should ignore the saved timestamp and start from 0:00
- **And** the saved timestamp should be cleared

#### Scenario: First-time viewing
- **Given** a user opens a video for the first time
- **When** the video has no saved timestamp
- **Then** the video should start from 0:00

### Requirement: Timestamp Persistence
The system SHALL persist video timestamps across application sessions.

#### Scenario: Persistence across app restarts
- **Given** a user was watching a video at 10:30
- **When** the user closes and reopens the application
- **Then** the video should resume at approximately 10:30

#### Scenario: Database migration handling
- **Given** an existing database without the `current_timestamp` column
- **When** the migration is applied
- **Then** existing documents should have `current_timestamp` set to NULL
- **And** new documents should support timestamp storage

### Requirement: Progress Display
The system SHALL display the saved playback position in the UI.

#### Scenario: Showing resume position in document list
- **Given** a video has a saved timestamp at 12:34
- **When** the user views the document list
- **Then** the video should display "Resume at 12:34" or similar indicator

#### Scenario: Showing current position in player
- **Given** a user is watching a video
- **When** the video is playing
- **Then** the current timestamp should be displayed in the player controls (MM:SS format)

### Requirement: Timestamp Validation
The system SHALL validate timestamps before saving and seeking.

#### Scenario: Handling invalid timestamps
- **Given** a saved timestamp is negative or exceeds video duration
- **When** the video is loaded
- **Then** the system should ignore the invalid timestamp and start from 0:00

#### Scenario: Clamping to duration
- **Given** a saved timestamp is greater than 95% of duration
- **When** the video is loaded
- **Then** the system should treat the video as completed and start from 0:00

#### Scenario: Handling duration changes
- **Given** a video is re-imported with a different duration
- **When** the saved timestamp exceeds the new duration
- **Then** the system should clamp the timestamp to 95% of the new duration

### Requirement: Multi-Format Support
The system SHALL support timestamp tracking for all time-based media types.

#### Scenario: YouTube video timestamp
- **Given** a document with file_type "youtube"
- **When** the user watches and returns to the video
- **Then** the timestamp should be saved and restored

#### Scenario: Local video timestamp
- **Given** a document with file_type "video"
- **When** the user watches and returns to the video
- **Then** the timestamp should be saved and restored

#### Scenario: Audio file timestamp
- **Given** a document with file_type "audio"
- **When** the user listens and returns to the audio
- **Then** the timestamp should be saved and restored

### Requirement: Timestamp Reset
The system SHALL provide a way to reset the saved timestamp.

#### Scenario: Manual reset
- **Given** a video has a saved timestamp
- **When** the user explicitly chooses to restart the video
- **Then** the timestamp should be cleared from the database

#### Scenario: Completion detection
- **Given** a user reaches the end of a video (within 5%)
- **When** playback ends or user navigates away
- **Then** the timestamp should be cleared to mark completion
