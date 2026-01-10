# Design: Review Document Reading

## Architecture
The solution leverages the existing `DocScheduler` and `FSRS` implementation. The primary change is bridging the gap between the `DocumentViewer` UI and the backend persistence layer.

## Data Flow
1.  User opens a document. `DocumentViewer` starts a timer.
2.  User clicks a rating (Again, Hard, Good, Easy).
3.  `DocumentViewer` calls `rate_document` with `documentId`, `rating`, and `timeTaken`.
4.  Backend `rate_document`:
    a.  Fetches the document.
    b.  Calculates elapsed days since last review (or creation).
    c.  Calls `DocScheduler::schedule_document_fsrs`.
    d.  Updates `Document` struct with new `next_reading_date`, `stability`, `difficulty`, etc.
    e.  Saves `Document` to DB.
    f.  Returns the scheduling result.
5.  `DocumentViewer` receives success.
6.  `DocumentViewer` calls `queueNav.goToNextDocument()`.

## Database Schema
No schema changes required. `Document` table already has:
- `next_reading_date`
- `stability`
- `difficulty`
- `reps` (for review count)
- `total_time_spent`

## API Changes
### `rate_document`
**Request:**
```rust
pub struct DocumentRatingRequest {
    pub document_id: String,
    pub rating: i32, // 1-4 (ReviewRating)
    pub time_taken: i32, // seconds
}
```

**Response:**
(Unchanged `DocumentRatingResponse` but now reflects persisted state)
