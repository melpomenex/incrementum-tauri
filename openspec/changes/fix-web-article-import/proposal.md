# Proposal: Fix Web Article Import

## Metadata
- **ID**: fix-web-article-import
- **Status**: Proposed
- **Created**: 2025-01-24
- **Author**: AI Assistant

## Problem Statement
The web article import functionality is currently non-functional. While the UI components (`EnhancedFilePicker`) exist and include URL/Arxiv import options, they are not integrated into the application flow. The current state is:

1. **UI Exists but Not Connected**: The `EnhancedFilePicker` component (src/components/documents/EnhancedFilePicker.tsx) has URL and Arxiv import options with input validation, but it's not used anywhere in the application.

2. **Import Utilities Available**: The `importFromUrl` and `importFromArxiv` functions exist in `src/utils/documentImport.ts` and are complete, implementing:
   - URL validation
   - Content fetching via `fetchUrlContent` API
   - Metadata extraction
   - Document creation with proper tagging

3. **Backend Support Exists**: Both Tauri and browser backends have the `fetch_url_content` command implemented (src-tauri/src/commands/document.rs:486 and src/lib/browser-backend.ts:909), though the browser version throws an error due to CORS limitations.

4. **Missing Integration**: The documents view (src/routes/documents.tsx and src/components/documents/DocumentsView.tsx) only supports file-based imports through `openFilePickerAndImport`, with no path for URL/Arxiv imports.

## Root Cause Analysis
The import flow has these gaps:
- **No Entry Point**: There's no button or UI action that opens the `EnhancedFilePicker` dialog
- **Missing Handler**: The `onImport` callback for URL/Arxiv sources is not implemented
- **Incomplete Store Function**: The document store lacks `importFromUrl` and `importFromArxiv` methods
- **No Error Handling**: Browser mode has CORS limitations for URL fetching that need addressing

## Proposed Solution

### Phase 1: UI Integration
Add URL/Arxiv import entry points to the Documents view:
- Add an "Import from URL" button alongside the existing "Import Document" button
- Integrate the `EnhancedFilePicker` component into DocumentsView and routes/documents.tsx
- Handle the `onImport` callback to route URL/Arxiv imports to appropriate handlers

### Phase 2: Store Layer Enhancement
Extend the document store to support URL-based imports:
- Add `importFromUrl(url: string): Promise<Document>` method
- Add `importFromArxiv(arxivIdOrUrl: string): Promise<Document>` method
- Connect these to the existing `importFromUrl` and `importFromArxiv` utilities
- Handle errors appropriately with user feedback

### Phase 3: Browser Mode CORS Proxy
Fix URL fetching in browser mode by implementing CORS proxy support:
- Similar to the RSS feed implementation (src/lib/browser-backend.ts:975-1021)
- Try multiple CORS proxy services with fallback
- Provide clear error messaging when all proxies fail
- Document this limitation for users

### Phase 4: Testing & Polish
- Test URL import with various content types (PDFs, HTML, markdown)
- Test Arxiv import with paper URLs and direct IDs
- Verify error handling for invalid URLs, network failures, and CORS issues
- Add loading states and progress indication
- Ensure imported documents appear correctly in the library

## Scope

### In Scope
1. URL import for web content (PDF, HTML, Markdown files from URLs)
2. Arxiv paper import (both URLs and direct IDs)
3. UI integration in Documents view
4. Store methods for URL/Arxiv imports
5. CORS proxy support for browser mode
6. Error handling and user feedback
7. Loading states during URL fetching

### Out of Scope
1. Content extraction from web pages (beyond fetching files)
2. Web scraping or article parsing
3. RSS feed import (already implemented separately)
4. YouTube video import (already implemented)
5. Anna's Archive import (already implemented)

## Alternatives Considered

### Alternative 1: Remove EnhancedFilePicker
Simply remove the unused component and rely solely on file-based imports.
- **Pros**: Cleaner codebase, less confusion
- **Cons**: Loses valuable functionality, inconsistent with feature set

### Alternative 2: Build New UI from Scratch
Create a simpler inline URL input field without the modal picker.
- **Pros**: Simpler UI, easier to implement
- **Cons**: Less discoverability, no unified import experience

**Decision**: Integrate the existing `EnhancedFilePicker` component as it provides a comprehensive, extensible import UI that matches the application's design.

## Success Criteria
- [x] "Import from URL" button available in Documents view
- [x] URL import successfully fetches and creates documents for direct file links
- [x] Arxiv import fetches PDFs with metadata (title, authors, abstract)
- [x] Browser mode uses CORS proxies for URL fetching
- [x] Appropriate error messages for invalid URLs, network failures, and CORS issues
- [x] Loading state shown during URL fetching
- [x] Imported documents appear in library with correct metadata and tags
- [x] Import flow works in both Tauri (desktop) and browser modes

## Dependencies
- Existing `EnhancedFilePicker` component
- Existing `importFromUrl` and `importFromArxiv` utilities
- Existing `fetchUrlContent` API
- Document store (src/stores/documentStore.ts)
- Documents view UI (src/routes/documents.tsx, src/components/documents/DocumentsView.tsx)

## Technical Notes

### Browser Mode CORS Limitations
The browser backend currently throws an error for `fetch_url_content` (src/lib/browser-backend.ts:909-914) due to CORS restrictions. The fix will:
1. Implement CORS proxy fallback chain (similar to RSS implementation)
2. Try direct fetch first (may work for CORS-enabled resources)
3. Fall back to public CORS proxies: allorigins.win, corsproxy.io, codetabs.com
4. Cache successful proxy responses for performance

### Error Handling Strategy
- Invalid URLs: Show validation error in UI (URL input has validation already)
- Network failures: Show error with retry option
- CORS failures (browser): Show explanation and suggest desktop app or alternative import method
- HTTP errors (404, 500, etc.): Show clear error message

### File Type Detection
The `fetchUrlContent` API returns content type from HTTP headers. The `importFromUrl` utility already handles:
- PDF (content-type: application/pdf or .pdf extension)
- EPUB (content-type: application/epub+zip or .epub extension)
- Markdown (content-type: text/markdown or .md/.markdown extension)
- HTML (content-type: text/html or .html/.htm extension)
- Default to HTML for unknown web content

## Implementation Notes
The `importFromUrl` function in src/utils/documentImport.ts:12 already implements:
- URL validation
- Content fetching
- File type detection
- Document creation with metadata
- Tagging with source URL and hostname

The `importFromArxiv` function in src/utils/documentImport.ts:71 already implements:
- Arxiv ID extraction (multiple formats)
- Metadata fetching from Arxiv API
- PDF download
- Document creation with academic paper metadata

Both functions return `Promise<Omit<Document, 'id'>>` and handle errors appropriately. The main work is connecting them to the UI and store layers.
