# Change: Persist + Restore Reader Position in PDF.js

## Why
Users lose their place in PDFs when they leave and return. We need consistent, debounced persistence and robust restoration across sessions and devices.

## What Changes
- Add a per-document ViewState model that captures page, scale, anchored destination (when available), and fallback scroll metrics.
- Restore viewer state in a deterministic sequence (view params, layout ready, position) with verification and retry.
- Extend existing progress sync to include ViewState for cross-device restore when available.
- Support both PDF.js viewer integration and a fallback path for custom renderers.

## Impact
- Affected specs: new capability `reader-position`.
- Affected code: `src/components/viewer/PDFViewer.tsx`, `src/components/viewer/DocumentViewer.tsx`, storage helpers, and backend progress sync.
