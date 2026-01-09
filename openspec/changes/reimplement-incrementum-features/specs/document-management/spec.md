# Document Management Specification

## ADDED Requirements

### Requirement: Multi-Format Document Import
The application MUST support importing documents from multiple formats including PDF, EPUB, URLs, Arxiv, Anki packages, and SuperMemo collections.

#### Scenario: Import PDF file
**Given** the user clicks "Import Document"
**When** they select a PDF file from the file picker
**Then** the PDF should be imported and processed
**And** metadata should be extracted (title, author, page count)
**And** the document should appear in the document list

#### Scenario: Import EPUB file
**Given** the user clicks "Import Document"
**When** they select an EPUB file from the file picker
**Then** the EPUB should be parsed and chapters extracted
**And** metadata should be extracted from the EPUB
**And** the table of contents should be available for navigation

#### Scenario: Import from URL
**Given** the user clicks "Import from URL"
**When** they enter a URL and click import
**Then** the content should be fetched and processed
**And** readable content should be extracted
**And** the document should be added to the library

#### Scenario: Import Arxiv paper
**Given** the user clicks "Import from Arxiv"
**When** they enter an Arxiv ID or URL
**Then** the paper metadata should be fetched from Arxiv API
**And** the PDF should be downloaded
**And** the paper should be imported with full metadata

#### Scenario: Import Anki package
**Given** the user clicks "Import Anki Deck"
**When** they select an .apkg file
**Then** the package should be unpacked
**And** cards should be converted to learning items
**And** media should be imported

#### Scenario: Import SuperMemo collection
**Given** the user clicks "Import SuperMemo"
**When** they select a SuperMemo collection file
**Then** the collection should be parsed
**And** items should be converted to the internal format
**And** preserve learning history if available

### Requirement: Document Viewing
The application MUST provide rich document viewing capabilities with navigation, annotations, and reading controls.

#### Scenario: View PDF document
**Given** a PDF document has been imported
**When** the user opens the document
**Then** the PDF should render with high quality
**And** support pan and zoom controls
**And** show page numbers and total pages
**And** allow single page and continuous scroll modes

#### Scenario: Navigate PDF by table of contents
**Given** a PDF document with table of contents is open
**When** the user clicks a chapter in the TOC
**Then** the viewer should jump to that page
**And** update the current page indicator

#### Scenario: View EPUB document
**Given** an EPUB document has been imported
**When** the user opens the document
**Then** chapters should be displayed in a reader-friendly format
**And** support chapter navigation via TOC
**And** respect EPUB styling and fonts

#### Scenario: Adjust font size and spacing
**Given** a document is open
**When** the user adjusts font size or line spacing
**Then** the document view should update immediately
**And** the preference should persist for that document type

### Requirement: Document Processing
The application MUST provide automatic document processing including segmentation, OCR, and content extraction.

#### Scenario: Auto-segment document on import
**Given** the user imports a long document
**When** auto-segmentation is enabled
**Then** the document should be automatically segmented
**And** use the configured segment strategy (semantic, paragraph, fixed, smart)
**And** create chunks based on the segment size setting

#### Scenario: Segment by semantic analysis
**Given** a document is selected for segmentation
**When** the user chooses "Semantic" segmentation strategy
**Then** the system should analyze content structure
**And** create segments at logical topic boundaries
**And** preserve semantic coherence

#### Scenario: Segment by fixed length
**Given** a document is selected for segmentation
**When** the user chooses "Fixed Length" strategy
**And** sets the word count to N
**Then** the document should be segmented into N-word chunks
**And** respect sentence boundaries

#### Scenario: Enable OCR for PDF
**Given** the user imports a scanned PDF
**When** OCR is enabled with a configured provider
**Then** the PDF should be converted to markdown/text
**And** preserve document structure
**And** make content searchable

#### Scenario: Use local OCR for privacy
**Given** the user has enabled "Prefer local OCR"
**When** they import a PDF
**Then** the system should use local OCR (Marker/Nougat) if available
**And** fall back to cloud OCR if local fails

#### Scenario: Extract mathematical content with Math OCR
**Given** a PDF contains mathematical equations
**When** Math OCR is enabled
**Then** equations should be OCR'd separately
**And** converted to LaTeX format
**And** made available for Q&A context

### Requirement: Annotations and Extracts
The application MUST support creating highlights, extracts, and cloze deletions from document content.

#### Scenario: Highlight text with color selection
**Given** a document is open
**When** the user selects text and chooses a highlight color
**Then** the selection should be highlighted in that color
**And** the highlight should be persisted
**And** appear in the extracts sidebar

#### Scenario: Create extract from selection
**Given** a document is open
**When** the user selects text and clicks "Create Extract"
**Then** an extract should be created with the selected text
**And** the user can add notes and tags
**And** the extract should appear in the extracts tree

#### Scenario: Create cloze deletion
**Given** an extract has been created
**When** the user selects text and clicks "Create Cloze"
**Then** a cloze card should be generated
**And** the selected text should be replaced with {{c1::answer}}
**And** the card should be added to the learning queue

#### Scenario: Batch create extracts
**Given** multiple documents are selected
**When** the user clicks "Batch Extract"
**Then** key phrases should be extracted from all documents
**And** extracts should be created automatically
**And** progress should be shown

#### Scenario: Edit existing extract
**Given** an extract exists in the system
**When** the user opens the extract editor
**Then** they can modify the extract content, notes, and tags
**And** changes should be saved immediately
**And** update related learning items

### Requirement: Document Organization
The application MUST provide tools for organizing documents including categories, tags, and search.

#### Scenario: Categorize document
**Given** a document exists in the library
**When** the user assigns it to a category
**Then** the document should appear under that category
**And** category-specific settings should apply (e.g., forgetting index)

#### Scenario: Tag document
**Given** a document exists in the library
**When** the user adds tags to it
**Then** the document should be searchable by those tags
**And** tags should appear in the tags sidebar
**And** allow filtering by tag

#### Scenario: Search documents
**Given** multiple documents exist in the library
**When** the user enters a search query
**Then** documents matching the title, content, or tags should appear
**And** results should be ranked by relevance
**And** support advanced filters (date, type, category)

### Requirement: Offline Support
The application MUST support saving and managing offline copies of documents.

#### Scenario: Save offline copy of web article
**Given** the user imports a document from URL
**When** they click "Save Offline Copy"
**Then** the full HTML content should be saved locally
**And** images should be downloaded
**And** the document should be available offline

#### Scenario: Manage storage for offline copies
**Given** multiple offline copies exist
**When** the user views storage settings
**Then** they should see total storage used
**And** be able to delete offline copies
**And** see which documents have offline copies

### Requirement: Document Queue Integration
The application MUST support adding documents to the learning queue with various scheduling options.

#### Scenario: Add document to queue
**Given** a document exists in the library
**When** the user clicks "Add to Queue"
**Then** the document should be added to the learning queue
**And** use the default scheduling settings

#### Scenario: Set priority for queued document
**Given** a document is in the queue
**When** the user sets a priority (1-5)
**Then** the document should be scheduled based on priority
**And** higher priority documents should appear first

#### Scenario: Schedule for incremental reading
**Given** a long document is in the library
**When** the user chooses "Incremental Reading"
**Then** the document should be segmented
**And** segments should be scheduled gradually
**And** extract-related segments should be scheduled together

### Requirement: Document Statistics
The application MUST track and display statistics for document reading and learning progress.

#### Scenario: View document statistics
**Given** a document is open
**When** the user views the statistics panel
**Then** they should see total reading time
**And** number of extracts created
**And** number of cards generated
**And** completion percentage

#### Scenario: Track reading progress
**Given** a document is being read
**When** the user scrolls through the document
**Then** the reading position should be saved
**And** progress percentage should update
**And** the document should open at the last position

## Implementation Notes

### File Storage Strategy
- Store original files in `documents/` directory
- Create `thumbnails/` subdirectory for preview images
- Use content hash for deduplication
- Support external storage paths (for large libraries)

### PDF Rendering
- Use PDF.js for web-based rendering
- Implement canvas-based rendering for performance
- Cache rendered pages
- Support text layer for selection and highlighting

### EPUB Parsing
- Use epub.js for rendering
- Extract and cache EPUB structure
- Support both reflowable and fixed-layout EPUBs
- Handle DRM-protected EPUBs (show error message)

### Metadata Extraction
- PDF: Extract from XMP metadata if available
- EPUB: Extract from OPF file
- Arxiv: Fetch from Arxiv API
- URL: Use Open Graph and meta tags

### Performance Optimizations
- Lazy load document pages
- Preload next/previous pages
- Cache extraction results
- Use web workers for OCR processing

### Error Handling
- Show clear error messages for corrupted files
- Allow retry for failed imports
- Log import errors for debugging
- Provide recovery options

## Cross-References

- **Learning System**: Extracts can be converted to learning items
- **Queue System**: Documents are added to learning queue
- **Search**: Full-text search across all documents
- **Statistics**: Document-level statistics contribute to overall stats
