# web-import Specification Deltas

## ADDED Requirements

### Requirement: Enhanced Import Dialog
The system SHALL provide an enhanced import dialog with content preview, metadata extraction, and import options.

#### Scenario: URL import with preview
- **WHEN** a user enters a URL into the import dialog
- **THEN** the system fetches and analyzes the content
- **AND** displays a preview including title, author, word count, and reading time estimate
- **AND** shows a preview of the first few paragraphs

#### Scenario: Import options configuration
- **WHEN** content is loaded in the import dialog
- **THEN** the user can configure title, tags, collection, and priority
- **AND** the user can toggle auto-extraction of key passages
- **AND** the user can toggle automatic Q&A item generation
- **AND** the user can toggle automatic cloze deletion creation

### Requirement: Notion Page Import
The system SHALL support importing content from Notion pages via public URLs or API integration.

#### Scenario: Importing a public Notion page
- **WHEN** a user provides a public Notion page URL
- **THEN** the system fetches the page content
- **AND** preserves headings, lists, code blocks, and embedded images
- **AND** maintains document hierarchy (pages, sub-pages)

### Requirement: Medium Article Import
The system SHALL support importing articles from Medium with cleaned content extraction.

#### Scenario: Importing a Medium article
- **WHEN** a user provides a Medium article URL
- **THEN** the system extracts the article content
- **AND** removes Medium's UI elements (claps, responses, sidebar)
- **AND** preserves article formatting, code blocks, and images

### Requirement: Twitter/X Thread Import
The system SHALL support importing Twitter threads as readable documents.

#### Scenario: Importing a Twitter thread
- **WHEN** a user provides a tweet URL that is part of a thread
- **THEN** the system fetches all tweets in the thread
- **AND** arranges them in chronological order
- **AND** formats as a readable document with author attribution
- **AND** includes images and links from tweets

### Requirement: Reddit Post Import
The system SHALL support importing Reddit posts with optional comment inclusion.

#### Scenario: Importing a Reddit post
- **WHEN** a user provides a Reddit post URL
- **THEN** the system extracts the post title and content
- **AND** optionally includes top-voted comments
- **AND** preserves code blocks and links
- **AND** formats as a readable document

### Requirement: Substack Newsletter Import
The system SHALL support importing Substack newsletter posts.

#### Scenario: Importing a Substack post
- **WHEN** a user provides a Substack post URL
- **THEN** the system extracts the article content
- **AND** removes Substack's UI elements
- **AND** preserves author byline and publication date

### Requirement: Arxiv Paper Import Enhancement
The system SHALL enhance arXiv import with PDF download and metadata extraction.

#### Scenario: Importing an arXiv paper
- **WHEN** a user provides an arXiv paper URL
- **THEN** the system downloads the PDF
- **AND** extracts metadata (title, authors, abstract, publication date)
- **AND** categorizes under "Research Papers" collection by default

### Requirement: Auto-Tagging and Categorization
The system SHALL automatically suggest tags and categories based on content analysis.

#### Scenario: Tag suggestions from content
- **WHEN** content is loaded in the import dialog
- **THEN** the system analyzes keywords and topics
- **AND** suggests relevant tags based on existing user tags
- **AND** the user can accept, modify, or add tags before import

#### Scenario: Smart category assignment
- **WHEN** content is imported
- **THEN** the system assigns a suggested category based on content type and source
- **AND** research papers go to "Research Papers"
- **AND** newsletters go to "Articles"
- **AND** videos go to "Videos"

### Requirement: Browser Extension Quick Capture
The browser extension SHALL provide quick capture functionality with instant preview.

#### Scenario: One-click page capture
- **WHEN** a user clicks the extension icon
- **THEN** a popup shows the current page title and URL
- **AND** the user can click "Save" to immediately import
- **OR** click "Preview" to see content before importing

#### Scenario: Selection capture
- **WHEN** a user selects text on a page and clicks the extension
- **THEN** the popup shows the selected text
- **AND** the user can save just the selection as an extract
- **OR** save the full page with the selection highlighted

#### Scenario: Reading list queue
- **WHEN** a user selects "Add to queue" in the extension
- **THEN** the link is saved to a "To Read" collection
- **AND** the user can import the full content later
