## ADDED Requirements

### Requirement: Anna's Archive Book Search
The system SHALL provide integrated search functionality for Anna's Archive, allowing users to discover books from a database of 60+ million titles without leaving the application.

#### Scenario: User searches for books by title or author
- **GIVEN** the user is on the Documents page or uses the Command Center
- **WHEN** the user enters a search query (title, author, ISBN, or keywords)
- **THEN** the application SHALL query the Anna's Archive API
- **AND** results SHALL include title, author, year, language, and available formats
- **AND** results SHALL include cover images when available
- **AND** the search SHALL complete within 5 seconds

#### Scenario: Search results include format filtering
- **GIVEN** the user has performed a book search
- **WHEN** the user applies format filters (EPUB, PDF, MOBI, etc.)
- **THEN** results SHALL be filtered to show only matching formats
- **AND** the filter UI SHALL show count of results per format
- **AND** multiple formats MAY be selected simultaneously

#### Scenario: Search handles rate limiting gracefully
- **GIVEN** the user has performed multiple rapid searches
- **WHEN** the Anna's Archive API rate limit is reached
- **THEN** the application SHALL display a rate limit warning
- **AND** the application SHALL implement exponential backoff for retries
- **AND** cached search results MAY be displayed if available

#### Scenario: Search fallback to mirror domains
- **GIVEN** the primary Anna's Archive domain is unavailable
- **WHEN** a search request fails
- **THEN** the application SHALL attempt fallback mirror domains
- **AND** the application SHALL maintain a list of known mirror URLs
- **AND** the user SHALL be notified if all mirrors are unavailable

### Requirement: Anna's Archive Book Download
The system SHALL allow users to download books directly from Anna's Archive search results and import them into their document library.

#### Scenario: User downloads a book from search results
- **GIVEN** the user has searched for books and found a desired title
- **WHEN** the user clicks the download button for a specific format
- **THEN** the application SHALL initiate the download
- **AND** a progress indicator SHALL show download status
- **AND** the downloaded file SHALL be automatically imported into the document library
- **AND** the document metadata (title, author) SHALL be pre-populated from Anna's Archive data

#### Scenario: Download progress is visible to user
- **GIVEN** a book download is in progress
- **WHEN** the user views the download
- **THEN** the application SHALL display progress percentage
- **AND** the application SHALL display estimated time remaining
- **AND** the user MAY cancel the download if needed

#### Scenario: Downloaded books are automatically categorized
- **GIVEN** a book has been successfully downloaded from Anna's Archive
- **WHEN** the book is imported into the library
- **THEN** the document SHALL be tagged with "anna-archive" source tag
- **AND** the document file type SHALL match the downloaded format (EPUB, PDF, etc.)
- **AND** the document category MAY be suggested based on the book's metadata

#### Scenario: Failed downloads are handled gracefully
- **GIVEN** a book download fails (network error, unavailable file, etc.)
- **WHEN** the download failure occurs
- **THEN** the application SHALL display an error message to the user
- **AND** the application SHALL offer retry or alternative format options
- **AND** partial downloads SHALL be cleaned up

### Requirement: Book Search Integration Points
The Anna's Archive search functionality SHALL be accessible from multiple entry points throughout the application for convenient access.

#### Scenario: Search available from Documents page toolbar
- **GIVEN** the user is viewing the Documents page
- **WHEN** the user looks at the page toolbar
- **THEN** a "Search Books" button SHALL be visible
- **AND** clicking the button SHALL open the Anna's Archive search panel
- **AND** the search panel SHALL overlay the current view

#### Scenario: Search available from Command Center
- **GIVEN** the user opens the Command Center (Cmd/Ctrl+K)
- **WHEN** the user types "search" or "books"
- **THEN** the Anna's Archive search SHALL appear as an option
- **AND** selecting the option SHALL open the search interface
- **AND** the Command Center input SHALL be used as the search query

#### Scenario: Mobile-optimized search interface
- **GIVEN** the user is on a mobile device (PWA)
- **WHEN** the user accesses the book search
- **THEN** the search interface SHALL be optimized for mobile screens
- **AND** touch targets SHALL be appropriately sized (minimum 44x44px)
- **AND** the search results SHALL be scrollable with touch gestures

### Requirement: Book Metadata Handling
The system SHALL correctly parse and store metadata from Anna's Archive search results to enrich the imported documents.

#### Scenario: Book metadata is imported with download
- **GIVEN** a book is selected from Anna's Archive search results
- **WHEN** the book is downloaded and imported
- **THEN** the following metadata SHALL be stored: title, author, year, language, publisher
- **AND** the metadata SHALL be searchable within the application
- **AND** the metadata SHALL be displayed in the document details panel

#### Scenario: Cover images are imported when available
- **GIVEN** a book from Anna's Archive has an associated cover image
- **WHEN** the book is imported
- **THEN** the cover image SHALL be downloaded and stored
- **AND** the cover SHALL be displayed in the Documents grid view
- **AND** the cover SHALL be displayed in the document viewer

### Requirement: Offline Fallback for Cached Searches
The system SHALL cache search results to provide basic functionality when offline or when Anna's Archive is temporarily unavailable.

#### Scenario: Cached search results available offline
- **GIVEN** the user has previously performed book searches
- **WHEN** the application is offline or Anna's Archive is unreachable
- **THEN** the application SHALL display cached search results
- **AND** the user SHALL be able to browse previously viewed books
- **AND** the application SHALL indicate that results are from cache

#### Scenario: Cache invalidation and freshness
- **GIVEN** cached search results exist
- **WHEN** the user performs a new search for the same query
- **THEN** the application SHALL fetch fresh results from Anna's Archive
- **AND** the cache SHALL be updated with the new results
- **AND** cache entries SHALL expire after 7 days
