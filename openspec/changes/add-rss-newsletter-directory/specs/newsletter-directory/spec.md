## ADDED Requirements

### Requirement: Newsletter Directory

The system SHALL provide a browsable directory of curated newsletter RSS feeds organized by category.

#### Scenario: Browse newsletter directory
- **WHEN** user navigates to the Newsletter Directory
- **THEN** display a list of newsletter categories
- **AND** allow user to browse newsletters within each category

#### Scenario: Search newsletters
- **WHEN** user enters a search query in the newsletter directory
- **THEN** filter newsletters by title, description, or author matching the query
- **AND** display matching results

#### Scenario: Subscribe from directory
- **WHEN** user clicks "Subscribe" on a newsletter in the directory
- **THEN** add the newsletter's RSS feed to user's subscriptions
- **AND** display success confirmation

### Requirement: Newsletter Feed Discovery

The system SHALL automatically discover RSS feed URLs from newsletter platform URLs.

#### Scenario: Discover Substack feed
- **WHEN** user provides a Substack newsletter URL (e.g., `https://author.substack.com`)
- **THEN** automatically detect and use the RSS feed at `https://author.substack.com/feed`

#### Scenario: Discover Beehiiv feed
- **WHEN** user provides a Beehiiv newsletter URL
- **THEN** automatically detect and use the RSS feed at `/feed`

#### Scenario: Discover Ghost blog feed
- **WHEN** user provides a Ghost blog URL
- **THEN** automatically detect and use the RSS feed at `/rss`

#### Scenario: Generic RSS discovery
- **WHEN** user provides any web URL
- **THEN** parse HTML for `<link rel="alternate" type="application/rss+xml">` or similar tags
- **AND** extract and use the discovered RSS feed URL

### Requirement: Newsletter Quick-Add UI

The system SHALL provide a prominent "Subscribe to Newsletter" interface.

#### Scenario: Newsletter entry point
- **WHEN** user views the main application
- **THEN** display a "Newsletters" button in the navigation or import area

#### Scenario: Newsletter URL input
- **WHEN** user enters a newsletter URL in the quick-add interface
- **THEN** attempt to discover the RSS feed automatically
- **AND** if successful, add the feed to subscriptions
- **AND** if unsuccessful, display helpful error message with instructions

### Requirement: Newsletter Categories

The system SHALL organize newsletters into categories for browsing.

#### Scenario: Category list
- **WHEN** user views the newsletter directory
- **THEN** display at least these categories: Technology, Science, Finance, Health, Business, Lifestyle, Politics, Arts

#### Scenario: Filter by category
- **WHEN** user selects a category
- **THEN** display only newsletters in that category

### Requirement: Curated Newsletter Data

The system SHALL include a curated list of popular newsletter RSS feeds.

#### Scenario: Pre-populated directory
- **WHEN** newsletter directory is first accessed
- **THEN** display at least 20 popular newsletters across categories
- **AND** each entry includes: title, description, author, RSS feed URL, category

#### Scenario: Newsletter metadata
- **GIVEN** a newsletter entry in the directory
- **THEN** it SHALL include: title, description, author name, RSS feed URL, category, platform (Substack/Beehiiv/etc)
