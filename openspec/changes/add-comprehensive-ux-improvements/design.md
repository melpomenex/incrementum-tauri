# Design: Comprehensive UI/UX Improvements

## Context

Incrementum is an incremental reading application built with Tauri 2.0 (Rust backend) and React 19 (TypeScript frontend). It currently supports:
- Multiple document types (PDF, EPUB, Markdown, HTML, video)
- Spaced repetition with FSRS-5 algorithm
- Position tracking via separate fields (current_page, current_scroll_percent, current_cfi, current_view_state)
- Browser extension connecting to localhost:8766
- Basic collections (client-side only via Zustand)

### Current Pain Points
1. Position tracking is duplicated across fields with no abstraction
2. No visual feedback for reading progress
3. Web import is a basic URL input with no preview
4. Extension has no cloud sync or offline support
5. Video support is limited to YouTube
6. UI has contrast issues and limited keyboard navigation

### Stakeholders
- **End users** - Want seamless "resume reading" experience and better content organization
- **Extension users** - Need cross-device sync and offline capture
- **Mobile users** - Need responsive design and touch gestures
- **Power users** - Want keyboard shortcuts and advanced filtering

## Goals / Non-Goals

### Goals
1. Unified position tracking that works across all document types
2. Visual progress indicators and "Continue Reading" experience
3. Enhanced web import with preview and smart categorization
4. Browser extension with cloud sync via readsync.org
5. Improved video support with local files and transcripts
6. Modern, accessible UI with keyboard shortcuts
7. Collections, reading goals, and full-text search

### Non-Goals
- Real-time collaborative features (outside scope)
- Social sharing or public profiles
- Mobile app development (PWA only)
- Video hosting or streaming infrastructure
- AI-generated content (leverage existing AI features only)

## Decisions

### Decision 1: Unified Position Model

**What**: Create a `DocumentPosition` enum that abstracts different position types.

**Why**:
- Current system has 4 separate fields (current_page, current_scroll_percent, current_cfi, current_view_state)
- Each viewer type implements its own position logic
- No unified way to calculate "reading progress percentage"

**Alternatives considered**:
1. **Keep separate fields** - Simpler but requires duplicate logic everywhere
2. **JSON blob for all positions** - Flexible but loses type safety and queryability
3. **Unified enum (chosen)** - Type-safe, queryable, extensible

**Implementation**:
```rust
pub enum DocumentPosition {
    Page { page: u32, offset: f32 },           // PDF
    Scroll { percent: f32, element_id: Option<String> },  // HTML/Markdown
    CFI { cfi: String, offset: f32 },          // EPUB
    Time { seconds: u32 },                     // Video
}
```

**Migration**: Existing position fields remain for backward compatibility; new `position_json` column added.

---

### Decision 2: Collections as Database Tables

**What**: Move collections from client-side Zustand store to database tables.

**Why**:
- Current collections are local-only (don't sync across devices)
- Can't query collections efficiently
- No relationship to documents for filtering

**Alternatives considered**:
1. **Keep client-side** - Simple but limits future features
2. **Database tables (chosen)** - Enables sync, search, and filtering

**Implementation**:
```sql
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    type TEXT NOT NULL DEFAULT 'manual',  -- 'manual' or 'smart'
    filter_query TEXT,  -- For smart collections
    icon TEXT,
    color TEXT,
    date_created TEXT NOT NULL,
    date_modified TEXT NOT NULL
);

CREATE TABLE document_collections (
    document_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    date_added TEXT NOT NULL,
    PRIMARY KEY (document_id, collection_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
```

---

### Decision 3: Browser Extension Dual-Connection Mode

**What**: Extension connects to both local server AND readsync.org cloud API.

**Why**:
- Current extension only works when desktop app is running
- Users want to capture content on mobile/other devices
- Offline queue prevents data loss

**Alternatives considered**:
1. **Cloud-only** - Requires internet, loses local-first benefits
2. **Local-only (current)** - Doesn't work when app closed
3. **Dual mode with fallback (chosen)** - Best of both worlds

**Architecture**:
```
Extension tries local (127.0.0.1:8766)
  ├─ Success → Use local server
  └─ Failure → Try cloud API (readsync.org)
      ├─ Success → Queue for sync when local available
      └─ Failure → Store in offline queue
```

---

### Decision 4: FTS5 for Full-Text Search

**What**: Use SQLite FTS5 extension for document content search.

**Why**:
- Native to SQLite (no external dependency)
- Fast full-text search with ranking
- Supports boolean queries and phrase searches

**Alternatives considered**:
1. **LIKE queries** - Too slow for large content
2. **External search engine** - Overkill for single-user app
3. **FTS5 (chosen)** - Built-in, fast, sufficient for needs

**Implementation**:
```sql
CREATE VIRTUAL TABLE document_search USING fts5(
    document_id,
    title,
    content,
    content_type,
    tokenize = 'porter unicode61'
);
```

---

### Decision 5: Reading Goals with Streaks

**What**: Track daily reading time and maintain streak counters.

**Why**:
- Gamification increases engagement
- Visual feedback motivates consistent reading
- Streaks are a proven pattern (Duolingo, GitHub)

**Alternatives considered**:
1. **No gamification** - Less engaging
2. **Complex achievement system** - Over-engineering
3. **Simple goals + streaks (chosen)** - Proven, minimal complexity

**Implementation**:
```sql
CREATE TABLE reading_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    goal_type TEXT NOT NULL,  -- 'daily_minutes', 'daily_pages', 'weekly_minutes'
    target_value INTEGER NOT NULL,
    date_created TEXT NOT NULL
);

CREATE TABLE reading_sessions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    pages_read INTEGER,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Computed view for streak calculation
CREATE VIEW daily_reading_stats AS
SELECT
    date(started_at) as reading_date,
    SUM(duration_seconds) as total_seconds,
    COUNT(DISTINCT document_id) as documents_read
FROM reading_sessions
GROUP BY date(started_at);
```

---

### Decision 6: Command Palette Architecture

**What**: Global Cmd/Ctrl+K command palette with searchable actions.

**Why**:
- Power users prefer keyboard over mouse
- Reduces navigation friction
- Discovers features users might not find in menus

**Alternatives considered**:
1. **Menu-based only** - Standard but slower
2. **Keyboard shortcuts for everything** - Too many to remember
3. **Command palette (chosen)** - Best of both worlds

**Implementation**:
```typescript
interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'document' | 'review' | 'settings';
  keywords: string[];
  action: () => void | Promise<void>;
  shortcut?: string;
}

// Commands registered from feature modules
// Central command palette filters by label/keywords
```

---

## Risks / Trade-offs

### Risk 1: Database Migration Complexity
**Risk**: Position data migration could fail or corrupt existing data.

**Mitigation**:
- Add new `position_json` column alongside existing fields
- Migration script reads existing fields and writes to new format
- Keep old fields as fallback during transition period
- Extensive testing with real user data before deployment

### Risk 2: Browser Extension Cloud Sync Latency
**Risk**: Cloud sync may introduce lag or data inconsistency.

**Mitigation**:
- Local-first: always write to local server first
- Cloud sync is asynchronous with conflict resolution
- Use last-write-wins with timestamp for simple conflicts
- Provide manual "sync now" button for user control

### Risk 3: FTS5 Index Size
**Risk**: Full-text search index may be large for users with many documents.

**Mitigation**:
- Index only document title and extract content (not full document text)
- Provide option to disable search for privacy/disk space
- Lazy indexing (only index when search is used)
- Periodic index maintenance

### Risk 4: Scope Creep
**Risk**: Too many features may delay delivery or reduce quality.

**Mitigation**:
- Phased implementation (4 phases over 8 weeks)
- Each phase delivers user-visible value
- Can ship individual phases independently
- Cut less important features if timeline slips

### Trade-off 1: Client-Side vs Server-Side Collections
**Trade-off**: Client-side collections are faster; server-side enables sync.

**Decision**: Server-side (database tables) for sync capability, with client-side caching for performance.

### Trade-off 2: Universal Video Support vs Format Coverage
**Trade-off**: Support all video formats vs focus on common ones.

**Decision**: Support common formats (MP4, WebM, MKV) via browser's built-in codec support; avoid bundling FFmpeg to keep app size small.

## Migration Plan

### Phase 1: Database Schema Changes
1. Add migration script for new tables
2. Backfill `position_json` from existing position fields
3. Create FTS5 virtual table and index existing content
4. Validate migration with production data dump

### Phase 2: API Changes
1. Add new Tauri commands for bookmarks, collections, goals, search
2. Keep old position update commands (mark deprecated)
3. Add new position commands using unified model
4. Update TypeScript types

### Phase 3: Frontend Migration
1. Create new components with unified position tracking
2. Migrate existing viewers one at a time
3. Add "Continue Reading" page
4. Update navigation structure

### Phase 4: Extension Updates
1. Update extension to support dual-connection mode
2. Add cloud sync integration (readsync.org API)
3. Implement offline queue
4. Release as extension update

### Rollback Plan
- Old position fields remain (can revert position UI)
- Feature flags for new features (can disable if buggy)
- Database migrations are reversible (down migration scripts)
- Extension versioning (can rollback extension independently)

## Open Questions

1. **readsync.org Authentication**: Should cloud sync require user accounts or use anonymous device IDs?
2. **AI Features**: Should auto-tagging use local AI (Ollama) or cloud API (OpenAI)?
3. **Video Formats**: Are MP4, WebM, MKV sufficient or do we need AVI, MOV, etc.?
4. **Mobile Features**: Should we prioritize PWA or consider React Native in future?
5. **Search Scope**: Should search include learning items or just documents/extracts?

---

## Performance Considerations

### Position Updates
- **Current**: Immediate save on every scroll
- **Issue**: Excessive database writes
- **Solution**: Debounce updates (500ms) + batch on document close

### Search Indexing
- **Current**: No search
- **Plan**: FTS5 index on extract content
- **Optimization**: Index incrementally on document import, not full rebuild

### Progress Calculations
- **Current**: Computed on-demand
- **Issue**: Slow for large document lists
- **Solution**: Materialized view or cached progress_percent column

### Sync Traffic
- **Plan**: Batch position updates every 30 seconds
- **Conflict**: Last-write-wins with millisecond timestamps
- **Offline**: Queue up to 1000 operations locally

---

## Security Considerations

### Cloud Sync
- End-to-end encryption for synced data
- API keys stored in secure system keychain
- OAuth for readsync.org authentication

### Browser Extension
- Content security policy for injected scripts
- Sanitize HTML from imported web pages
- Rate limiting on local server endpoint

### FTS5 Search
- No injection risk (parameterized queries)
- Search index stored locally (no cloud exposure)
- Option to exclude sensitive documents from index

---

## Testing Strategy

### Unit Tests
- Position model serialization/deserialization
- Collection filtering logic
- Search query parsing
- Goal/streak calculations

### Integration Tests
- Position save/restore cycles
- Collection CRUD operations
- Import dialog with various sources
- Extension capture and sync

### E2E Tests
- "Continue Reading" workflow
- Cross-device position sync
- Full import-to-review flow
- Search and filter operations

### Manual Testing
- Accessibility (keyboard navigation, screen readers)
- Mobile responsiveness (touch gestures, layouts)
- Performance (large document libraries, slow networks)
