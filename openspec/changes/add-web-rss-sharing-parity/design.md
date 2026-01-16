# Design: Web Browser App RSS, Sharing, and YouTube Progress Parity

## Context

The Incrementum application exists in two forms:
1. **Tauri Desktop App**: Full-featured desktop application with native OS integration
2. **Web Browser App (PWA)**: Progressive Web App version for browser-based access

Currently, the Tauri version has features that don't work or are missing in the web version. This design ensures 1:1 feature parity.

### Key Architectural Differences
- **Tauri**: Has direct database access, can run system commands (yt-dlp), native file system access
- **Web/PWA**: Must use API endpoints, limited browser storage, constrained security sandbox

### Existing Implementations

#### RSS (Tauri: src-tauri/src/commands/rss.rs)
- Database-backed feed storage with `rss_feeds` and `rss_articles` tables
- Commands: `create_rss_feed`, `get_rss_feeds`, `fetch_rss_feed_url`, etc.
- Frontend component: `src/components/media/RSSReader.tsx` (uses localStorage, not database)

#### YouTube Progress (src/components/viewer/YouTubeViewer.tsx)
- Progress stored in `documents.current_page` field (as seconds)
- Auto-saves every 5 seconds during playback
- `update_document_progress` command in repository.rs:366

## Goals / Non-Goals

### Goals
1. Enable RSS feed functionality in web app with same features as Tauri
2. Create shareable document links that preserve reading state
3. Ensure YouTube video position tracking works in web version
4. Add comprehensive RSS customization options
5. Identify and implement additional parity features

### Non-Goals
- Rewrite entire Tauri app as web app
- Remove features from Tauri version
- Implement server-side RSS aggregation service
- Build a full social sharing platform

## Decisions

### 1. RSS Import Architecture

**Decision**: Use existing Tauri RSS commands via HTTP bridge for PWA

Since the web app communicates with the Tauri backend via HTTP (`browser_sync_server.rs`), we'll:
- Add RSS endpoints to the HTTP server
- Reuse existing RSS command implementations
- Client-side fetches feed metadata, sends to backend for persistence

**Alternatives considered**:
- Client-side only: Would require re-implementing all RSS logic, no database persistence
- New REST API: Unnecessary duplication of existing Tauri commands

### 2. Document Sharing Link Format

**Decision**: URL fragment-based state encoding

Shareable links will use URL fragments (hash) to encode reading state:
```
https://app.example.com/document/{id}#pos=123&highlights=a1,b2&extracts=c3
```

**Rationale**:
- Fragments aren't sent to server, preserving privacy
- Work with existing routing
- Easy to encode/decode
- Stateless - no server-side storage required

**State to encode**:
- `pos`: Reading position (page number or video timestamp)
- `highlights`: Comma-separated highlight IDs
- `extracts`: Comma-separated extract IDs
- `scroll`: Optional scroll position percentage

### 3. YouTube Progress in Web Version

**Decision**: Auto-save via existing `update_document_progress` command

The YouTubeViewer component already implements progress tracking. The issue is ensuring it works in PWA context:
- Confirm `update_document_progress` is accessible via HTTP API
- Ensure CORS and authentication allow PWA to call backend
- Add progress tracking to browser_sync_server endpoints

**Implementation**:
- Add `POST /api/document/:id/progress` endpoint to browser_sync_server.rs
- PWA calls this endpoint every 5 seconds during playback
- Store timestamp in `current_page` field (existing pattern)

### 4. RSS Customization Architecture

**Decision**: User preference storage + dynamic rendering

Customization will use a layered approach:
1. **Database preferences**: Stored per-user for server-side filtering
2. **LocalStorage preferences**: UI settings (theme, layout density)
3. **URL params**: Temporary view overrides

**Customization Options**:
- **Filters**: Keyword include/exclude, author whitelist/blacklist, category filters
- **Display**: Card/list view, show/hide metadata, content preview length
- **Sorting**: Date, title, read status, custom criteria
- **Layout**: Dense/comfortable, 1-3 column, sidebar position

### 5. Feature Parity Strategy

**Decision**: Create capability matrix and prioritize by user value

We'll systematically identify gaps:
1. Audit all Tauri features
2. Check availability in web version
3. Assess technical feasibility
4. Prioritize by user impact
5. Implement in order of value/complexity ratio

## Risks / Trade-offs

### Risk: CORS and Authentication Complexity
**Mitigation**: Use existing Tauri HTTP server authentication patterns

### Risk: URL Fragment Length Limits
**Mitigation**: Use compression for highlight/extract ID lists, fallback to server-stored presets

### Risk: Real-time Sync Conflicts
**Mitigation**: Last-write-wins for progress, version stamps for collaborative features

### Trade-off: Client vs Server Filtering
**Choice**: Server-side for user-configured filters, client-side for temporary views
**Reason**: Balances performance (less data transfer) with flexibility

## Migration Plan

### Phase 1: RSS Import in Web App
1. Add HTTP endpoints to browser_sync_server.rs for RSS operations
2. Update RSSReader.tsx to use API calls instead of localStorage
3. Test OPML import/export
4. Deploy and validate

### Phase 2: Document Sharing
1. Implement state encoding/encoding utilities
2. Add URL fragment parsing to document viewer
3. Update YouTubeViewer and DocumentViewer to read fragment state
4. Add "Share" button components
5. Deploy and validate

### Phase 3: YouTube Progress
1. Add progress endpoint to browser_sync_server.rs
2. Ensure CORS/proxy allows PWA communication
3. Test progress saving/restoring in PWA context
4. Deploy and validate

### Phase 4: RSS Customization
1. Create user_preferences table for RSS settings
2. Build settings UI component
3. Implement dynamic feed rendering based on preferences
4. Deploy and validate

### Rollback
- All changes additive; existing Tauri functionality unaffected
- Can revert web changes without breaking desktop app

## Open Questions

1. **Authentication**: How will web users authenticate to access their RSS feeds?
   - Options: Token-based auth, OAuth, session cookies

2. **Offline Support**: Should RSS feeds be cached for offline PWA use?
   - Trade-off: Storage vs. functionality

3. **Multi-device Sync**: Should RSS subscriptions sync across devices?
   - Requires cloud sync architecture

4. **Performance**: How frequently should feeds auto-refresh in web version?
   - Desktop can poll; web has different constraints
