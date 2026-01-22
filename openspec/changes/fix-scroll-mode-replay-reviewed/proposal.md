# Change: Fix Scroll Mode Replay of Already-Reviewed Items

## Why

When a user rates items in Scroll Mode and then exits and re-enters, the queue rebuilds from the top and **replays items that have already been reviewed**. This happens because:

1. Scroll Mode persists the `currentIndex` position but rebuilds the queue from scratch on mount
2. Items rated during the session ARE removed from the local state and rescheduled via FSRS
3. But when the session restarts, the queue is fetched fresh, and if the FSRS rescheduling hasn't properly excluded these items from "due" status, they reappear
4. The user is forced to re-review items they've already rated, defeating the purpose of FSRS scheduling

## What Changes

- **Ensure rated items are excluded from due queue**: When `loadQueue()` or `getDueDocumentsOnly()` is called, items whose `next_reading_date` is in the future (after being rated) MUST be excluded
- **Verify FSRS rating persistence**: Confirm that `rateDocument()` and similar rating APIs actually update `next_reading_date` in the database before returning
- **Fresh queue on scroll mode restart**: When scroll mode starts, always fetch a fresh queue snapshot that respects the latest FSRS schedules
- **Don't persist stale index across sessions**: Remove or reset the tab's `currentIndex` when starting a new scroll session to prevent index-queue mismatch

## Impact

- **Affected specs**: `document-rating` (MODIFIED - add explicit queue exclusion requirement), `scroll-mode-queue` (NEW)
- **Affected code**:
  - `src/pages/QueueScrollPage.tsx` - session restart logic  
  - `src/stores/queueStore.ts` - queue loading with FSRS filtering
  - `src/api/algorithm.ts` / Rust backend - rating persistence verification
  - `src-tauri/src/commands/queue.rs` - due document filtering logic
