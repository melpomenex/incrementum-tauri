# Change: Add book-cover imagery to documents grid

## Why
Documents in grid mode are visually indistinct, making it harder to scan and recognize items quickly. Adding cover imagery (from embedded PDF/EPUB covers or reliable fallbacks) improves recognition and browsing efficiency.

## What Changes
- Add cover image support for documents in grid mode, prioritizing embedded PDF/EPUB covers and falling back to Anna's Archive covers.
- Add YouTube thumbnails as the cover image for YouTube documents.
- Provide a styled background + icon fallback when no cover is available.
- Persist cover/thumbnail metadata for documents so the grid can render without re-processing every time.

## Impact
- Affected specs: new `document-covers` capability.
- Affected code: documents model + persistence (Rust + TS), document processing/import pipeline, documents grid UI, Anna's Archive lookup, YouTube thumbnail selection.
