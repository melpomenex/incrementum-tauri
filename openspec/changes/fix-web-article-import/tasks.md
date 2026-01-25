# Tasks: Fix Web Article Import

## Overview
Implement web article import functionality by integrating existing UI components and utilities into the application flow.

## Implementation Tasks

### 1. UI Integration
**File**: src/routes/documents.tsx, src/components/documents/DocumentsView.tsx

- [x] Add "Import from URL" button to Documents view header
  - Place alongside existing "Import Document" button
  - Use Link icon from lucide-react
  - Trigger EnhancedFilePicker with URL source pre-selected

- [x] Integrate EnhancedFilePicker component
  - Import EnhancedFilePicker component
  - Add state for picker open/close
  - Implement onImport callback handler

- [x] Implement onImport callback
  - Handle "url" source: call store.importFromUrl(data.url)
  - Handle "arxiv" source: call store.importFromArxiv(data.url)
  - Handle "local" source: use existing importFromFiles flow
  - Show loading state during import
  - Display error messages on failure
  - Close picker on success

### 2. Store Layer Enhancement
**File**: src/stores/documentStore.ts

- [x] Add importFromUrl method to DocumentState interface
  ```typescript
  importFromUrl: (url: string) => Promise<Document>;
  ```

- [x] Implement importFromUrl in store
  - Set importing state and progress
  - Call importFromUrl utility from src/utils/documentImport.ts
  - Create document via documentsApi.createDocument
  - Add document to state
  - Assign to active collection if set
  - Handle errors with user-friendly messages
  - Clear importing state

- [x] Add importFromArxiv method to DocumentState interface
  ```typescript
  importFromArxiv: (arxivIdOrUrl: string) => Promise<Document>;
  ```

- [x] Implement importFromArxiv in store
  - Set importing state and progress
  - Call importFromArxiv utility from src/utils/documentImport.ts
  - Create document via documentsApi.createDocument
  - Add document to state
  - Assign to active collection if set
  - Handle errors with user-friendly messages
  - Clear importing state

### 3. Browser Mode CORS Proxy Support
**File**: src/lib/browser-backend.ts

- [x] Update fetch_url_content handler (currently throws error at line 909)
  - Remove the "needs CORS proxy" error throw
  - Implement CORS proxy fallback chain

- [x] Implement proxy fallback logic
  - Try direct fetch first (works for CORS-enabled resources)
  - Fall back to CORS proxies in order:
    1. https://api.allorigins.win/raw?url=
    2. https://corsproxy.io/?
    3. https://api.codetabs.com/v1/proxy?quest=
  - Stop at first successful response
  - Return error if all proxies fail

- [x] Handle response processing
  - Extract content-type from response headers
  - Generate filename from URL
  - Create Blob from response
  - Return FetchedUrlContent structure
  - For browser mode, file_path should be a virtual path like "browser-fetched://[hash]"

- [x] Store fetched content in browser file store
  - Generate unique ID for fetched content
  - Store Blob in IndexedDB via db.storeFile
  - Return virtual file path for document creation

### 4. Error Handling & User Feedback

- [x] Add error messages for common failure scenarios
  - Invalid URL format
  - Network timeout
  - HTTP 404 (not found)
  - HTTP 5xx (server error)
  - CORS failure (browser mode only)
  - Invalid Arxiv ID/URL

- [x] Implement loading states
  - Show "Fetching URL..." message during fetch
  - Display progress indicator
  - Disable import buttons during operation

- [x] Add success feedback
  - Show toast/notification on successful import
  - Navigate to imported document (optional)
  - Clear URL input field

### 5. Testing

- [x] Test URL import with direct PDF links
  - Verify document creation
  - Check file type detection
  - Confirm metadata (title, tags)

- [x] Test Arxiv import
  - Test with Arxiv URL (https://arxiv.org/abs/2301.07041)
  - Test with direct ID (2301.07041)
  - Verify PDF download and metadata extraction

- [x] Test browser mode URL fetching
  - Test with CORS-enabled URLs
  - Verify CORS proxy fallback
  - Confirm IndexedDB storage

- [x] Test error scenarios
  - Invalid URL format
  - Non-existent URL (404)
  - Network timeout
  - Invalid Arxiv ID

- [x] Test Tauri (desktop) mode
  - Verify direct HTTP fetch works
  - Confirm temporary file creation
  - Check document import flow

### 6. Documentation

- [x] Update USER_HANDBOOK.md if needed
  - Document URL import feature
  - Document Arxiv import feature
  - Note browser mode CORS limitations

- [x] Add inline code comments
  - Document CORS proxy strategy
  - Explain virtual file path handling in browser mode

## Dependencies
- Task 1 (UI Integration) must complete before Task 2 (Store Layer) ✓
- Task 3 (CORS Proxy) can be done in parallel with Task 2 ✓
- Task 4 (Error Handling) should be done alongside Tasks 1-3 ✓
- Task 5 (Testing) after all implementation tasks ✓
- Task 6 (Documentation) last ✓

## Definition of Done
- [x] URL import button visible and functional in Documents view
- [x] URLs successfully import as documents in both Tauri and browser modes
- [x] Arxiv papers import with complete metadata
- [x] Appropriate error messages shown for all failure modes
- [x] Loading states provide user feedback during fetch
- [x] Imported documents appear in library with correct metadata
- [x] All tests pass for both desktop and browser modes
