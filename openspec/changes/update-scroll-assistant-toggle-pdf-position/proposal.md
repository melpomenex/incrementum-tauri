# Change: Add scroll-mode assistant toggle and fix PDF scroll position restore

## Why
Scroll mode needs a quick way to open/close the assistant without leaving reading flow, and PDF scroll position restoration is unreliable across all app modes. These issues interrupt reading continuity and make it harder to use the assistant effectively while scrolling.

## What Changes
- Add a floating assistant toggle in scroll mode to open/close the assistant panel.
- Persist and restore PDF scroll position reliably across all app modes (scroll mode and standard document view), including reopen and tab switches.

## Impact
- Affected specs: new capabilities `scroll-mode-assistant-toggle`, `pdf-scroll-position`.
- Affected code: `src/pages/QueueScrollPage.tsx`, `src/components/assistant/AssistantPanel.tsx`, `src/components/viewer/DocumentViewer.tsx`, `src/components/viewer/PDFViewer.tsx`, and reader position utilities.
- Related active changes: `fix-epub-scroll-pdf-resume`, `add-reader-position-persistence`.
