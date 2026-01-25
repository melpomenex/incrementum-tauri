# Capability: Web Article Import

## ADDED Requirements

### Requirement: URL Import Interface
The application MUST provide a user interface for importing documents from URLs that is accessible from the Documents view.

**Rationale**: Users need to import content from the web without downloading files manually. A dedicated UI entry point makes this feature discoverable and accessible.

#### Scenario: User opens URL import dialog
**Given** the user is on the Documents page
**When** the user clicks the "Import from URL" button
**Then** the EnhancedFilePicker dialog should open with the URL import source pre-selected
**And** the dialog should display a URL input field
**And** the dialog should display validation messages for invalid URLs

#### Scenario: User enters valid URL
**Given** the URL import dialog is open
**When** the user enters a valid HTTP/HTTPS URL
**Then** the URL should pass validation
**And** the "Import" button should be enabled
**And** no error message should be displayed

#### Scenario: User enters invalid URL
**Given** the URL import dialog is open
**When** the user enters an invalid URL (missing protocol, malformed, etc.)
**Then** the URL should fail validation
**And** an inline error message should explain the validation failure
**And** the "Import" button should be disabled

### Requirement: URL Import Execution
When a user initiates a URL import, the application MUST fetch the content from the URL and create a document with appropriate metadata.

**Rationale**: The core functionality of URL importing is fetching remote content and adding it to the user's library with proper classification.

#### Scenario: Successful PDF import from URL
**Given** the user has entered a direct PDF URL
**When** the user clicks the "Import" button
**Then** the application should fetch the PDF from the URL
**And** create a document with fileType "pdf"
**And** set the document title to the filename from the URL
**And** add tags including "web-import" and the hostname
**And** set the category to "Web Import"
**And** store the source URL in document metadata
**And** add the document to the user's library
**And** display a success message

#### Scenario: Successful HTML page import from URL
**Given** the user has entered a URL to an HTML page
**When** the user clicks the "Import" button
**Then** the application should fetch the HTML content
**And** create a document with fileType "html"
**And** set the document title derived from the URL path or hostname
**And** add tags including "web-import" and the hostname
**And** set the category to "Web Import"
**And** store the source URL in document metadata
**And** add the document to the user's library

#### Scenario: URL fetch fails with network error
**Given** the user has entered a URL
**When** the application attempts to fetch the URL and encounters a network error
**Then** the import should fail gracefully
**And** an error message should be displayed explaining the network failure
**And** the user should be offered a retry option
**And** no document should be created

#### Scenario: URL fetch fails with 404
**Given** the user has entered a URL
**When** the server returns a 404 Not Found status
**Then** the import should fail
**And** an error message should clearly indicate the resource was not found
**And** the URL input field should remain populated for correction

### Requirement: Arxiv Import Interface
The application MUST provide a user interface for importing academic papers from Arxiv that supports both Arxiv URLs and direct paper IDs.

**Rationale**: Arxiv is a major source of academic papers. Supporting both URLs and IDs makes importing flexible for different user workflows.

#### Scenario: User opens Arxiv import dialog
**Given** the user is on the Documents page
**When** the user selects "Arxiv Paper" from the import source options
**Then** the EnhancedFilePicker dialog should open with Arxiv source selected
**And** the dialog should display an input field for Arxiv URL or ID
**And** placeholder text should show example formats

#### Scenario: User enters Arxiv URL
**Given** the Arxiv import dialog is open
**When** the user enters a valid Arxiv URL (e.g., https://arxiv.org/abs/2301.07041)
**Then** the input should pass validation
**And** the Arxiv paper ID should be extracted from the URL
**And** the "Import" button should be enabled

#### Scenario: User enters Arxiv ID directly
**Given** the Arxiv import dialog is open
**When** the user enters a valid Arxiv ID (e.g., 2301.07041 or cs.AI/1234567)
**Then** the input should pass validation
**And** the "Import" button should be enabled

#### Scenario: User enters invalid Arxiv ID/URL
**Given** the Arxiv import dialog is open
**When** the user enters an invalid Arxiv ID or URL
**Then** the input should fail validation
**And** an error message should explain the expected format
**And** the "Import" button should be disabled

### Requirement: Arxiv Import Execution
When a user imports from Arxiv, the application MUST fetch paper metadata from the Arxiv API, download the PDF, and create a document with complete academic metadata.

**Rationale**: Academic papers require rich metadata (authors, abstract, categories) for proper organization and citation. Fetching from the Arxiv API ensures accuracy.

#### Scenario: Successful Arxiv import with metadata
**Given** the user has entered a valid Arxiv ID or URL
**When** the user clicks the "Import" button
**Then** the application should fetch metadata from the Arxiv API
**And** extract the paper title
**And** extract author names
**And** extract the abstract
**And** extract category information
**And** download the PDF from arxiv.org
**And** create a document with fileType "pdf"
**And** set the title to the paper title
**And** set content to the abstract
**And** add tags including "arxiv", "research", and up to 3 category tags
**And** set category to "Research Papers"
**And** store metadata including authors, arxivId, arxivUrl, pdfUrl
**And** set priorityScore to 7 (higher than default for research papers)
**And** add the document to the user's library
**And** display a success message

#### Scenario: Arxiv API fetch fails
**Given** the user has entered a valid Arxiv ID
**When** the Arxiv API request fails
**Then** the application should fall back to minimal metadata
**And** create the document with title "Arxiv Paper [id]"
**And** download the PDF using the ID directly
**And** complete the import with a warning about missing metadata

#### Scenario: Arxiv PDF download fails
**Given** the application has successfully fetched metadata from the Arxiv API
**When** the PDF download fails
**Then** the import should fail
**And** an error message should be displayed
**And** no partial document should be created

### Requirement: Browser Mode CORS Proxy
When running in browser mode, the application MUST use CORS proxy services to fetch URLs, with multiple proxy fallbacks for reliability.

**Rationale**: Browsers enforce CORS restrictions that prevent direct cross-origin requests. Public CORS proxies enable URL fetching in web mode without requiring a backend.

#### Scenario: Direct fetch succeeds (CORS-enabled resource)
**Given** the application is running in browser mode
**When** the user imports a URL from a CORS-enabled source
**Then** the application should attempt a direct fetch first
**And** if successful, skip the CORS proxies
**And** proceed to create the document

#### Scenario: Direct fetch fails, proxy succeeds
**Given** the application is running in browser mode
**When** a direct fetch fails due to CORS
**Then** the application should try the first CORS proxy (allorigins.win)
**And** if the proxy succeeds, fetch the content through it
**And** store the fetched blob in IndexedDB
**And** create the document with a virtual file path (browser-fetched://[id])

#### Scenario: All proxies fail
**Given** the application is running in browser mode
**When** direct fetch and all CORS proxies fail
**Then** the import should fail
**And** an error message should explain that browser mode has CORS limitations
**And** suggest using the desktop app for unrestricted URL importing
**And** provide information about which proxies were attempted

#### Scenario: Fetched content persisted in browser storage
**Given** a URL has been successfully fetched via CORS proxy in browser mode
**When** the content is stored
**Then** the blob should be saved in IndexedDB
**And** assigned a unique virtual file path
**And** remain accessible across page refreshes
**And** be retrievable for document viewing

### Requirement: Import Progress Feedback
During URL/Arxiv import operations, the application MUST provide visual feedback about the import progress and state.

**Rationale**: Network operations can be slow. Progress feedback keeps users informed and prevents confusion about whether the application is working.

#### Scenario: Loading state during fetch
**Given** the user has initiated a URL import
**When** the application is fetching content from the URL
**Then** the import button should be disabled
**And** a loading spinner should be displayed
**And** a status message should show "Fetching [URL]..."
**And** the dialog should remain open

#### Scenario: Progress updates for multi-step imports
**Given** the user is importing an Arxiv paper
**When** the application fetches metadata then downloads PDF
**Then** the status should update to show "Fetching paper metadata..." during step 1
**And** update to "Downloading PDF..." during step 2
**And** show a progress indicator if available

#### Scenario: Success feedback
**Given** a URL import has completed successfully
**When** the document is created
**Then** a success toast/notification should be displayed
**And** the import dialog should close
**And** the new document should appear in the documents list
**And** the import button should be re-enabled

#### Scenario: Error feedback with retry
**Given** a URL import has failed
**When** an error occurs
**Then** an error message should be displayed in the dialog
**And** the error message should explain what went wrong
**And** a "Try Again" button should be offered if retryable
**And** the URL input should remain populated
**And** the dialog should stay open

### Requirement: Document Store Integration
The document store MUST support URL and Arxiv import methods that integrate with existing document management patterns.

**Rationale**: Consistent store patterns ensure URL imports work seamlessly with collections, filters, and other document features.

#### Scenario: Imported document added to store state
**Given** a URL import has completed successfully
**When** the document is created
**Then** the document should be added to the documents array in store state
**And** the document should be immediately visible in the UI
**And** the document count should increment

#### Scenario: Imported document assigned to active collection
**Given** a collection is currently active
**When** a document is imported via URL
**Then** the document should be automatically assigned to the active collection
**And** appear in the collection's document list

#### Scenario: Import error updates store state
**Given** a URL import fails
**When** the error occurs
**Then** the store error state should be updated with the error message
**And** the isImporting flag should be set to false
**And** the error should be displayable in the UI

### Requirement: File Type Detection
When importing from a URL, the application MUST detect the file type from HTTP headers and URL extensions to correctly classify the document.

**Rationale**: Different file types require different viewers and handling. Accurate detection ensures proper document rendering.

#### Scenario: Detection from content-type header
**Given** a URL is being imported
**When** the HTTP response includes a content-type header
**Then** the application should parse the content-type
**And** set fileType to "pdf" for "application/pdf"
**And** set fileType to "epub" for "application/epub+zip"
**And** set fileType to "markdown" for "text/markdown"
**And** set fileType to "html" for "text/html"

#### Scenario: Detection from URL extension
**Given** a URL is being imported
**When** the content-type header is missing or generic
**Then** the application should parse the URL extension
**And** set fileType to "pdf" for .pdf extension
**And** set fileType to "epub" for .epub extension
**And** set fileType to "markdown" for .md or .markdown extensions
**And** set fileType to "html" for .html or .htm extensions

#### Scenario: Default to HTML for unknown types
**Given** a URL is being imported with no clear file type
**When** the content-type and extension don't match known types
**Then** the application should default to fileType "html"
**And** treat the content as a web page
