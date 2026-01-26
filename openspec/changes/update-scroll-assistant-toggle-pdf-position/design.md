## Context
Scroll mode renders documents in a dedicated full-screen flow (QueueScrollPage) with an AssistantPanel fixed to left/right. PDFs rely on reader position utilities in DocumentViewer and PDFViewer that attempt to restore scroll state after load. Users report position loss in every mode, implying restore suppression, stale state selection, or timing issues in the PDF viewer lifecycle.

## Goals / Non-Goals
- Goals:
  - Provide a floating toggle to open/close the assistant while staying in scroll mode.
  - Ensure PDF scroll restoration works consistently in scroll mode and standard document view, across tab switches and reopen.
- Non-Goals:
  - Redesigning the assistant UI or changing its existing layout behaviors outside scroll mode.
  - Reworking EPUB behavior or unrelated reader features.

## Decisions
- Decision: Add a scroll-mode-only floating toggle that controls assistant visibility, with state persisted per user.
  - Rationale: A floating control preserves reading flow and avoids burying the action in menus.
- Decision: Unify PDF position restoration flow to remove timing races (restore only after pages render and scroll container is ready), and ensure the same persistence path is used in all modes.
  - Rationale: Current behavior likely diverges between scroll mode and standard view; a single restore pipeline reduces inconsistencies.

## Risks / Trade-offs
- Tightening restore timing may delay visible scroll restoration by a small amount; mitigate with optimistic scroll and retry verification.
- Persisting assistant visibility may conflict with user expectations if they want per-session behavior; mitigate by scoping persistence to scroll mode and allowing manual override.

## Migration Plan
- No data migrations. Use existing reader position storage keys; add new assistant visibility key in local storage.

## Open Questions
- None (clarifications provided: floating toggle; PDF issue occurs in all modes).
