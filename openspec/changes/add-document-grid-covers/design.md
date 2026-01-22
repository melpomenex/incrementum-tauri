## Context
The Documents grid currently shows text-only cards. The app already has mechanisms for document processing and some media thumbnails, but the document model does not include a first-class cover/thumbnail field. The requested behavior spans UI rendering, document processing for PDF/EPUB cover extraction, and fallback lookups (Anna's Archive) or derived thumbnails (YouTube).

## Goals / Non-Goals
- Goals:
  - Show a cover image in every grid card when available.
  - Prefer embedded PDF/EPUB cover extraction; fall back to Anna's Archive cover lookup.
  - Use YouTube thumbnails for YouTube documents.
  - Provide a styled background + icon fallback when no cover image exists.
  - Persist cover/thumbnail metadata to avoid repeated processing.
- Non-Goals:
  - Building a full cover management UI (manual overrides, editing).
  - Perfectly matching every document to a cover in Anna's Archive.

## Decisions
- Decision: Add an optional `coverImageUrl` (or `thumbnail`) field to the document model across Rust + TS + DB.
  - Why: The grid needs a consistent, persisted source to render quickly without repeated extraction or lookup.
- Decision: Cover resolution order is deterministic and stored in metadata.
  - Order: embedded PDF/EPUB cover -> YouTube thumbnail (for YouTube docs) -> Anna's Archive cover -> styled fallback.
  - The system stores the resulting URL and its source (embedded/youtube/anna/fallback) for debugging and refresh logic.
- Decision: Extract embedded covers during import/processing, and allow an async fallback job for Anna's Archive.
  - Why: Embedded covers can be derived locally; external lookup should not block import or UI rendering.

## Alternatives considered
- Render covers on the fly without persistence.
  - Rejected: expensive and inconsistent across sessions; poor offline behavior.
- Only use Anna's Archive for all books.
  - Rejected: embedded covers are more accurate and do not require external lookup.

## Risks / Trade-offs
- Incorrect or low-quality cover matches from Anna's Archive.
  - Mitigation: store source; allow clearing/refresh in future UI work.
- PDF/EPUB cover extraction performance or failure.
  - Mitigation: fallback to styled background; perform extraction async.

## Migration Plan
- Add nullable column(s) to the documents table for cover URL and cover source.
- Backfill existing documents lazily on first load of Documents grid or via a background job.

## Open Questions
- What matching heuristic should Anna's Archive lookup use (title-only vs title+author)?
- Should cover URLs be cached locally for offline use or stored as external URLs only?
