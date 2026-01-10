# Review Document Reading

## Metadata
- **Status**: Proposed
- **Type**: Feature
- **Owner**: (User)
- **Created**: 2026-01-10

## Context
Currently, documents can be read in the `DocumentViewer`, but rating them does not affect their scheduling. The `HoverRatingControls` component exists but the `handleRating` function is a stub. The backend has a `rate_document` command that calculates the next schedule but does not persist it.

## Problem
Users cannot incrementally read documents using FSRS scheduling. Rating a document should reschedule it and move to the next item in the queue.

## Solution
1.  **Backend**: Update `rate_document` command to:
    *   Accept `time_taken` (seconds).
    *   Use `DocScheduler::schedule_document_fsrs` to calculate the next interval using FSRS logic.
    *   Persist the updated `next_reading_date`, `stability`, `difficulty`, `reps`, and `total_time_spent` to the database.
2.  **Frontend**: Update `DocumentViewer.tsx` to:
    *   Track time spent reading.
    *   Call `rate_document` when a rating is selected.
    *   Trigger `queueNav.goToNextDocument()` after successful rating.
3.  **Frontend**: Expose `rate_document` in `src/api/algorithm.ts` (or `review.ts`).

## Goals
- Enable FSRS-based incremental reading for documents.
- Ensure document progress is saved and scheduled correctly.
- Provide a seamless "Read -> Rate -> Next" workflow.

## Non-Goals
- Changing the FSRS algorithm implementation itself.
- Visual changes to the queue (other than ordering updates).
