## Context
The web app already renders PDFs via PDF.js, supports extract creation, and exposes an Assistant panel with document context. However, PDF context is missing (content is often empty), progress sync is local-only, FSRS review sessions restart from the deck beginning, the Knowledge Graph UI is a placeholder, and toolbar navigation actions are stubbed. Cross-device persistence depends on the in-flight auth/sync policy changes.

## Goals / Non-Goals
- Goals:
  - Cross-device PDF progress persistence that restores page/scroll state.
  - Assistant context for PDFs using a sliding text window and user token budget.
  - Unified selection-based flow to create extracts, cloze cards, or Q&A cards.
  - FSRS sessions resume from due items instead of restarting.
  - Obsidian-like Knowledge Graph for documents, extracts, and learning items.
  - Read Next / Random Item navigation across collection-scoped queue items.
  - Collections as a top-level scope (default demo collection, optional additional collections).
- Non-Goals:
  - Full OCR pipeline build-out (only optional usage if already available).
  - Advanced graph analytics (pathfinding, clustering) beyond minimal visualization.
  - Major redesign of existing queue or review UX.

## Decisions
- Collection model
  - Introduce a `collections` entity and `collection_id` on documents, extracts, learning items, and queue items.
  - Default to a single Demo collection; allow creating/switching collections in UI.
  - Queue/filter queries and graph data are scoped to the active collection.
- Progress sync
  - Persist PDF progress (page, scroll percent, updated_at) server-side when authenticated; keep local-only in Demo Mode.
  - Restore progress from server first, then fall back to local storage.
- PDF assistant context
  - Use PDF.js text extraction for the current page plus a configurable window (e.g., ±N pages) and prefer selected text when present.
  - Respect the user’s Assistant token budget; trim to the configured window size.
  - If OCR text exists and the user enables it, prefer OCR content for the window.
- Knowledge Graph
  - Use existing `KnowledgeGraph` component and data from documents/extracts/learning items.
  - Render document → extract → card edges; optionally include tags/categories as nodes.
  - Provide click-to-open navigation for documents and extracts.
- FSRS continuity
  - Persist review session state per user + collection (current item pointer, queue snapshot hash, timestamps).
  - On resume, rehydrate queue from FSRS due items and skip already-rated items.
- Toolbar navigation
  - Read Next opens the next due item in the active collection based on FSRS order and current queue filter.
  - Random Item chooses a random queue item within the active collection and current queue filter.

## Risks / Trade-offs
- PDF text extraction can be expensive; cache per-document page text and only update the window on page change.
- Cross-device progress relies on auth/sync and may require conflict resolution (latest timestamp wins).
- Multi-collection introduces schema and query complexity; start with minimal UI and migration defaults.

## Migration Plan
- Add default collection and backfill existing records to that collection.
- Add progress sync fields and migrate local progress to server on first login.

## Open Questions
- Whether Random Item should ignore filters (currently planned to respect active filter).
- Exact UI location for collection management and account nudges.
