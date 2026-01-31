# Change: Fix PDF text selection and capture extract context

## Why
PDF text selection is currently unreliable: visual selection is effectively invisible and selections often expand to the entire page instead of the user-highlighted range. This blocks extract creation from precise selections and prevents capturing the context needed for flashcards, deep links, and image occlusion.

## What Changes
- Fix PDF.js text layer alignment and selection behavior so only the user-highlighted text is selected and visibly highlighted.
- Capture selection context metadata for extracts (page number, selection rects, PDF coordinates, and document reference).
- Support multi-page selections by storing per-page selection segments.
- Provide selection context for both web/PWA and Tauri builds.

## Impact
- Affected specs: new capabilities for `pdf-text-selection` and `extract-selection-context`.
- Affected code: `src/components/viewer/PDFViewer.tsx`, `src/components/viewer/PDFViewer.css`, `src/components/viewer/DocumentViewer.tsx`, extract creation flow and models/types storing selection metadata.
