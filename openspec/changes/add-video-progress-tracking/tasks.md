# Implementation Tasks

## Task 1: Database Migration
Add the `current_timestamp` column to the documents table.

**Steps:**
1. Add migration `013_add_video_progress_timestamp` to `src-tauri/src/database/migrations.rs`
2. SQL: `ALTER TABLE documents ADD COLUMN current_timestamp INTEGER;`
3. Test migration on fresh database
4. Test migration on existing database (ensure NULL default works)

**Validation:**
- Migration applies successfully
- Existing documents have NULL current_timestamp
- New documents can store timestamps

**Dependencies:** None

---

## Task 2: Document Model Update
Update the Document struct to include `current_timestamp`.

**Steps:**
1. Add `pub current_timestamp: Option<i32>` to `Document` struct in `src-tauri/src/models/document.rs`
2. Update `Document::new()` to initialize `current_timestamp: None`
3. Update all document creation sites to handle the new field

**Validation:**
- Document compiles with new field
- New documents have current_timestamp set to None
- Documents can be deserialized from database with the field

**Dependencies:** Task 1

---

## Task 3: Repository Layer
Add methods for updating and retrieving timestamps.

**Steps:**
1. Add `update_document_timestamp()` function to `src-tauri/src/database/repository.rs`
2. Add `get_document_timestamp()` function to `src-tauri/src/database/repository.rs`
3. Update `get_document_by_id()` to include current_timestamp in SELECT
4. Update `update_document()` to support current_timestamp field

**Validation:**
- Unit tests for repository functions
- Can save and retrieve timestamps
- NULL timestamps are handled correctly

**Dependencies:** Task 1, Task 2

---

## Task 4: Tauri Commands
Create backend commands for frontend to call.

**Steps:**
1. Create `src-tauri/src/commands/video.rs` (or add to existing)
2. Add `update_video_timestamp` command
3. Add `get_video_timestamp` command
4. Register commands in `main.rs`

**Validation:**
- Commands are accessible from frontend
- Error handling works correctly
- Invalid document IDs return appropriate errors

**Dependencies:** Task 3

---

## Task 5: Frontend API Layer
Create TypeScript functions to invoke Tauri commands.

**Steps:**
1. Create `src/api/video.ts`
2. Add `updateVideoTimestamp(documentId: string, timestamp: number)` function
3. Add `getVideoTimestamp(documentId: string): Promise<number | null>` function
4. Add proper TypeScript types

**Validation:**
- Functions compile without errors
- Proper error handling

**Dependencies:** Task 4

---

## Task 6: YouTubeViewer - Progress Saving
Implement auto-save of playback position.

**Steps:**
1. Add state for tracking last saved timestamp
2. Implement interval that saves every 10 seconds during playback
3. Save on pause event
4. Save on component unmount
5. Call `updateVideoTimestamp()` from API

**Validation:**
- Timestamp is saved every 10 seconds while playing
- Timestamp is saved immediately on pause
- Timestamp is saved when navigating away

**Dependencies:** Task 5

---

## Task 7: YouTubeViewer - Position Restoration
Implement loading saved position on video load.

**Steps:**
1. Fetch saved timestamp when component mounts (after documentId is available)
2. After YouTube player is ready and duration is loaded, seek to saved position
3. Implement 95% completion check (reset to 0 if near end)
4. Show brief toast notification when resuming

**Validation:**
- Video seeks to saved position on load
- Videos at 95%+ start from 0
- Toast shows "Resuming from X:XX"

**Dependencies:** Task 5

---

## Task 8: Document List - Progress Indicator
Show saved position in document list/grid.

**Steps:**
1. Update document list item component to display saved timestamp
2. Format timestamp as MM:SS or HH:MM:SS
3. Show indicator only when current_timestamp is not NULL
4. Style to distinguish from duration

**Validation:**
- List items show "Resume at X:XX" for videos with progress
- Indicator doesn't show for unwatched videos
- Formatting is correct for various durations

**Dependencies:** Task 3, Task 5

---

## Task 9: Edge Case Handling
Add validation and error handling.

**Steps:**
1. Add timestamp validation (must be >= 0 and <= duration)
2. Clamp timestamp to 95% of duration if exceeds
3. Handle case where duration changes (re-import)
4. Handle negative or corrupted timestamps

**Validation:**
- Invalid timestamps are ignored
- Timestamps exceeding duration are clamped
- No crashes on corrupt data

**Dependencies:** Task 6, Task 7

---

## Task 10: Testing and Bug Fixes
End-to-end testing and fixes.

**Steps:**
1. Manual testing: Watch video, close, reopen, verify position
2. Test across app restarts
3. Test with various video lengths
4. Test completion detection (watch to end, verify reset)
5. Fix any discovered bugs

**Validation:**
- All scenarios from spec work correctly
- No database errors
- Smooth user experience

**Dependencies:** All previous tasks

---

## Optional: Enhancement Tasks

### Task 11: Local Video Player Support
Add timestamp tracking for local video/audio files when player is implemented.

**Dependencies:** Local video player implementation (separate feature)

### Task 12: Resume Confirmation Dialog
Add option to prompt user before resuming (user setting).

### Task 13: Configurable Save Interval
Allow users to adjust auto-save frequency in settings.

## Parallel Work Opportunities

The following tasks can be done in parallel:
- **Tasks 1, 2, 3** (Backend data layer)
- **Task 5** (Frontend API) - can be done in parallel with Tasks 1-4 using mocked responses
- **Task 8** (UI indicator) - can be done independently with mock data

## Critical Path

The minimum path to a working feature:
1. Task 1 → Task 2 → Task 3 → Task 4 → Task 5
2. Task 6 + Task 7 (can be done in parallel after Task 5)
