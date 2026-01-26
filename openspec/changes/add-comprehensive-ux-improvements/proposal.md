# Change: Comprehensive UI/UX Improvements for Enhanced Reading Experience

## Why

Incrementum is a powerful incremental reading application, but the current user experience has several friction points:

1. **Position tracking is fragmented** across different document types (PDF uses pages, EPUB uses CFI, video uses time, etc.)
2. **No unified "resume reading" experience** - users must manually navigate to last position
3. **Web import workflow is basic** - no preview, limited source integrations, poor categorization
4. **Browser extension only connects locally** - no cloud sync via readsync.org, no offline mode
5. **Video position tracking is incomplete** - limited player support, no bookmarks, poor transcript integration
6. **UI needs modernization** - theme contrast issues, no keyboard shortcuts system, limited mobile responsiveness
7. **Missing core features** - no collections/folders, no reading goals, no full-text search

This proposal addresses all these areas to create a cohesive, delightful reading experience.

## What Changes

### 1. Enhanced Position Tracking System
- **Unified position model** - Create `DocumentPosition` enum abstraction for all document types
- **Visual progress indicators** - Progress bars on document thumbnails, reading time estimates
- **"Continue Reading" page** - New top-level navigation with one-click resume
- **Reading streaks and heatmaps** - Visual feedback for consistent reading
- **Position bookmarks** - User-defined marks within documents

### 2. Web Document Import Improvements
- **Redesigned import dialog** - Content preview, metadata extraction, smart tag suggestions
- **New source integrations** - Notion, Medium, Twitter/X threads, Reddit, Substack, arXiv
- **Quick capture via extension** - One-click save with instant preview
- **Auto-tagging and categorization** - AI-powered content analysis

### 3. Browser Extension Enhancement
- **Dual connection mode** - Local server (localhost:8766) AND readsync.org cloud sync
- **Smart fallback** - Automatic cloud fallback when local server unavailable
- **Offline queue** - Queue actions for later sync when offline
- **Cross-device position sync** - Reading position syncs across devices
- **In-page reading mode** - Distraction-free view with highlighting

### 4. Video Position Tracking
- **Custom video player** - Support for local video files (MP4, WebM, MKV)
- **Timestamp bookmarks** - Mark and jump to important moments
- **Transcript sync** - Click transcript to jump to position
- **Chapter detection** - Automatic chapter extraction when available
- **Auto-generate cards from captions** - Create review items from video transcripts

### 5. UI/UX Modernization
- **Improved theme contrast** - WCAG AA compliance, true light theme option
- **Redesigned navigation** - "Continue Reading" as priority nav item
- **Command palette** - Global keyboard shortcut system (Cmd/Ctrl + K)
- **Mobile responsiveness** - Collapsible sidebar, touch gestures, bottom nav

### 6. New Features
- **Collections** - Hierarchical folders and smart collections (auto-filtered)
- **Reading goals** - Daily/weekly targets with streak tracking
- **Full-text search** - Search across documents, extracts, and cards
- **Enhanced export** - Export to Anki, Markdown, HTML, progress reports

## Impact

### Affected Specs
- **reader-position** - New unified position model, progress indicators, bookmarks
- **web-import** - Enhanced import dialog, new source integrations
- **browser-extension-sync** - Cloud sync, offline queue, cross-device sync
- **video-position** - New spec for video tracking features
- **document-library** - Collections, search, improved navigation
- **reading-goals** - New spec for goals and streak tracking
- **search-discovery** - New spec for full-text search

### Affected Code Areas
- `src-tauri/src/models/` - New position models
- `src-tauri/src/database/` - Migrations for bookmarks, collections, goals, search index
- `src-tauri/src/commands/` - New APIs for bookmarks, collections, goals, search
- `src/components/viewer/` - Unified position tracking across viewers
- `src/components/import/` - Redesigned import dialogs
- `src/components/navigation/` - Redesigned sidebar with "Continue Reading"
- `src/features/` - New feature directories for collections, goals, search
- `src/stores/` - New stores for bookmarks, collections, goals, search
- Browser extension code (separate repo) - Cloud sync integration

### Breaking Changes
- **Position storage format** - Requires migration to unified position model
- **Browser extension protocol** - New message format for cloud sync
- **Navigation structure** - New routes added ("continue-reading", "collections")

### Migration Requirements
- Database migration for new tables: `bookmarks`, `collections`, `reading_goals`, `search_index`
- Position data migration to unified format
- Browser extension update required for cloud sync features

### Performance Considerations
- Full-text search requires FTS5 index on documents, extracts content
- Position sync adds network traffic (mitigated by debounce and batch updates)
- Progress indicators require additional queries (optimizable with indexed views)

---

## Dependencies

### External Dependencies
- **readsync.org** - Cloud sync infrastructure (to be implemented)
- **Browser extension** - Separate Chrome/Firefox extension repo
- **AI services** - For auto-tagging and content analysis (optional feature)

### Internal Dependencies
- Existing `reader-position` spec for PDF/EPUB position tracking
- Existing `browser-extension-sync` spec for local server connection
- Existing document and extract models

### Sequencing
1. **Phase 1** - Position tracking foundation (enables most other features)
2. **Phase 2** - Web import and extension sync (can be parallel with Phase 1)
3. **Phase 3** - Video features (independent of other phases)
4. **Phase 4** - UI modernization and new features (builds on Phases 1-3)
