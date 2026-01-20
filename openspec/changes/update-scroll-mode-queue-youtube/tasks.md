## 1. Implementation
- [ ] 1.1 Update scroll mode queue assembly to include YouTube items and apply TikTok-style paging across all item types.
- [ ] 1.2 Integrate YouTube viewer in scroll mode with persisted playback position updates and restore on item change.
- [ ] 1.3 Add transcript-boundary scroll detection to advance to previous/next queue items.
- [ ] 1.4 Route "Start Optimal Session" to open the incremental reading queue in scroll mode.
- [ ] 1.5 Add/adjust tests or lightweight validation for scroll queue navigation and YouTube transcript handoff.

## 2. Validation
- [ ] 2.1 Open scroll mode with a mixed queue (docs, extracts, flashcards, RSS, YouTube); confirm vertical paging works across all items.
- [ ] 2.2 Play a YouTube item, switch items, return; confirm playback position is restored.
- [ ] 2.3 Scroll to transcript section and scroll past its bounds; confirm queue advances to prev/next.
- [ ] 2.4 Click "Start Optimal Session"; confirm it opens incremental reading queue in scroll mode (not flashcard review).
