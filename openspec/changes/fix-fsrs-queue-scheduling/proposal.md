# Change: Fix FSRS Queue Scheduling and Add Anna's Archive Book Search

## Why

Currently, the Scroll Mode Queue and other queue surfaces do NOT use FSRS for scheduling documents. Instead, they use a simple priority-based system (priority_rating, priority_slider) that doesn't properly schedule documents for incremental reading based on user's actual memory retention and learning patterns. Additionally, users lack an integrated way to search and download books from Anna's Archive directly within the application.

## What Changes

**Queue Scheduling (FSRS-based):**
- **BREAKING**: Replace the simple priority-based document queue with FSRS-based scheduling
- All queue surfaces (Scroll Mode, Queue Page, PWA, Webapp) will now use FSRS `next_reading_date` for document scheduling
- Due documents are determined by `next_reading_date <= now` instead of just priority scores
- Documents that have never been read (no `next_reading_date`) are prioritized for first reading
- Queue ordering uses FSRS metrics (stability, difficulty) as secondary sorting factors

**Anna's Archive Integration:**
- Add book search functionality using Anna's Archive database (61M+ books)
- Add direct book download/import from Anna's Archive URLs
- Integrate search UI in the Documents page and Command Center
- Support importing EPUB, PDF, and other common ebook formats

**Cross-Platform Parity:**
- Ensure FSRS scheduling works identically in Tauri, PWA, and Webapp
- Queue selector algorithm uses consistent FSRS-based priority calculation
- Mobile scroll mode benefits from the same FSRS scheduling

## Impact

- **Affected specs:** queue-scheduling (new), book-import (new capability)
- **Affected code:**
  - `src-tauri/src/commands/queue.rs` - queue generation logic
  - `src-tauri/src/algorithms/queue_selector.rs` - priority calculation
  - `src/pages/QueueScrollPage.tsx` - scroll mode queue usage
  - `src/stores/queueStore.ts` - queue state management
  - `src/api/queue.ts` - queue API calls
  - New: `src-tauri/src/commands/anna_archive.rs` - Anna's Archive integration
  - New: `src/api/anna-archive.ts` - frontend API for book search
  - New: `src/components/import/AnnaArchiveSearch.tsx` - search UI component
  - New: `src-tauri/src/integrations.rs` - integration utilities (book download)
