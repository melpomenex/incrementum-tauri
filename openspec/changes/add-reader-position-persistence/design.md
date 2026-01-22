## Context
The app already stores PDF scroll percent and page number in localStorage and syncs basic progress via `updateDocumentProgressAuto`. Restoring by scroll percent alone is drift-prone across viewport or zoom changes. We need an anchored approach aligned with PDF.js (dest/XYZ) while keeping a fallback for custom renderers and minimal MVP risk.

## Goals / Non-Goals
- Goals:
  - Persist per-document ViewState with page, scale, and anchored dest when available.
  - Restore reliably across sessions and device sizes with minimal drift.
  - Use debounced writes and coalesce noise to avoid performance issues.
  - Extend existing backend progress sync with ViewState when possible.
- Non-Goals:
  - Perfect restoration when the PDF content changes or docId differs.
  - Replacing all existing progress fields; we extend them.

## Decisions
- Decision: Use a ViewState object as the single persistence unit locally and for sync.
  - Why: Reduces multiple competing storage formats and simplifies restore.
- Decision: Prefer anchored XYZ destination derived from top-left viewport coordinates when PDF.js integration is available; fall back to scrollTop/percent otherwise.
  - Why: Destinations are more robust to viewport changes and zoom adjustments.
- Decision: Restore in a strict sequence (apply view params, wait for layout, apply position) with verification/retry.
  - Why: PDF.js layout and rendering timing can override scroll position if applied too early.
- Decision: Keep doc key selection stable and deterministic; prefer app-level documentId, then content hash, then PDF.js fingerprint.
  - Why: Prevents cross-document collisions without needing heavy hashing in all cases.

## Risks / Trade-offs
- Anchored dest generation depends on PDF.js coordinate transforms and may be unavailable in custom renderers.
  - Mitigation: Fallback to scrollTop/percent and store pageNumber regardless.
- Backend sync payload changes may require migrations or compatibility handling.
  - Mitigation: Version ViewState payload and keep existing fields for backward compatibility.

## Migration Plan
- No breaking migration. Older clients will ignore new ViewState fields; new clients will still read existing scroll percent.

## Open Questions
- None.
