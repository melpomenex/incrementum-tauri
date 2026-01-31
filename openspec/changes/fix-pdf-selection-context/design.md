## Context
PDFs are rendered via PDF.js canvas and a text layer. The current selection experience selects the entire page and does not show a clear highlight. Extract creation relies on `window.getSelection()` and does not carry PDF-specific context needed for deep links and image occlusion. The fix must work in both web/PWA and Tauri.

## Goals / Non-Goals
- Goals:
  - Correctly align the PDF.js text layer with the canvas at all zoom modes.
  - Ensure selection highlights only the user-dragged range and is visually visible.
  - Capture selection metadata: page number, per-page rects, PDF coordinates, and document reference.
  - Make selection context available to the extract creation flow.
- Non-Goals:
  - Full annotation/highlighting system (persisted highlights, color selection).
  - New sharing URL scheme beyond storing the metadata needed for deep links.

## Decisions
- Decision: Use the PDF.js text layer (TextLayerBuilder or renderTextLayer) per page and ensure its container dimensions match the canvas viewport after zoom scaling.
  - Why: Selection must be based on real text spans aligned with the rendered pixels; misalignment leads to full-page selections.
- Decision: Restrict selection handling to ranges originating within the text layer containers and normalize selection to only the user-highlighted range.
  - Why: Avoid capturing accidental page-wide selections or clicks outside the text layer.
- Decision: Capture selection geometry by using `Range.getClientRects()` and map each rect to a page container; then convert viewport coordinates to PDF points via `viewport.convertToPdfPoint`.
  - Why: This enables image occlusion cropping and deep linking back to a specific region in the PDF.
- Decision: Store selection context as a per-page list of rects (viewport and PDF-space), the page number, and a stable document reference (documentId + PDF fingerprint when available).
  - Why: Multi-page selections need per-page segmentation, and stable identifiers allow future deep links.

## Risks / Trade-offs
- Rendering timing: text layer may render after the canvas, so selection could be possible before the layer is ready. Mitigation: gate selection listeners until text layer render completes per page.
- Performance: capturing and converting many rects can be expensive on large selections. Mitigation: cap rect count and merge adjacent rects when necessary.

## Migration Plan
- No data migrations required. New selection metadata fields are optional and only present for new extracts.

## Open Questions
- Should selection metadata be persisted in the extract model as JSON or a separate table?
- What maximum rect count is acceptable before merging or truncation?
- Should deep links include PDF page + rects only, or also store selected text hash?
