# Change: Add RSS Import, Document Sharing, and YouTube Progress to Web Browser App with Parity

## Why

The Tauri desktop application has several key features that are missing or incomplete in the web browser version:
1. RSS feed import functionality is not available in the web app
2. Users cannot share links to documents that maintain their reading location, highlights, and extracts
3. YouTube video position tracking is implemented in Tauri but not working in the web version
4. RSS feed view lacks customization options

This change bridges the feature gap between the Tauri desktop app and the web browser version (Progressive Web App), ensuring 1:1 feature parity.

## What Changes

- **Add RSS Feed Imports to Web Browser App**
  - Enable RSS feed subscription and import functionality in PWA
  - Support OPML import/export for feeds
  - Fetch and parse RSS/Atom feeds client-side or via backend API

- **Add Document Sharing Links**
  - Generate shareable URLs that encode document reading position
  - Include highlights and extracts in shared links
  - Support decoding shared links to restore reading state

- **Maintain YouTube Video Location in Web Browser Version**
  - Ensure video progress (timestamp) is saved to database during playback
  - Restore video position when returning to a video
  - Auto-save progress at regular intervals and on pause

- **Improve RSS Feed View with Ultra Customizability**
  - Custom filtering rules (keywords, authors, categories, read status)
  - UI layout and theme customization
  - Display options (metadata, fonts, show/hide sections)
  - Smart sorting and view modes

- **Brainstorm and Implement New Features**
  - Identify additional features that maintain 1:1 parity between Tauri and Web versions
  - Prioritize features based on user value and implementation feasibility

## Impact

- Affected specs:
  - `rss-management` (new)
  - `document-sharing` (new)
  - `video-progress` (new)
  - `rss-customization` (new)
- Affected code:
  - Frontend: `src/components/media/RSSReader.tsx`, `src/components/viewer/YouTubeViewer.tsx`
  - Backend: `src-tauri/src/commands/rss.rs`, `src-tauri/src/browser_sync_server.rs`
  - API: `src/api/rss.ts`, `src/api/youtube.ts`
  - Database: Schema updates for document sharing state
- Dependencies:
  - URL encoding/decoding for shareable links
  - Client-side RSS parsing or backend proxy
  - State management for reading position persistence
