# Incrementum UI/UX Improvement Plan

## Executive Summary

This plan outlines comprehensive improvements to the Incrementum application, focusing on:
1. Enhanced position tracking for documents and videos
2. Improved web document import workflow
3. Browser extension integration with readsync.org and local server
4. Overall UI/UX modernization

---

## Current State Analysis

### Strengths
- Solid foundation with React 19 + Tauri 2.0
- Comprehensive document support (PDF, EPUB, Markdown, HTML, TXT)
- FSRS-5 spaced repetition algorithm
- Position tracking exists (page, scroll_percent, CFI)
- Browser extension with basic sync capabilities

### Pain Points Identified
- Position tracking is fragmented across different formats
- Web import workflow is not streamlined
- Browser extension has limited integration with web interface
- UI could benefit from modern design patterns
- No unified "continue where I left off" experience
- Video position tracking is less mature than document tracking

---

## 1. Enhanced Position Tracking System

### 1.1 Unified Position Model
**Problem:** Different document types use different position tracking methods (page, scroll_percent, CFI).

**Solution:** Create a unified position abstraction layer.

```rust
// New unified position enum
enum DocumentPosition {
    Page { page: u32, offset: f32 },
    Scroll { percent: f32, element_id: Option<String> },
    CFI { cfi: String, offset: f32 },
    Time { seconds: u32 },  // For videos
    Markdown { heading: String, offset: f32 },
}

// Position restoration service
struct PositionService {
    fn save_position(doc_id: &str, position: DocumentPosition)
    fn restore_position(doc_id: &str) -> Option<DocumentPosition>
    fn get_reading_progress(doc_id: &str) -> f32  // 0.0 to 1.0
}
```

### 1.2 Visual Progress Indicators
**Features to add:**
- **Progress bar** on document thumbnails in library view
- **Reading time remaining** estimates based on reading speed
- **Position bookmarks** - user can mark specific positions
- **Reading streaks** - visual feedback for consistent reading
- **Heatmap** of document activity (like GitHub contribution graph)

### 1.3 Resume Reading Experience
**New "Continue Reading" page:**
- Top-level navigation to "Continue Reading"
- Shows all documents with active reading sessions
- Grouped by: "Just Started", "Halfway Through", "Almost Done"
- One-click resume to last position
- Keyboard shortcuts (Ctrl/Cmd + Shift + R)

---

## 2. Web Document Import Improvements

### 2.1 Enhanced URL Import Dialog
**Current state:** Basic URL input with auto-processing.

**Proposed improvements:**
```
┌─────────────────────────────────────────────────────────┐
│  Import from Web                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  URL: [https://example.com/article          ]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Article detected                              │   │
│  │ • Estimated reading time: 8 minutes             │   │
│  │ • Word count: ~2,400 words                      │   │
│  │ • Contains: 12 images, 3 tables                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Import Options:                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Title: [The Future of AI in Education        ]  │   │
│  │                                                 │   │
│  │ Tags: [+ Add] [#education] [#ai] [#technology] │   │
│  │                                                 │   │
│  │ ☐ Auto-extract key passages                    │   │
│  │ ☐ Generate Q&A items                           │   │
│  │ ☐ Create cloze deletions                       │   │
│  │                                                 │   │
│  │ Source folder: [Research Papers ▼]             │   │
│  │ Priority:    [High ▼]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ Cancel ]  [ Preview ]  [ Import ]                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Import Source Integrations
**Add support for:**
- **Notion** pages (via public URLs or API)
- **Obsidian** publish sites
- **Medium** articles (clean reader view)
- **Twitter/X threads** (convert to readable format)
- **Reddit posts** (with comments)
- **Hacker News** discussions
- **Substack** newsletters
- **Academic repositories** (arXiv, SSRN, PubMed)

### 2.3 Browser Extension Quick Capture
**Enhanced popup:**
- One-click save from any page
- Instant preview of captured content
- Quick tag assignment
- Reading list queue (save for later)
- Highlight selection before importing

---

## 3. Browser Extension Enhancement

### 3.1 readsync.org Integration
**Current state:** Extension connects to localhost:8766.

**Proposed architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Extension                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connection Manager                                              │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Local Server   │    │  readsync.org   │                     │
│  │  localhost:8766 │    │  Cloud Sync     │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────────┐            │
│  │         Sync State Manager                       │            │
│  │  • Auto-fallback (cloud → local)                │            │
│  │  • Conflict resolution                          │            │
│  │  • Offline queue                                │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Smart connection switching (local → cloud fallback)
- Offline mode with sync queue
- Account-based cloud sync via readsync.org
- Real-time sync status indicator
- Cross-device reading position sync

### 3.2 Enhanced Extension UI
**New popup design:**
```
┌─────────────────────────────────────┐
│  ◉ Incrementum                      │
├─────────────────────────────────────┤
│                                     │
│  Connected to: Local Server         │
│  🟢 Sync active                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📄 Save Page                │   │
│  │   Current: Article Title    │   │
│  │   [+ Add to queue]          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✨ Save Selection           │   │
│  │   [Selected text preview]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Recent: [3] items pending sync    │
│                                     │
│  [Settings] [Dashboard]            │
└─────────────────────────────────────┘
```

### 3.3 In-Page Features
- **Reading mode overlay** - clean, distraction-free view
- **Highlight and annotate** - sync highlights to Incrementum
- **Reading progress indicator** - embedded in page
- **One-click extract to card** - convert text to flashcard
- **Auto-summarization** - AI-powered summary on save

---

## 4. Video Position Tracking Enhancement

### 4.1 Video Player Improvements
**Add to existing YouTube support:**
- **Custom video player** for local video files (MP4, WebM, MKV)
- **Timestamp bookmarks** - mark important moments
- **Variable speed playback** with pitch correction
- **Picture-in-Picture mode** while taking notes
- **Transcript sync** - click transcript to jump to position

### 4.2 Video-Specific Features
- **Chapter detection** (if video has chapters)
- **Screenshot capture** with timestamp
- **Clip extraction** - save segments as extracts
- **Playback statistics** - time watched, skip patterns
- **Review cards from video** - auto-generate from captions

---

## 5. UI/UX Modernization

### 5.1 Design System Refresh
**Current theme improvements:**
- Increase contrast ratios for better accessibility (WCAG AA)
- Add a true "Light" theme option
- Implement theme customization (accent colors)
- Smooth transitions for theme switching

### 5.2 Navigation Improvements
**New sidebar design:**
```
┌──────────────────────┐
│  🏠 Continue Reading │  ← New priority navigation
│  ───────────────────  │
│  📚 Library          │
│  📋 Queue            │
│  🎯 Review           │
│  📊 Analytics        │
│  ⚙️ Settings         │
│                      │
│  Collections         │
│  🔬 Research Papers  │
│  📖 Books            │
│  📝 Articles         │
│  [+ New Collection]  │
│                      │
│  Reading Lists       │
│  🌟 To Read          │
│  ✅ Completed        │
└──────────────────────┘
```

### 5.3 Dashboard Redesign
**New dashboard sections:**
1. **Continue Reading** - 2-3 items at top
2. **Due for Review** - spaced repetition queue preview
3. **Reading Stats** - streak, time today, weekly chart
4. **Recent Activity** - timeline of recent actions
5. **Quick Actions** - import, review, new card

### 5.4 Keyboard Shortcuts System
**Global shortcuts:**
- `Ctrl/Cmd + K` - Command palette
- `Ctrl/Cmd + R` - Resume reading
- `Ctrl/Cmd + N` - New item/card
- `Ctrl/Cmd + I` - Import
- `Ctrl/Cmd + /` - Show all shortcuts

**Viewer shortcuts:**
- `Space` - Scroll down
- `Shift + Space` - Scroll up
- `J/K` - Next/previous page
- `B` - Add bookmark at current position
- `H` - Toggle highlight mode

### 5.5 Mobile Responsiveness
- Collapse sidebar on mobile
- Bottom navigation bar for tablets/phones
- Touch gestures (swipe for next extract)
- Responsive tables and grids

---

## 6. New Features to Add

### 6.1 Collections & Tags
- Hierarchical collections (folders)
- Smart collections (auto-filter by tags, progress, etc.)
- Tag suggestions based on content
- Bulk tag operations

### 6.2 Reading Goals
- Daily/weekly reading time goals
- Pages-per-day targets
- Streak tracking with visual rewards
- Achievement system

### 6.3 Export Options
- Export to Anki (improved)
- Export to Markdown/HTML
- Export progress report
- Export reading statistics

### 6.4 Search & Discovery
- Full-text search across documents
- Filter by tag, collection, progress
- Sort by: recently read, progress, title, date added
- Search within extracts and cards

---

## 7. Technical Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)
1. Create unified position tracking model
2. Implement progress indicators
3. Add "Continue Reading" page

### Phase 2: Import & Extension (Weeks 3-4)
1. Redesign import dialog
2. Add web source integrations
3. Implement cloud sync for extension

### Phase 3: Video & Polish (Weeks 5-6)
1. Video player enhancements
2. Keyboard shortcuts system
3. Dashboard redesign

### Phase 4: Features & Testing (Weeks 7-8)
1. Collections and tags
2. Reading goals system
3. Search functionality
4. QA and bug fixes

---

## 8. Success Metrics

**Quantitative:**
- Daily active reading sessions increase by 30%
- Average session duration increases
- Import-to-completion rate improves
- Extension adoption rate

**Qualitative:**
- User reports easier "resume reading" workflow
- Reduced friction in import process
- Improved satisfaction with browser extension
- Better cross-device experience

---

## 9. Open Questions

1. Should readsync.org require user accounts, or remain anonymous?
2. What is the pricing model for cloud sync (if any)?
3. Should we support annotation sync across devices?
4. Do we need offline-first mobile apps?
5. What AI features should be prioritized (summarization, Q&A, etc.)?

---

## Appendix: File Structure Impact

**New files to create:**
```
src/
  features/
    continue-reading/
      ContinueReadingPage.tsx
      ContinueReadingCard.tsx
    position-tracker/
      PositionIndicator.tsx
      BookmarkManager.tsx
      ReadingStreak.tsx
    collections/
      CollectionManager.tsx
      SmartCollection.tsx
  components/
    viewer/
      position/
        UnifiedPositionTracker.ts
        VideoPositionTracker.ts
    import/
      ImportDialog.tsx
      ImportPreview.tsx
      SourceIntegrations.tsx
  stores/
    positionStore.ts
    syncStateStore.ts
    collectionStore.ts

src-tauri/src/
  services/
    position/
      mod.rs
      unified.rs
      bookmark.rs
    sync/
      mod.rs
      cloud_sync.rs
      offline_queue.rs
```

---

*This plan is a living document and should be updated as development progresses and user feedback is collected.*
