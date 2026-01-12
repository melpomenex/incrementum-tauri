## 1. Implementation
- [ ] 1.1 Add transcript persistence schema and repository helpers for YouTube documents.
- [ ] 1.2 Update Tauri transcript commands to read cached transcripts before invoking yt-dlp and to persist new results.
- [ ] 1.3 Update YouTube viewer to request cached transcripts, display cached state, and handle no-transcript responses.
- [ ] 1.4 Fix scroll mode PDF/EPUB loading by aligning document file data loading with standard viewer behavior.
- [ ] 1.5 Ensure rating actions (all modes) and scroll-mode RSS reads advance to the next queue item.
- [ ] 1.6 Expand Vimium mode command coverage, app-wide hint overlays, and command execution UI; integrate with global app layout.
- [ ] 1.7 Add/adjust tests or lightweight validation checks for transcript caching and scroll mode navigation.

## 2. Validation
- [ ] 2.1 Open scroll mode with PDF and EPUB items; confirm content renders and scroll navigation works.
- [ ] 2.2 Rate a document in document view, scroll mode, and review mode; confirm the queue advances.
- [ ] 2.3 Open a YouTube document twice; confirm transcripts load from cache on the second open.
- [ ] 2.4 Exercise core Vimium commands (hints, scroll, find, marks, tab nav, command execution) with visible mode indicators.
