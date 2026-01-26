# video-position Specification

## ADDED Requirements

### Requirement: Video Document Position Tracking
The system SHALL track and restore playback position for video documents using time-based position storage.

#### Scenario: Saving video position
- **WHEN** a user pauses or closes a video
- **THEN** the current playback time in seconds is saved
- **AND** the position is stored as DocumentPosition::Time { seconds: N }
- **AND** the position can be restored when reopening the video

#### Scenario: Restoring video position
- **WHEN** a user opens a previously watched video
- **THEN** the video player seeks to the saved playback time
- **AND** a "Resume from X:XX" message is displayed
- **AND** the user can choose to start from beginning instead

#### Scenario: Video progress calculation
- **WHEN** a video has position tracking data
- **THEN** the system calculates progress percentage as (current_time / total_duration)
- **AND** the progress is displayed on video thumbnails

### Requirement: Local Video File Support
The system SHALL support importing and playing local video files in common formats.

#### Scenario: Importing local video
- **WHEN** a user selects a video file (MP4, WebM, MKV)
- **THEN** the system imports the video as a document
- **AND** extracts metadata (duration, resolution, codec)
- **AND** generates a thumbnail preview

#### Scenario: Playing local video
- **WHEN** a user opens a local video document
- **THEN** a custom video player component is displayed
- **AND** the video plays using browser's native capabilities
- **AND** position is tracked for resuming

### Requirement: Video Timestamp Bookmarks
The system SHALL allow users to create bookmarks at specific timestamps within videos.

#### Scenario: Creating a timestamp bookmark
- **WHEN** a user presses B while watching a video
- **THEN** a bookmark is created at the current timestamp
- **AND** a frame capture is taken for the bookmark thumbnail
- **AND** the user is prompted to name the bookmark

#### Scenario: Navigating to timestamp bookmark
- **WHEN** a user clicks a timestamp bookmark
- **THEN** the video seeks to the bookmarked time
- **AND** playback resumes from that position

#### Scenario: Bookmark list display
- **WHEN** a user views the bookmarks panel for a video
- **THEN** all bookmarks are displayed with timestamps and thumbnails
- **AND** bookmarks are sorted chronologically

### Requirement: Video Chapter Detection
The system SHALL detect and display chapters for videos that include chapter metadata.

#### Scenario: Chapter detection for supported videos
- **WHEN** a video is imported that contains chapter metadata
- **THEN** chapters are extracted and stored
- **AND** a chapter list is displayed in the video player
- **AND** clicking a chapter seeks to that timestamp

#### Scenario: Manual chapter creation
- **WHEN** a video has no chapter metadata
- **THEN** the user can manually create chapter markers
- **AND** chapters are stored as user-generated data

### Requirement: Video Transcript Sync
The system SHALL synchronize transcripts with video playback for YouTube videos and local videos with caption files.

#### Scenario: Transcript display for YouTube
- **WHEN** a user watches a YouTube video with available transcript
- **THEN** the transcript is displayed alongside the video
- **AND** the current transcript segment is highlighted based on playback time
- **AND** clicking a transcript segment seeks the video to that position

#### Scenario: Importing video with captions
- **WHEN** a user imports a video file with accompanying captions (SRT, VTT)
- **THEN** the caption file is linked to the video
- **AND** transcripts are available for search and review
- **AND** clicking caption text seeks the video

### Requirement: Video Clip Extraction
The system SHALL allow users to extract clips from videos as separate extracts.

#### Scenario: Creating a video clip
- **WHEN** a user selects a start and end timestamp
- **THEN** the system creates a clip extract
- **AND** the clip includes the timestamp range and a thumbnail
- **AND** the clip can be converted to a learning item

#### Scenario: Clip playback
- **WHEN** a user opens a video clip extract
- **THEN** the video opens and plays only the selected segment
- **AND** the clip can be looped for repeated viewing

### Requirement: Review Cards from Video Captions
The system SHALL automatically generate review cards from video transcripts and captions.

#### Scenario: Auto-generating Q&A from transcript
- **WHEN** a video with transcript is imported
- **THEN** the system can generate Q&A items from the transcript
- **AND** questions are based on key concepts in the video
- **AND** answers reference the transcript with timestamps

#### Scenario: Cloze deletions from video
- **WHEN** a user creates a cloze deletion from a video
- **THEN** the cloze text includes a transcript segment
- **AND** reviewing the card links to the video timestamp
- **AND** the video segment plays during review

### Requirement: Video Playback Speed Control
The system SHALL support variable playback speed with pitch correction for efficient video consumption.

#### Scenario: Adjusting playback speed
- **WHEN** a user changes playback speed to 1.5x
- **THEN** the video plays faster with corrected audio pitch
- **AND** position tracking remains accurate at the adjusted speed

#### Scenario: Speed shortcuts
- **WHEN** a user presses keyboard shortcuts (e.g., > for faster, < for slower)
- **THEN** playback speed increases or decreases
- **AND** current speed is displayed in the player

### Requirement: Picture-in-Picture Mode
The system SHALL support picture-in-picture mode for video playback while taking notes or reviewing.

#### Scenario: Enabling PiP mode
- **WHEN** a user clicks the PiP button
- **THEN** the video enters picture-in-picture mode
- **AND** the user can navigate to other parts of the app
- **AND** the video continues playing in a floating window

### Requirement: Video Progress Indicator
The system SHALL display visual progress indicators for video documents.

#### Scenario: Progress bar on video thumbnail
- **WHEN** a video document is displayed in a grid or list
- **THEN** a progress bar shows completion percentage
- **AND** a timestamp shows current position (e.g., "12:34 / 45:00")

#### Scenario: Time remaining display
- **WHEN** a user watches a video
- **THEN** the player displays time remaining
- **AND** the display updates in real-time as playback progresses
