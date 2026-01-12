# Change: Update scroll mode loading, queue advance, Vimium mode, and YouTube transcripts

## Why
Scroll mode fails to render PDF/EPUB reliably, document ratings do not always advance the queue, keyboard control is limited, and YouTube transcripts are not persisted despite yt-dlp support in the backend.

## What Changes
- Fix PDF/EPUB loading in scroll mode by aligning document loading with the standard viewer pipeline.
- Ensure rating a document (any mode) or marking an RSS item as read in scroll mode advances to the next queue item.
- Add a full Vimium mode for app-wide keyboard control with hints and command execution.
- Fetch YouTube transcripts via yt-dlp and persist/cache transcripts for reuse in the viewer.

## Impact
- Affected specs: document-rating, queue-scroll-mode (new), vimium-mode (new), youtube-transcripts (new)
- Affected code: `src/pages/QueueScrollPage.tsx`, `src/components/viewer/DocumentViewer.tsx`, `src/components/viewer/PDFViewer.tsx`, `src/components/viewer/EPUBViewer.tsx`, `src/components/common/VimiumNavigation.tsx`, `src/components/viewer/YouTubeViewer.tsx`, `src-tauri/src/youtube.rs`, `src-tauri/migrations/`
