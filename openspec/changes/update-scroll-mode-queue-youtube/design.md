## Context
Scroll mode currently excludes YouTube items and is partially aligned to document-only reading. The queue entry action for "Start Optimal Session" is oriented around flashcard review instead of the incremental reading queue. The requested behavior needs consistent queue navigation across all item types and a scroll boundary handoff near YouTube transcripts.

## Goals / Non-Goals
- Goals:
  - Include YouTube items in scroll mode with persistent playback position.
  - Ensure scroll mode behaves like a TikTok-style vertical queue for all item types.
  - Use transcript section bounds to advance the queue when scrolling past the transcript area.
  - Route "Start Optimal Session" to the incremental reading queue in scroll mode.
- Non-Goals:
  - Redesign the overall queue model or FSRS scheduling logic.
  - Introduce new media types beyond existing queue items.

## Decisions
- Decision: Allow YouTube items in scroll mode and rely on existing YouTube viewer progress tracking hooks for persistence.
- Decision: Use a scroll-boundary handoff near the transcript region to trigger queue navigation (prev/next).
- Decision: Treat scroll mode as the primary queue playback for "Start Optimal Session".

## Risks / Trade-offs
- Transcript boundary detection can be brittle if layout changes; mitigate by anchoring to a transcript container element and using intersection or scroll offset thresholds.
- Including YouTube items in scroll mode could increase load times; mitigate by lazy loading and keeping existing queue batching behavior.

## Migration Plan
- No data migrations required. Progress persistence uses existing document fields.

## Open Questions
- None.
