## Context
Scroll mode relies on the document viewer but does not consistently load PDF/EPUB content, and rating actions do not always progress the queue. The app has a partial Vimium-style hook without full command coverage, global integration, or help affordances. The backend already integrates yt-dlp, but transcripts are not cached or persisted for YouTube documents.

## Goals / Non-Goals
- Goals:
  - Align scroll mode document loading with the standard viewer so PDF/EPUB render without manual refresh.
  - Guarantee rating-driven queue progression in all reading modes.
  - Provide a complete Vimium mode (default command set) with hints and command execution UI.
  - Cache/persist YouTube transcripts and reuse them in the viewer.
- Non-Goals:
  - Rework the entire queue architecture or replace existing viewer components.
  - Implement non-default Vimium extensions unless required by future requests.

## Decisions
- Use a shared document loading pathway for scroll mode by ensuring file data is fetched per document change and the viewer re-initializes when the queue item changes.
- Extend `VimiumNavigation` into an app-wide provider with a command registry to map Vimium actions to app commands (tabs, queue navigation, search, settings, etc.).
- Persist YouTube transcript data in the Tauri backend (full transcript + segments) keyed by document ID and/or video ID, with a cache-first read path from the frontend.

## Risks / Trade-offs
- Vimium keybindings may collide with existing shortcuts; resolve via mode gating and a clear on-screen mode indicator.
- Persisting transcript data adds storage overhead; mitigate by storing compressed segments or limiting stored formats if needed later.

## Migration Plan
- Add a new migration to store transcripts for YouTube documents (document_id, video_id, transcript text, segments JSON, timestamps).
- Backfill is not required; transcripts populate on-demand when a user opens a YouTube document.

## Open Questions
- None (requirements confirmed: full Vimium command set; transcript persistence).
