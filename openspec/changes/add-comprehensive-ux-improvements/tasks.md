# Implementation Tasks

## Phase 1: Enhanced Position Tracking (Weeks 1-2)

### 1.1 Database & Backend
- [ ] 1.1.1 Create migration for `bookmarks` table
- [ ] 1.1.2 Add `position_json` column to documents table
- [ ] 1.1.3 Create migration script to backfill position_json from existing fields
- [ ] 1.1.4 Create migration for `reading_sessions` table
- [ ] 1.1.5 Create `reading_goals` table
- [ ] 1.1.6 Implement `DocumentPosition` enum in Rust
- [ ] 1.1.7 Create `PositionService` for position CRUD operations
- [ ] 1.1.8 Add Tauri commands: `create_bookmark`, `list_bookmarks`, `delete_bookmark`
- [ ] 1.1.9 Add Tauri commands: `start_reading_session`, `end_reading_session`
- [ ] 1.1.10 Add Tauri commands: `set_reading_goal`, `get_reading_goal`, `get_reading_stats`

### 1.2 Frontend Core
- [ ] 1.2.1 Create `src/features/position-tracker/` directory structure
- [ ] 1.2.2 Implement `usePositionTracker` hook for unified position tracking
- [ ] 1.2.3 Create `PositionIndicator` component for progress bars
- [ ] 1.2.4 Create `ReadingTimeEstimate` component
- [ ] 1.2.5 Create `BookmarkManager` component
- [ ] 1.2.6 Create `ReadingStreak` component with heatmap visualization
- [ ] 1.2.7 Add position store (Zustand) for bookmarks and sessions

### 1.3 Viewer Integration
- [ ] 1.3.1 Update `PDFViewer` to use unified position tracking
- [ ] 1.3.2 Update `EPUBViewer` to use unified position tracking
- [ ] 1.3.3 Update `DocumentViewer` to use unified position tracking
- [ ] 1.3.4 Add position indicator to all document thumbnails
- [ ] 1.3.5 Implement bookmark creation in viewers (Ctrl/Cmd + B)

### 1.4 Continue Reading Page
- [ ] 1.4.1 Create `src/pages/ContinueReadingPage.tsx`
- [ ] 1.4.2 Create `ContinueReadingCard` component
- [ ] 1.4.3 Add route for `/continue-reading`
- [ ] 1.4.4 Add "Continue Reading" to top-level navigation
- [ ] 1.4.5 Implement grouping: Just Started, Halfway, Almost Done
- [ ] 1.4.6 Add keyboard shortcut (Ctrl/Cmd + Shift + R)

---

## Phase 2: Web Import & Extension (Weeks 3-4)

### 2.1 Enhanced Import Dialog
- [ ] 2.1.1 Create `src/components/import/ImportDialog.tsx`
- [ ] 2.1.2 Create `ImportPreview` component with content preview
- [ ] 2.1.3 Create `ImportOptions` component with tag/category selection
- [ ] 2.1.4 Implement URL metadata extraction (title, author, word count)
- [ ] 2.1.5 Add reading time estimate to import preview
- [ ] 2.1.6 Add "Preview" button to show content before import

### 2.2 Source Integrations
- [ ] 2.2.1 Create `src-tauri/src/importers/notion.rs`
- [ ] 2.2.2 Create `src-tauri/src/importers/medium.rs`
- [ ] 2.2.3 Create `src-tauri/src/importers/twitter.rs` (thread unrolling)
- [ ] 2.2.4 Create `src-tauri/src/importers/reddit.rs`
- [ ] 2.2.5 Create `src-tauri/src/importers/substack.rs`
- [ ] 2.2.6 Add source detection logic based on URL pattern
- [ ] 2.2.7 Create importer registry for extensibility

### 2.3 Auto-Tagging
- [ ] 2.3.1 Implement keyword extraction from content
- [ ] 2.3.2 Create tag suggestion based on content analysis
- [ ] 2.3.3 Add existing tag auto-completion
- [ ] 2.3.4 Create smart category assignment based on tags

### 2.4 Browser Extension Cloud Sync
- [ ] 2.4.1 Create `src-tauri/src/cloud/sync_service.rs`
- [ ] 2.4.2 Implement offline queue in database
- [ ] 2.4.3 Add Tauri command: `sync_to_cloud`, `sync_from_cloud`
- [ ] 2.4.4 Add connection status indicator to UI
- [ ] 2.4.5 Implement conflict resolution (last-write-wins)
- [ ] 2.4.6 Create `SyncStatusIndicator` component

### 2.5 Extension Integration
- [ ] 2.5.1 Update browser extension manifest for cloud permissions
- [ ] 2.5.2 Implement dual-connection logic (local → cloud → offline)
- [ ] 2.5.3 Add extension popup UI improvements
- [ ] 2.5.4 Implement quick capture with preview
- [ ] 2.5.5 Add in-page highlighting sync to Incrementum

---

## Phase 3: Video Enhancements (Weeks 5-6)

### 3.1 Video Player
- [ ] 3.1.1 Create `src/components/media/LocalVideoPlayer.tsx`
- [ ] 3.1.2 Support MP4, WebM, MKV formats
- [ ] 3.1.3 Implement variable speed playback with pitch correction
- [ ] 3.1.4 Add Picture-in-Picture mode
- [ ] 3.1.5 Create keyboard shortcuts for video control

### 3.2 Video Position Tracking
- [ ] 3.2.1 Add `Time { seconds }` variant to `DocumentPosition`
- [ ] 3.2.2 Implement position save/restore for video
- [ ] 3.2.3 Create `VideoPositionIndicator` component (timeline marker)
- [ ] 3.2.4 Add video progress to document thumbnails

### 3.3 Video Features
- [ ] 3.3.1 Create `VideoBookmark` component
- [ ] 3.3.2 Implement timestamp bookmarks with thumbnails
- [ ] 3.3.3 Create chapter detection for supported videos
- [ ] 3.3.4 Implement transcript sync (click transcript → jump position)
- [ ] 3.3.5 Add clip extraction from video segments
- [ ] 3.3.6 Create review cards from video captions

---

## Phase 4: UI Modernization & New Features (Weeks 7-8)

### 4.1 Theme Improvements
- [ ] 4.1.1 Audit existing theme colors for WCAG AA compliance
- [ ] 4.1.2 Create true "Light" theme variant
- [ ] 4.1.3 Add theme customization (accent colors)
- [ ] 4.1.4 Implement smooth theme transitions

### 4.2 Navigation Redesign
- [ ] 4.2.1 Update sidebar component with new structure
- [ ] 4.2.2 Add "Continue Reading" as priority nav item
- [ ] 4.2.3 Reorganize Collections section in sidebar
- [ ] 4.2.4 Add collapsible sections

### 4.3 Command Palette
- [ ] 4.3.1 Create `CommandPalette` component
- [ ] 4.3.2 Define command registry and types
- [ ] 4.3.3 Register navigation commands
- [ ] 4.3.4 Register document commands
- [ ] 4.3.5 Register review commands
- [ ] 4.3.6 Register settings commands
- [ ] 4.3.7 Add global keyboard shortcut (Ctrl/Cmd + K)
- [ ] 4.3.8 Add fuzzy search for commands

### 4.4 Keyboard Shortcuts
- [ ] 4.4.1 Create `useKeyboardShortcuts` hook
- [ ] 4.4.2 Define shortcut registry
- [ ] 4.4.3 Implement global shortcuts (Space, J/K, B, H, etc.)
- [ ] 4.4.4 Create `KeyboardShortcutsHelp` modal
- [ ] 4.4.5 Add customizable shortcuts in settings

### 4.5 Collections
- [ ] 4.5.1 Create migration for collections tables
- [ ] 4.5.2 Create `CollectionManager` component
- [ ] 4.5.3 Create `SmartCollection` component with filter builder
- [ ] 4.5.4 Implement hierarchical collections (folders)
- [ ] 4.5.5 Add drag-and-drop for organizing collections
- [ ] 4.5.6 Create collection-specific views in Documents page

### 4.6 Reading Goals
- [ ] 4.6.1 Create `ReadingGoals` component
- [ ] 4.6.2 Create `GoalProgress` component with visual progress
- [ ] 4.6.3 Implement streak tracking with `StreakDisplay` component
- [ ] 4.6.4 Add goal configuration in settings
- [ ] 4.6.5 Create achievement notifications for milestones

### 4.7 Full-Text Search
- [ ] 4.7.1 Create migration for FTS5 virtual table
- [ ] 4.7.2 Implement content indexing on document import
- [ ] 4.7.3 Create `SearchBar` component with autocomplete
- [ ] 4.7.4 Create `SearchResults` component
- [ ] 4.7.5 Add advanced search filters (by tag, collection, date)
- [ ] 4.7.6 Implement search query syntax (quotes for phrases, boolean operators)
- [ ] 4.7.7 Add search to Command Palette

### 4.8 Mobile Responsiveness
- [ ] 4.8.1 Create collapsible sidebar component
- [ ] 4.8.2 Add bottom navigation bar for mobile
- [ ] 4.8.3 Implement touch gestures (swipe for next extract)
- [ ] 4.8.4 Make tables and grids responsive
- [ ] 4.8.5 Optimize tap targets for touch

---

## Validation & Testing

### Backend Tests
- [ ] Write unit tests for `DocumentPosition` enum
- [ ] Write unit tests for `PositionService`
- [ ] Write unit tests for bookmark CRUD operations
- [ ] Write unit tests for reading session tracking
- [ ] Write unit tests for reading streak calculations
- [ ] Write integration tests for importers
- [ ] Write integration tests for cloud sync

### Frontend Tests
- [ ] Write tests for `PositionIndicator` component
- [ ] Write tests for `ContinueReadingPage`
- [ ] Write tests for `ImportDialog`
- [ ] Write tests for `CommandPalette`
- [ ] Write tests for `CollectionManager`
- [ ] Write tests for `SearchBar` and `SearchResults`

### E2E Tests
- [ ] Test "Continue Reading" full workflow
- [ ] Test web import with preview
- [ ] Test extension capture and sync
- [ ] Test video position tracking
- [ ] Test collections CRUD
- [ ] Test reading goals and streaks
- [ ] Test full-text search

### Accessibility Testing
- [ ] Test keyboard navigation throughout app
- [ ] Test with screen reader
- [ ] Verify color contrast ratios
- [ ] Test touch gestures on mobile devices

### Performance Testing
- [ ] Test with 1000+ documents
- [ ] Test position update debouncing
- [ ] Test search query performance
- [ ] Test sync performance with large queue
- [ ] Measure app startup time

---

## Documentation

- [ ] Update API documentation for new Tauri commands
- [ ] Document position tracking model
- [ ] Document cloud sync architecture
- [ ] Create user guide for new features
- [ ] Document keyboard shortcuts
- [ ] Update browser extension README
- [ ] Create migration guide for existing users

---

## Deployment Checklist

- [ ] All migrations tested with production data
- [ ] Feature flags ready for gradual rollout
- [ ] Extension updated and published to stores
- [ ] Release notes prepared
- [ ] Known issues documented
- [ ] Rollback plan tested
