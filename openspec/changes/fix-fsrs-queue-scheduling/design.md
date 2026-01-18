## Context

The current queue system uses a simple priority-based approach (priority_rating: 0-10, priority_slider: 0-100) combined with basic due date checking. While this works for basic queue ordering, it doesn't leverage the FSRS (Free Spaced Repetition Scheduler) algorithm that the application already implements for learning items and extracts.

### Current State Analysis

**Existing Scheduling Infrastructure:**
- `DocumentScheduler` (document_scheduler.rs) - FSRS-based scheduler already implemented
- `IncrementalScheduler` (incremental_scheduler.rs) - Alternative scheduler for incremental reading
- `FSRSScheduler` (fsrs.rs) - Core FSRS-5 algorithm implementation
- Document model has FSRS fields: `stability`, `difficulty`, `reps`, `next_reading_date`, `consecutive_count`

**Problem Areas:**
1. `get_queue()` in queue.rs:49 uses manual priority calculation instead of FSRS `next_reading_date`
2. Scroll mode interleaves flashcards/extracts randomly instead of using FSRS due dates
3. Queue selector uses priority scores instead of memory retention metrics
4. No integration with Anna's Archive for book discovery and import

**Current Priority Formula (queue.rs:187-216):**
```rust
let priority_score = calculate_document_priority_score(
    if document.priority_rating > 0 { Some(document.priority_rating) } else { None },
    document.priority_slider,
);
// Then adjusted by next_reading_date if present
```

This treats `priority_rating` and `priority_slider` as the primary factors, with `next_reading_date` only as a modifier.

### Stakeholders

- **Desktop users** (Tauri) - Primary audience, need robust queue scheduling
- **Web/PWA users** - Need consistent queue behavior across platforms
- **Mobile users** - Scroll mode is primary interface, critical for UX

## Goals / Non-Goals

**Goals:**
1. All queues use FSRS `next_reading_date` as the primary scheduling factor
2. Documents without `next_reading_date` (new/unread) are prioritized for first reading
3. Queue ordering respects FSRS memory retention principles
4. Anna's Archive integration for seamless book discovery and import
5. Cross-platform parity (Tauri, PWA, Webapp)

**Non-Goals:**
1. Complete removal of priority_rating/priority_slider (keep as user override)
2. Changing FSRS algorithm parameters (use existing implementation)
3. Full ebook library management (basic search/import only)
4. Legal/DRM handling for Anna's Archive (user responsibility)

## Decisions

### Decision 1: FSRS-First Queue Ordering

**What:** Use `next_reading_date` as the primary queue ordering mechanism, with priority_rating as a secondary user override.

**Why:** FSRS is scientifically proven to optimize memory retention. Using it consistently for all content (documents, extracts, flashcards) creates a unified learning system.

**Alternatives considered:**
1. **Keep current priority-first approach:** Rejected - defeats the purpose of having FSRS
2. **Use incremental scheduler for all:** Rejected - FSRS is better for long-term retention
3. **Hybrid with manual priority always winning:** Rejected - users would bypass FSRS optimization

**Implementation:**
```rust
// New queue ordering logic:
// 1. Due items (next_reading_date <= now) sorted by due_date ASC
// 2. New items (next_reading_date IS NULL) sorted by priority_rating DESC
// 3. Not-due items excluded from queue unless specifically requested
```

### Decision 2: Anna's Archive Integration via Official JSON API

**What:** Use Anna's Archive's JSON API (`/dyn/api/fast_download.json`) for book search and download.

**Why:** Official API is more stable than scraping. RapidAPI wrapper available as fallback.

**Alternatives considered:**
1. **Web scraping:** Rejected - fragile, breaks frequently, higher maintenance
2. **LibGen API only:** Rejected - limited to LibGen content, Anna's Archive aggregates multiple sources
3. **Z-Library integration:** Rejected - legal complications, login requirements

**Implementation:**
- Search via GET requests to annasarchive domains
- Parse JSON response for book metadata (title, author, download links)
- Direct download to user's import folder or browser-based download
- Handle rate limiting and mirror domains

### Decision 3: Unified Queue Selector Algorithm

**What:** Refactor `QueueSelector` to use FSRS metrics instead of manual priority calculation.

**Why:** Current implementation duplicates logic. FSRS already encodes optimal review timing.

**Algorithm:**
```rust
fn calculate_fsrs_priority(item: &QueueItem) -> f64 {
    match item {
        // Due learning items: priority based on retrievability
        QueueItem::LearningItem { due_date, stability, .. } => {
            let retrievability = calculate_retrievability(due_date, stability);
            10.0 * retrievability // Scale to 0-10
        }
        // Due documents: priority based on days overdue
        QueueItem::Document { next_reading_date, .. } => {
            if next_reading_date <= now {
                let days_overdue = (now - next_reading_date).num_days();
                10.0 - (days_overdue as f64 * 0.1).max(0.0) // Decay overdue priority
            } else {
                0.0 // Not due, exclude from queue
            }
        }
        // New items: use user-set priority
        QueueItem::NewDocument { priority_rating, .. } => {
            priority_rating as f64
        }
    }
}
```

## Risks / Trade-offs

### Risk 1: Breaking Existing User Workflow

**Risk:** Users who rely on priority_slider to manually curate their queue will experience disruption.

**Mitigation:**
- Add migration guide explaining the change
- Keep priority_rating as a "user override" that can boost FSRS-calculated priority
- Provide option to opt-out of FSRS scheduling per-document
- Gradual rollout: start with Scroll Mode, then expand to other queues

### Risk 2: Anna's Archive Availability

**Risk:** Anna's Archive domains change frequently; API may break.

**Mitigation:**
- Implement mirror detection and fallback
- Cache search results locally
- Provide manual URL import as fallback
- Monitor for domain changes and update quickly

### Risk 3: Performance Impact

**Risk:** Real-time FSRS calculation for large document libraries could be slow.

**Mitigation:**
- Cache `next_reading_date` in database (already done)
- Batch FSRS recalculation (don't recalc on every queue load)
- Use database indexes for `next_reading_date` queries
- Lazy load queue items (pagination)

### Trade-off: Queue Size vs Review Quality

**Trade-off:** Smaller queues with truly due items vs larger queues with "someday" items.

**Resolution:** Default to due-only queue, add "Backlog" view for all items. This separates urgent reviews from the larger library.

## Migration Plan

### Phase 1: Backend Changes (Tauri)

1. Update `get_queue()` to use FSRS-first ordering
2. Add `get_due_documents_only()` function for clarity
3. Keep backward-compatible `get_all_queue_items()` for users who want old behavior
4. Add `is_fsrs_scheduled` flag to user settings

### Phase 2: Frontend Changes (Tauri)

1. Update QueueScrollPage to use new queue ordering
2. Add "Due Today" filter to QueuePage
3. Update queue visual indicators to show FSRS-based priority
4. Add settings toggle for FSRS scheduling

### Phase 3: Anna's Archive Integration

1. Create `anna_archive.rs` module with search/download functions
2. Create `AnnaArchiveSearch` React component
3. Add search button to Documents page toolbar
4. Integrate with Command Center for quick search
5. Add download progress indicators

### Phase 4: Cross-Platform (PWA/Webapp)

1. Port queue scheduling logic to browser-backend.ts
2. Ensure PWA has same FSRS queue behavior
3. Test Anna's Archive integration on mobile
4. Verify offline fallback works

### Rollback Strategy

If issues arise:
1. Feature flag to revert to old queue behavior: `useFsrsScheduling: false`
2. Keep old `calculate_document_priority_score()` function available
3. Database migration is reversible (no schema changes needed)
4. Settings option to disable Anna's Archive integration

## Open Questions

1. **Default queue behavior:** Should the default queue show "Due Today" only, or all items with due/new mixed?
   - **Recommendation:** Due Today only, with "All Items" as optional view

2. **Priority slider role:** Should priority_slider override FSRS or just be a hint?
   - **Recommendation:** Use as multiplier on FSRS priority (0.5x to 2.0x)

3. **New document handling:** Should new documents (never read) use FSRS or manual priority?
   - **Recommendation:** Manual priority for first read, then switch to FSRS

4. **Anna's Archive rate limits:** How to handle API rate limiting?
   - **Recommendation:** Implement exponential backoff, cache results, show rate limit warning to user
