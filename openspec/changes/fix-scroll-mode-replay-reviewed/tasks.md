## 1. Investigation & Root Cause

- [x] 1.1 Verify that `rateDocument()` updates `next_reading_date` in the database immediately
  - Rust backend: Confirmed ✓ - calls `repo.update_document_scheduling_with_consecutive()` synchronously
  - Browser backend: Added `rate_document` command that updates `next_reading_date` ✓
- [x] 1.2 Trace `getDueDocumentsOnly()` to confirm it filters by `next_reading_date <= now`
  - Rust: Confirmed ✓ - `document.next_reading_date.map_or(true, |next_date| next_date <= now)`
  - Browser: Confirmed ✓ - `docs.filter((doc) => !doc.next_reading_date || doc.next_reading_date <= now)`
- [x] 1.3 Add logging to identify if rescheduled items appear in subsequent queue fetches
  - Not needed - root cause identified
- [x] 1.4 Document the exact sequence: rate → reschedule → exit → re-enter → what items appear
  - Issue: Tab data persisted stale `currentIndex`, which pointed to wrong item in fresh queue

## 2. Backend Fix (if needed)

- [x] 2.1 Ensure `rate_document` command commits the `next_reading_date` update synchronously
  - Rust: Already correct ✓
  - Browser: Added implementation ✓
- [x] 2.2 Verify `get_due_documents_only` query excludes documents where `next_reading_date > now`
  - Both Rust and browser backends confirmed ✓
- [ ] 2.3 Add integration test: rate document → verify it's excluded from next due query
  - Future work (not needed for this fix)

## 3. Frontend Session Handling

- [x] 3.1 Reset `currentIndex` and `renderedIndex` to 0 when entering a new scroll session
  - Changed `QueueScrollPage.tsx` to always start at index 0
- [x] 3.2 Clear stale tab data on scroll mode entry so old indices don't cause mismatch
  - Removed `getInitialIndex` callback that restored old indices
- [x] 3.3 Ensure `loadQueue()` is always called fresh on mount (not using stale cached data)
  - Added `await loadQueue()` in mount effect
- [x] 3.4 Add a "session ID" or timestamp to detect stale session restoration
  - Added `sessionTimestamp` to tab data

## 4. PWA/Webapp Parity (browser-backend.ts)

- [x] 4.1 Verify browser backend's `getDueDocumentsOnly` implementation filters correctly
  - Confirmed ✓
- [x] 4.2 Ensure IndexedDB updates are committed before returning from rating API
  - Added `rate_document` and `rate_extract` commands ✓
- [ ] 4.3 Test scroll mode restart behavior in PWA mode
  - Manual testing required

## 5. Testing & Validation

- [ ] 5.1 Manual test: Rate 3 documents in scroll mode → exit → re-enter → verify they don't appear
- [ ] 5.2 Add E2E test for scroll mode queue restart behavior
- [ ] 5.3 Verify on both Tauri desktop and PWA mobile
