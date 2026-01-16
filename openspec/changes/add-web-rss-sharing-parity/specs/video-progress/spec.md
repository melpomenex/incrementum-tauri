# Video Progress Specification

## Purpose
Ensure YouTube video position tracking works consistently in both the Tauri desktop app and Web Browser App, maintaining 1:1 feature parity.

## ADDED Requirements

### Requirement: Video Progress HTTP API
The system SHALL provide HTTP endpoints for saving and restoring video progress.

#### Scenario: Save video progress via HTTP
- **GIVEN** the Web Browser App is playing a YouTube video
- **WHEN** 5 seconds have elapsed since the last save
- **THEN** the app shall send a POST request to `/api/documents/:id/progress`
- **AND** the request shall include the current timestamp in seconds
- **AND** the system shall persist the progress to the database

#### Scenario: Load video progress via HTTP
- **GIVEN** a user opens a YouTube video in the Web Browser App
- **WHEN** the video player initializes
- **THEN** the app shall send a GET request to `/api/documents/:id`
- **AND** if `current_page` contains a timestamp, the player shall seek to that position

#### Scenario: Handle progress save errors gracefully
- **GIVEN** the Web Browser App attempts to save progress
- **WHEN** the HTTP request fails
- **THEN** the app shall continue playback without interruption
- **AND** the app shall retry saving on the next interval

### Requirement: Auto-Save Configuration
The system SHALL allow users to configure video progress auto-save behavior.

#### Scenario: Configure auto-save interval
- **GIVEN** the user is in settings
- **WHEN** the user sets the auto-save interval to 10 seconds
- **THEN** the Web Browser App shall save progress every 10 seconds
- **AND** the Tauri app shall also use this interval

#### Scenario: Disable auto-save
- **GIVEN** the user is in settings
- **WHEN** the user disables video progress auto-save
- **THEN** neither app shall automatically save progress
- **AND** progress shall only save on manual pause or exit

### Requirement: Cross-Platform Progress Sync
The system SHALL synchronize video progress between Tauri and Web Browser App.

#### Scenario: Start video in Tauri, continue in web
- **GIVEN** the user watches a video to 5:00 in the Tauri app
- **WHEN** the user opens the same video in the Web Browser App
- **THEN** the video shall start at 5:00
- **AND** the progress shall display the correct timestamp

#### Scenario: Start video in web, continue in Tauri
- **GIVEN** the user watches a video to 3:30 in the Web Browser App
- **WHEN** the user opens the same video in the Tauri app
- **THEN** the video shall start at 3:30
- **AND** the progress shall display the correct timestamp

## MODIFIED Requirements

### Requirement: YouTube Progress Tracking
The existing YouTube viewer SHALL maintain video position tracking functionality in the Web Browser App.

#### Scenario: Save progress on pause
- **GIVEN** the user is playing a YouTube video
- **WHEN** the user pauses the video
- **THEN** the current timestamp shall be saved to the database
- **AND** the `current_page` field shall be updated

#### Scenario: Save progress on interval
- **GIVEN** the user is playing a YouTube video
- **WHEN** the auto-save interval elapses
- **THEN** the current timestamp shall be saved to the database
- **AND** playback shall continue without interruption

#### Scenario: Restore progress on video load
- **GIVEN** the user has previously watched a video
- **AND** the video has saved progress at timestamp 120
- **WHEN** the user opens the video again
- **THEN** the video player shall seek to 2:00
- **AND** a "Resume from 2:00" message shall display

#### Scenario: Handle videos without progress
- **GIVEN** the user opens a new video
- **AND** no saved progress exists
- **WHEN** the video player initializes
- **THEN** the video shall start from the beginning
- **AND** no resume message shall display

### Requirement: Progress Persistence
The existing progress storage SHALL use consistent database schema.

#### Scenario: Store timestamp in current_page field
- **GIVEN** a YouTube video is at timestamp 250
- **WHEN** progress is saved
- **THEN** the `documents.current_page` field shall store 250
- **AND** the field shall be interpreted as seconds for video content

#### Scenario: Distinguish video from document progress
- **GIVEN** a document has `current_page` set
- **WHEN** the document type is `FileType::Youtube`
- **THEN** `current_page` shall represent a video timestamp in seconds
- **AND** for other file types, `current_page` shall represent a page number
