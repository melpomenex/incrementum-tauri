# search-discovery Specification

## ADDED Requirements

### Requirement: Full-Text Search
The system SHALL provide full-text search across documents, extracts, and learning items using SQLite FTS5.

#### Scenario: Searching document titles and content
- **WHEN** a user enters a search query "machine learning"
- **THEN** the system searches across document titles and extract content
- **AND** results are ranked by relevance
- **AND** each result shows the matching document and highlighted text

#### Scenario: Phrase search
- **WHEN** a user enters a query in quotes "neural network architecture"
- **THEN** the system searches for the exact phrase
- **AND** results contain the exact phrase in order

#### Scenario: Boolean search
- **WHEN** a user enters "machine AND learning" or "ML OR AI"
- **THEN** the system applies boolean logic to filter results
- **AND** AND requires both terms, OR requires either term

### Requirement: Search Indexing
The system SHALL maintain a full-text search index that updates when documents are imported or modified.

#### Scenario: Index on document import
- **WHEN** a new document is imported
- **THEN** its title and extract content are added to the search index
- **AND** the index updates incrementally (not a full rebuild)

#### Scenario: Index on extract creation
- **WHEN** a new extract is created
- **THEN** the extract content is immediately added to the search index
- **AND** search results include the new extract

#### Scenario: Index on content modification
- **WHEN** an extract's content is modified
- **THEN** the search index is updated for that extract
- **AND** old content is removed, new content is added

### Requirement: Search Results Display
The system SHALL display search results with context and relevance indicators.

#### Scenario: Results ranking
- **WHEN** search results are displayed
- **THEN** results are ordered by relevance score
- **AND** higher-ranked results appear first
- **AND** a relevance score indicator shows match quality

#### Scenario: Result preview
- **WHEN** a search result is displayed
- **THEN** a preview shows the matching text with search terms highlighted
- **AND** the document title and extract location are shown
- **AND** clicking the result opens the document at the matching position

#### Scenario: Results grouping
- **WHEN** multiple matches exist in the same document
- **THEN** results are grouped by document
- **AND** each group shows the number of matches
- **AND** groups can be expanded to show individual matches

### Requirement: Advanced Search Filters
The system SHALL provide filters to refine search results by tag, collection, date, and document type.

#### Scenario: Filter by tag
- **WHEN** a user selects a tag filter "python"
- **THEN** search results are limited to documents with that tag
- **AND** the filter can be combined with search query

#### Scenario: Filter by collection
- **WHEN** a user selects a collection filter "Research Papers"
- **THEN** search results are limited to documents in that collection
- **AND** sub-collections are included in the filter

#### Scenario: Filter by date range
- **WHEN** a user selects a date range filter "last 30 days"
- **THEN** search results are limited to documents added or modified in that range

#### Scenario: Filter by document type
- **WHEN** a user selects a type filter "PDF"
- **THEN** search results are limited to PDF documents only

### Requirement: Search Query Syntax
The system SHALL support advanced query syntax for power users.

#### Scenario: Wildcard search
- **WHEN** a user enters "learn*" (with asterisk)
- **THEN** the system searches for words starting with "learn" (learn, learning, learned, etc.)

#### Scenario: Negation
- **WHEN** a user enters "machine learning -deep"
- **THEN** results include "machine learning" but exclude "deep learning"

#### Scenario: Field-specific search
- **WHEN** a user enters "title:Introduction"
- **THEN** the search is limited to document titles only
- **AND** "content:neural" searches only in content/text

### Requirement: Search Autocomplete
The system SHALL provide search suggestions and autocomplete as the user types.

#### Scenario: Query suggestions
- **WHEN** a user types "mac"
- **THEN** suggestions show "machine learning", "macro", "macOS" etc.
- **AND** suggestions are based on existing document content
- **AND** selecting a suggestion executes that search

#### Scenario: Recent searches
- **WHEN** a user clicks in the search bar
- **THEN** recent searches are displayed
- **AND** clicking a recent search re-executes it
- **AND** recent searches can be cleared

### Requirement: Search in Command Palette
The system SHALL integrate search functionality into the command palette.

#### Scenario: Quick search from command palette
- **WHEN** a user opens the command palette and types a search query
- **THEN** if no commands match, the query is treated as a document search
- **AND** search results are displayed in the palette
- **AND** pressing Enter opens the selected result

#### Scenario: Search command prefix
- **WHEN** a user types "/" in the command palette
- **THEN** the palette switches to search mode
- **AND** the input is dedicated to document search

### Requirement: Search Performance
The system SHALL provide fast search results even with large document libraries.

#### Scenario: Fast search results
- **WHEN** a user enters a search query
- **THEN** results are displayed within 500ms for up to 10,000 documents
- **AND** results are paginated for very large result sets

#### Scenario: Debounced search input
- **WHEN** a user types rapidly in the search bar
- **THEN** search is triggered after a 300ms pause in typing
- **AND** this prevents excessive search queries

### Requirement: Search Index Management
The system SHALL provide options for managing the search index.

#### Scenario: Index size display
- **WHEN** a user views search settings
- **THEN** the size of the search index is displayed
- **AND** the number of indexed documents is shown

#### Scenario: Rebuild index
- **WHEN** a user clicks "Rebuild Search Index"
- **THEN** the index is rebuilt from scratch
- **AND** progress is displayed during the rebuild
- **AND** the user is notified when complete

#### Scenario: Exclude documents from search
- **WHEN** a user marks a document as "private" or "no-search"
- **THEN** the document is excluded from the search index
- **AND** it won't appear in any search results

### Requirement: Search Within Document
The system SHALL provide search functionality within a specific document viewer.

#### Scenario: In-document search
- **WHEN** a user presses Ctrl/Cmd + F while viewing a document
- **THEN** a search bar appears within the viewer
- **AND** typing highlights all matches in the document
- **AND** Enter navigates between matches

#### Scenario: Search result navigation
- **WHEN** multiple matches exist in a document
- **THEN** the user can navigate with Enter/Shift+Enter
- **AND** the current match is highlighted distinctly
- **AND** a match count shows "3 of 12"

### Requirement: Saved Searches
The system SHALL allow users to save frequently used searches for quick access.

#### Scenario: Saving a search
- **WHEN** a user executes a search and clicks "Save Search"
- **THEN** the user is prompted to name the saved search
- **AND** the search query and filters are saved
- **AND** the saved search appears in a sidebar or menu

#### Scenario: Running a saved search
- **WHEN** a user selects a saved search from the menu
- **THEN** the saved query and filters are applied
- **AND** current results are displayed

#### Scenario: Managing saved searches
- **WHEN** a user views saved searches in settings
- **THEN** they can rename or delete saved searches
- **AND** saved searches can be reordered
