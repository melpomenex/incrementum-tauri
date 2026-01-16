# Implementation Tasks

## Phase 1: RSS Import in Web Browser App

### 1.1 Backend HTTP Endpoints
- [x] 1.1.1 Add `POST /api/rss/feeds` endpoint to browser_sync_server.rs
- [x] 1.1.2 Add `GET /api/rss/feeds` endpoint to browser_sync_server.rs
- [x] 1.1.3 Add `GET /api/rss/feeds/:id/articles` endpoint
- [x] 1.1.4 Add `DELETE /api/rss/feeds/:id` endpoint
- [x] 1.1.5 Add `POST /api/rss/opml/import` endpoint for OPML import
- [x] 1.1.6 Add `GET /api/rss/opml/export` endpoint for OPML export
- [x] 1.1.7 Add `PUT /api/rss/feeds/:id` endpoint for feed updates
- [x] 1.1.8 Add CORS middleware configuration for RSS endpoints

### 1.2 Frontend RSS Reader Updates
- [x] 1.2.1 Update src/api/rss.ts to use HTTP endpoints instead of localStorage
- [ ] 1.2.2 Update src/components/media/RSSReader.tsx to call HTTP API
- [ ] 1.2.3 Add authentication headers to RSS API calls
- [ ] 1.2.4 Handle loading states for API calls
- [ ] 1.2.5 Add error handling for network failures
- [ ] 1.2.6 Test feed subscription flow
- [ ] 1.2.7 Test OPML import/export functionality

### 1.3 Testing and Validation
- [ ] 1.3.1 Write unit tests for RSS HTTP endpoints
- [ ] 1.3.2 Test RSS feed parsing in web context
- [ ] 1.3.3 Test CORS and authentication
- [ ] 1.3.4 Test OPML import with various feed formats
- [ ] 1.3.5 Verify data sync between Tauri and Web app

## Phase 2: Document Sharing Links

### 2.1 State Encoding/Decoding Utilities
- [x] 2.1.1 Create src/lib/shareLink.ts utility module
- [x] 2.1.2 Implement `encodeDocumentState()` function
- [x] 2.1.3 Implement `decodeDocumentState()` function
- [x] 2.1.4 Implement `compressIdList()` for highlight/extract ID compression
- [x] 2.1.5 Implement `decompressIdList()` for ID decompression
- [x] 2.1.6 Add TypeScript types for share state interface

### 2.2 Share Button Components
- [x] 2.2.1 Add Share button to DocumentViewer component
- [x] 2.2.2 Add Share button to YouTubeViewer component
- [x] 2.2.3 Implement share link generation on click
- [x] 2.2.4 Add clipboard copy feedback animation
- [ ] 2.2.5 Add "Link copied" toast notification

### 2.3 URL Fragment Parsing
- [ ] 2.3.1 Update DocumentViewer to parse URL fragments on mount
- [ ] 2.3.2 Update YouTubeViewer to parse timestamp from fragment
- [ ] 2.3.3 Implement scroll position restoration from fragment
- [ ] 2.3.4 Implement highlight loading from fragment IDs
- [ ] 2.3.5 Implement extract loading from fragment IDs
- [ ] 2.3.6 Handle invalid fragment data gracefully

### 2.4 Privacy and Permissions
- [ ] 2.4.1 Add privacy warning for private document shares
- [ ] 2.4.2 Implement authentication check for shared links
- [ ] 2.4.3 Add public/private document indicator
- [ ] 2.4.4 Test permission scenarios

### 2.5 Testing and Validation
- [ ] 2.5.1 Test share link generation for documents
- [ ] 2.5.2 Test share link generation for YouTube videos
- [ ] 2.5.3 Test state restoration from shared links
- [ ] 2.5.4 Test long URL handling (many highlights/extracts)
- [ ] 2.5.5 Test cross-platform sharing (Tauri to Web, Web to Tauri)

## Phase 3: YouTube Video Progress in Web Browser App

### 3.1 Progress API Endpoints
- [x] 3.1.1 Add `GET /api/documents/:id` endpoint to browser_sync_server.rs
- [x] 3.1.2 Add `POST /api/documents/:id/progress` endpoint
- [x] 3.1.3 Ensure endpoints return current_page for video documents
- [x] 3.1.4 Add error handling for missing documents

### 3.2 YouTube Viewer Updates
- [x] 3.2.1 Update YouTubeViewer.tsx to use HTTP API for progress
- [x] 3.2.2 Implement progress auto-save with HTTP calls
- [x] 3.2.3 Add progress loading on video initialization
- [x] 3.2.4 Handle network failures gracefully
- [x] 3.2.5 Add retry logic for failed progress saves
- [x] 3.2.6 Test progress save interval timing

### 3.3 Cross-Platform Sync
- [ ] 3.3.1 Verify database schema consistency
- [ ] 3.3.2 Test progress sync from Tauri to Web
- [ ] 3.3.3 Test progress sync from Web to Tauri
- [ ] 3.3.4 Test concurrent progress updates

### 3.4 Configuration
- [ ] 3.4.1 Add auto-save interval setting to settings page
- [ ] 3.4.2 Create UI for enabling/disabling progress tracking
- [ ] 3.4.3 Persist configuration to database
- [ ] 3.4.4 Apply configuration in both Tauri and Web apps

### 3.5 Testing and Validation
- [ ] 3.5.1 Test progress save on pause
- [ ] 3.5.2 Test progress save on interval
- [ ] 3.5.3 Test progress restoration on video load
- [ ] 3.5.4 Test with various video lengths
- [ ] 3.5.5 Test offline behavior (network failures)

## Phase 4: RSS Customization

### 4.1 Database Schema
- [ ] 4.1.1 Create `rss_user_preferences` table migration
- [ ] 4.1.2 Add columns for filter presets, display settings, layout options
- [ ] 4.1.3 Create indexes for user_id and feed_id
- [ ] 4.1.4 Add foreign key constraints

### 4.2 Backend API
- [ ] 4.2.1 Add `GET /api/rss/preferences` endpoint
- [ ] 4.2.2 Add `PUT /api/rss/preferences` endpoint
- [ ] 4.2.3 Add `POST /api/rss/filters` endpoint for filter presets
- [ ] 4.2.4 Add `GET /api/rss/filters` endpoint
- [ ] 4.2.5 Add `DELETE /api/rss/filters/:id` endpoint
- [ ] 4.2.6 Implement filter logic server-side for efficiency

### 4.3 Filtering System
- [ ] 4.3.1 Implement keyword filter logic
- [ ] 4.3.2 Implement author filter logic
- [ ] 4.3.3 Implement category filter logic
- [ ] 4.3.4 Implement read status filter logic
- [ ] 4.3.5 Implement filter combination logic (AND/OR)
- [ ] 4.3.6 Add filter validation

### 4.4 Customization UI
- [ ] 4.4.1 Create RSS customization panel component
- [ ] 4.4.2 Add Filters tab with keyword/author/category inputs
- [ ] 4.4.3 Add Display tab with theme/font/thumbnail options
- [ ] 4.4.4 Add Layout tab with density/column options
- [ ] 4.4.5 Add Sorting tab with view mode options
- [ ] 4.4.6 Implement live preview of changes
- [ ] 4.4.7 Add preset save/load UI

### 4.5 Smart Views
- [ ] 4.5.1 Implement "Briefing mode" (last 24h)
- [ ] 4.5.2 Implement "Deep dive mode" (long-form)
- [ ] 4.5.3 Implement "Trending mode" (engagement-based)
- [ ] 4.5.4 Add view mode selector to RSS reader
- [ ] 4.5.5 Test sorting algorithms

### 4.6 Persistence
- [ ] 4.6.1 Implement preference saving on change
- [ ] 4.6.2 Implement preference loading on feed view
- [ ] 4.6.3 Add per-feed vs global preference logic
- [ ] 4.6.4 Implement preference export/import
- [ ] 4.6.5 Add reset to defaults functionality

### 4.7 Testing and Validation
- [ ] 4.7.1 Test all filter types individually
- [ ] 4.7.2 Test combined filters
- [ ] 4.7.3 Test all display options
- [ ] 4.7.4 Test all layout options
- [ ] 4.7.5 Test smart view modes
- [ ] 4.7.6 Test preference persistence
- [ ] 4.7.7 Test preference export/import

## Phase 5: Feature Parity Review and Additional Features

### 5.1 Capability Audit
- [ ] 5.1.1 Create feature parity matrix spreadsheet
- [ ] 5.1.2 List all Tauri app features
- [ ] 5.1.3 Check Web app implementation status
- [ ] 5.1.4 Identify gaps and technical blockers

### 5.2 Priority Features
- [ ] 5.2.1 Identify high-value missing features
- [ ] 5.2.2 Assess implementation complexity
- [ ] 5.2.3 Prioritize by value/complexity ratio
- [ ] 5.2.4 Create proposals for top 5 features

### 5.3 Documentation
- [ ] 5.3.1 Update user documentation for new features
- [ ] 5.3.2 Create migration guide for Tauri to Web
- [ ] 5.3.3 Document API endpoints
- [ ] 5.3.4 Create troubleshooting guide

### 5.4 Final Testing
- [ ] 5.4.1 End-to-end testing of all new features
- [ ] 5.4.2 Cross-browser compatibility testing
- [ ] 5.4.3 Performance testing
- [ ] 5.4.4 Accessibility testing
- [ ] 5.4.5 Security audit of new endpoints

## Notes

- Tasks in each phase should be completed sequentially
- Testing tasks should be completed before moving to next phase
- Mark tasks as complete with `x` when done: `- [x] 1.1.1 Task name`
- Update this file as implementation progresses
- Consider parallel work on independent phases (e.g., Phase 2 and 3 can overlap)
