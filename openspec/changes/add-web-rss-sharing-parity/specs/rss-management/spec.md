# RSS Management Specification

## Purpose
Enable RSS feed subscription, management, and synchronization in the Web Browser App (PWA) with 1:1 feature parity to the Tauri desktop version.

## ADDED Requirements

### Requirement: RSS Feed Subscription
The system SHALL allow users to subscribe to RSS/Atom feeds in the Web Browser App.

#### Scenario: Subscribe to RSS feed via URL
- **GIVEN** the user is using the Web Browser App
- **WHEN** the user enters a valid RSS or Atom feed URL
- **THEN** the system shall fetch and parse the feed
- **AND** the system shall create a feed subscription in the database
- **AND** the system shall display the feed in the RSS reader

#### Scenario: Handle invalid feed URL
- **GIVEN** the user is using the Web Browser App
- **WHEN** the user enters an invalid or unreachable feed URL
- **THEN** the system shall display a clear error message
- **AND** the system shall not create a subscription

#### Scenario: Subscribe to feed with authentication
- **GIVEN** the feed requires HTTP authentication
- **WHEN** the user provides valid credentials
- **THEN** the system shall fetch the authenticated feed
- **AND** the system shall store credentials securely

### Requirement: OPML Import/Export
The system SHALL support importing and exporting RSS feed subscriptions via OPML format.

#### Scenario: Import feeds from OPML file
- **GIVEN** the user has an OPML file containing feed subscriptions
- **WHEN** the user uploads the OPML file
- **THEN** the system shall parse the OPML file
- **AND** the system shall create subscriptions for all valid feeds
- **AND** the system shall display the number of successfully imported feeds

#### Scenario: Export feeds to OPML file
- **GIVEN** the user has one or more RSS feed subscriptions
- **WHEN** the user initiates OPML export
- **THEN** the system shall generate an OPML file
- **AND** the system shall trigger a download of the OPML file
- **AND** the OPML file shall contain all subscribed feeds

#### Scenario: Handle duplicate feeds during import
- **GIVEN** the user imports an OPML file
- **WHEN** a feed in the OPML is already subscribed
- **THEN** the system shall skip the duplicate feed
- **AND** the system shall continue importing other feeds

### Requirement: Feed Synchronization
The system SHALL synchronize RSS feed state between the Tauri desktop app and Web Browser App.

#### Scenario: Sync subscriptions from desktop to web
- **GIVEN** the user has RSS subscriptions in the Tauri app
- **WHEN** the user logs into the Web Browser App
- **THEN** the system shall display all subscribed feeds
- **AND** the system shall preserve read/unread status

#### Scenario: Sync read status across platforms
- **GIVEN** the user marks an article as read in the Web Browser App
- **WHEN** the user opens the Tauri desktop app
- **THEN** the article shall be marked as read in the desktop app

### Requirement: RSS HTTP API Endpoints
The system SHALL expose RSS functionality via HTTP endpoints for the Web Browser App.

#### Scenario: Create feed via HTTP API
- **GIVEN** the Web Browser App is running
- **WHEN** the app sends a POST request to `/api/rss/feeds` with feed URL
- **THEN** the system shall return the created feed object
- **AND** the system shall persist the feed to the database

#### Scenario: List feeds via HTTP API
- **GIVEN** the Web Browser App is running
- **WHEN** the app sends a GET request to `/api/rss/feeds`
- **THEN** the system shall return all subscribed feeds
- **AND** each feed shall include unread count

#### Scenario: Fetch feed articles via HTTP API
- **GIVEN** the Web Browser App is running
- **WHEN** the app sends a GET request to `/api/rss/feeds/{id}/articles`
- **THEN** the system shall return articles for the specified feed
- **AND** the system shall include read status for each article
