## 1. Backend Queue Scheduling (Tauri)

- [ ] 1.1 Refactor `get_queue()` to use FSRS `next_reading_date` as primary ordering factor
- [ ] 1.2 Update `QueueSelector::sort_queue_items()` to prioritize due documents by `next_reading_date`
- [ ] 1.3 Add `get_due_documents_only()` command for due-only queue view
- [ ] 1.4 Update priority calculation to use FSRS metrics (stability, difficulty) as secondary factors
- [ ] 1.5 Add user setting `use_fsrs_scheduling` with default `true`
- [ ] 1.6 Add database index on `documents.next_reading_date` for performance
- [ ] 1.7 Write tests for FSRS-based queue ordering
- [ ] 1.8 Update `get_next_queue_item()` to respect FSRS scheduling

## 2. Frontend Queue UI Updates

- [ ] 2.1 Update QueueScrollPage to use new FSRS-based queue
- [ ] 2.2 Update QueuePage to show "Due Today" as default view
- [ ] 2.3 Add queue filter toggles (Due Today, All Items, New Only)
- [ ] 2.4 Update queueStore to handle FSRS priority display
- [ ] 2.5 Add visual indicators for FSRS-scheduled items (icon/badge)
- [ ] 2.6 Update queue item cards to show FSRS metrics (stability, next review)
- [ ] 2.7 Add settings UI for FSRS scheduling toggle
- [ ] 2.8 Test queue ordering across all platforms (Tauri, PWA, Webapp)

## 3. Anna's Archive Backend Integration

- [ ] 3.1 Create `src-tauri/src/commands/anna_archive.rs` module
- [ ] 3.2 Implement `search_books()` command using Anna's Archive API
- [ ] 3.3 Implement `download_book()` command with progress tracking
- [ ] 3.4 Add mirror domain detection and fallback logic
- [ ] 3.5 Implement rate limiting with exponential backoff
- [ ] 3.6 Add error handling for network failures and API changes
- [ ] 3.7 Add book metadata parsing (title, author, year, format)
- [ ] 3.8 Write tests for Anna's Archive API integration
- [ ] 3.9 Register commands in `src-tauri/src/lib.rs`

## 4. Anna's Archive Frontend UI

- [ ] 4.1 Create `src/api/anna-archive.ts` API client
- [ ] 4.2 Create `src/components/import/AnnaArchiveSearch.tsx` search component
- [ ] 4.3 Add search input with autocomplete/suggestions
- [ ] 4.4 Add book results list with cover images and metadata
- [ ] 4.5 Add download button with progress indicator
- [ ] 4.6 Add format filter (EPUB, PDF, MOBI, etc.)
- [ ] 4.7 Add "Import to Library" action after download
- [ ] 4.8 Integrate search into Command Center (Cmd/Ctrl+K)
- [ ] 4.9 Add search button to Documents page toolbar
- [ ] 4.10 Handle mobile responsive design for search UI

## 5. Cross-Platform Parity (PWA/Webapp)

- [ ] 5.1 Update `src/lib/browser-backend.ts` with FSRS queue logic
- [ ] 5.2 Ensure PWA queue uses same FSRS ordering as Tauri
- [ ] 5.3 Test Anna's Archive search on mobile browsers
- [ ] 5.4 Verify offline fallback for cached queue data
- [ ] 5.5 Ensure consistent behavior across all platforms

## 6. Testing and Validation

- [ ] 6.1 Integration test: Queue ordering with FSRS scheduled documents
- [ ] 6.2 Integration test: New documents (no next_reading_date) appear first
- [ ] 6.3 Integration test: Overdue documents priority ordering
- [ ] 6.4 Integration test: Anna's Archive search and download flow
- [ ] 6.5 UI test: Scroll mode queue navigation with FSRS items
- [ ] 6.6 UI test: Queue page filters and sorting
- [ ] 6.7 Performance test: Queue loading with 1000+ documents
- [ ] 6.8 Cross-platform test: Verify consistent queue behavior
- [ ] 6.9 Manual QA: Test Anna's Archive download with various formats

## 7. Documentation and Migration

- [ ] 7.1 Update user documentation for FSRS queue scheduling
- [ ] 7.2 Add migration guide for existing users
- [ ] 7.3 Document Anna's Archive integration features
- [ ] 7.4 Add changelog entry for this change
- [ ] 7.5 Create settings explanation for FSRS scheduling toggle
