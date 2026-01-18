# Changelog Entry

## [Unreleased]

### Changed - FSRS Queue Scheduling (BREAKING)

**Queue Scheduling System Overhaul:**

The queue scheduling system has been updated to use FSRS (Free Spaced Repetition Scheduler) as the primary scheduling mechanism for documents. This is a breaking change that affects how documents are ordered in all queue views.

**What's New:**
- Documents are now ordered primarily by FSRS `next_reading_date` instead of manual priority scores
- Due documents (`next_reading_date <= now`) appear first in the queue
- New documents (never read) appear next, ordered by user-set `priority_rating`
- Future-dated documents are excluded from the default queue view
- User `priority_rating` now acts as a multiplier (0.5x to 2.0x) on FSRS-calculated priority
- New queue filter modes: "Due Today", "All Items", "New Only", "Due All"
- Database index on `documents.next_reading_date` for improved performance

**Migration Guide:**
- Existing users may notice changes in queue order
- Documents that were previously prioritized by `priority_slider` may appear in different positions
- Use "All Items" view to see future-dated documents
- Adjust `priority_rating` values for fine-tuned control
- Settings → Smart Queues → FSRS-Based Queue Scheduling can be disabled to revert

**Settings:**
- Added: `smartQueue.useFsrsScheduling` (default: `true`)

### Added - Anna's Archive Integration

**Book Search and Import:**

Integrated Anna's Archive for direct book search and import within the application.

**Features:**
- Search 61M+ books from Anna's Archive database
- Filter by format (PDF, EPUB, MOBI, AZW3, DJVU, etc.)
- Direct download and import into your library
- Automatic mirror fallback for reliability
- Rate limiting with exponential backoff

**Commands:**
- `search_books(query, limit)` - Search for books
- `download_book(bookId, format, path)` - Download a book
- `get_available_mirrors()` - Get mirror domains

**Components:**
- `AnnaArchiveSearch` - Search and download UI component
- API client at `api/anna-archive.ts`

### Fixed

- Queue selector now properly sorts items by FSRS metrics (stability, difficulty)
- Fixed database index for efficient `next_reading_date` queries
- Fixed priority calculation to use FSRS `next_reading_date` as primary factor

### Technical

- Backend: `src-tauri/src/commands/anna_archive.rs` - New Anna's Archive module
- Backend: `src-tauri/src/algorithms/mod.rs` - Added `calculate_fsrs_document_priority()`
- Backend: `src-tauri/src/commands/queue.rs` - Added `get_due_documents_only()`, `get_due_queue_items()`
- Frontend: `src/api/anna-archive.ts` - New Anna's Archive API client
- Frontend: `src/components/import/AnnaArchiveSearch.tsx` - New search UI
- Frontend: `src/components/settings/SmartQueuesSettings.tsx` - Added FSRS toggle
- Frontend: `src/stores/queueStore.ts` - Added queue filter modes
- Frontend: `src/utils/reviewUx.ts` - Added FSRS scheduling info functions

**Dependencies:**
- Added: `urlencoding = "2.1"` to Cargo.toml

---

For detailed migration instructions, see `openspec/changes/fix-fsrs-queue-scheduling/MIGRATION_GUIDE.md`
