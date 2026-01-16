# Change: Update mobile EPUB reader UX

## Why
The current EPUB reader UI is desktop-oriented and lacks a mobile-first reading layout. A mobile-optimized experience is needed for comfortable long-form reading in both PWA and mobile browser contexts.

## What Changes
- Add a mobile-first EPUB reader layout that prioritizes readability (line length, margins, typography) and safe-area handling.
- Introduce mobile reader chrome with minimal, tap-toggle controls for navigation, settings, and table of contents.
- Surface reading progress and chapter context during mobile reading.
- Align mobile EPUB settings with existing document settings and persist preferences.

## Impact
- Affected specs: `specs/epub-reader-mobile/spec.md` (new capability)
- Affected code: `src/components/viewer/EPUBViewer.tsx`, `src/components/viewer/DocumentViewer.tsx`, `src/components/mobile/MobileDocumentWrapper.tsx`, `src/stores/settingsStore.ts`, `src/components/settings/DocumentsSettings.tsx`
