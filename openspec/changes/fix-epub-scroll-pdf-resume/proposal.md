# Change: Fix EPUB scrolling/TOC and PDF resume in web reader

## Why
EPUB documents in the web app do not scroll through the full book and TOC items fail to navigate, while PDFs do not reliably restore the last reading position after tab switches or reopen. These break core reading workflows and make incremental reading unusable for long-form content.

## What Changes
- Ensure EPUB documents render as a continuous scrollable flow in the web reader.
- Make EPUB table of contents navigation reliably jump to the selected section.
- Persist and restore PDF reading position (page + scroll) across tab switches, document reopen, and app restart.

## Impact
- Affected specs: `epub-reading`, `pdf-progress`
- Affected code: `src/components/viewer/EPUBViewer.tsx`, `src/components/viewer/DocumentViewer.tsx`, `src/components/viewer/PDFViewer.tsx` (web reader)
