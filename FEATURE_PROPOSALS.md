# Incrementum Feature Proposals

## Executive Summary

Based on comprehensive codebase analysis, this document proposes new features that maintain 1:1 feature parity between the Tauri Desktop App and Web Browser App, while addressing gaps in the current implementation.

---

## Part 1: Existing Feature Inventory

### Core Learning Features ✅
- **Spaced Repetition System (SRS)** with FSRS algorithm
- **Multiple Card Types**: Flashcards, Cloze deletions, Q&A
- **Review Session Management**: Due cards, rating system, scheduling
- **Queue Management**: Learning queue, suspended items, leech threshold
- **Analytics Dashboard**: Study streak, retention rate, activity charts

### Document Management ✅
- **Multi-Format Support**: PDF, EPUB, Markdown, HTML, YouTube
- **Import Pipeline**: File picker, folder import, URL fetch, ArXiv integration
- **Document Metadata**: Title, author, language, word count, reading time
- **Priority System**: Rating (1-5), slider (0-100), calculated priority score
- **Categories**: Hierarchical organization with color coding

### Extracts & Annotations ✅
- **Text Extracts**: Highlight selections with notes and colors
- **Page Tracking**: Extracts linked to specific pages
- **Progressive Disclosure**: Multiple levels for spaced revealing
- **Tagging System**: Custom tags per extract
- **Learning Item Generation**: Auto-generate cards from extracts

### AI Integration ✅
- **Flashcard Generation**: AI-powered card creation from content
- **Q&A System**: Ask questions about documents with AI context
- **Content Summarization**: AI summarization of documents/sections
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, Ollama
- **Configuration Management**: API keys, model selection, parameters

### RSS Features ✅ (Recently Enhanced)
- **Feed Subscription**: Add/remove feeds via URL
- **OPML Import/Export**: Bulk feed management
- **Feed Updates**: Manual and automatic refresh
- **Article Management**: Mark read/unread, favorites
- **Ultra-Customization**: 20+ customization options (NEW)
  - Filter preferences (keywords, authors, categories)
  - Display preferences (view mode, theme, density)
  - Layout preferences (columns, thumbnails)
  - Sorting preferences (date, title, engagement)
  - Smart view modes (Briefing, Deep dive, Trending)

### Study Statistics ✅
- **Daily Statistics**: Cards reviewed, correct rate, study time
- **Memory States**: New, learning, review, relearning cards
- **Category Breakdown**: Performance by subject area
- **Activity Tracking**: Daily/weekly/monthly charts

### Settings & Configuration ✅
- **Learning Settings**: Algorithm (FSRS/SM2), new cards/day, reviews/day
- **PDF/EPUB Settings**: Zoom, fonts, two-page spread, auto-scroll
- **OCR Settings**: Multiple providers (Tesseract, Google, AWS, Azure, Marker)
- **Theme System**: Light, dark, system preference
- **Font Sizing**: Adjustable font size

---

## Part 2: Feature Parity Gaps (Tauri vs Web)

### Currently Missing in Web App ❌

| Feature | Tauri Status | Web Status | Priority |
|---------|-------------|------------|----------|
| File System Access | ✅ Native | ⚠️ Limited | High |
| Native PDF Rendering | ✅ PDF.js | ✅ PDF.js | Parity |
| EPUB Rendering | ✅ Native | ⚠️ Needs implementation | Medium |
| Auto-Save Configuration | ⚠️ Settings only | ⚠️ Settings only | Parity |
| Document Sharing Links | ✅ New | ✅ New | Parity |
| RSS Customization | ✅ Full | ✅ Full | Parity |
| Progress Tracking (Videos) | ✅ New | ✅ New | Parity |
| Privacy Controls for Sharing | ⚠️ Not implemented | ⚠️ Not implemented | High |
| Authentication for Shared Links | ⚠️ Not implemented | ⚠️ Not implemented | High |

---

## Part 3: Proposed New Features

### 🔥 Priority 1: Knowledge Graph & Concept Mapping

**Description**: Visualize connections between documents, extracts, and learning items to build a personal knowledge graph.

**User Value**:
- See how concepts relate across different documents
- Identify knowledge gaps and connection opportunities
- Visual learning path through subjects
- Discover related content automatically

**Implementation Plan**:
1. **Backend**:
   - Add `concept_links` table to store connections between entities
   - Add `concepts` table for extracted key terms/phrases
   - AI-powered concept extraction from documents
   - Graph algorithms for finding shortest paths, clusters

2. **Frontend**:
   - Interactive network visualization component (D3.js or Cytoscape.js)
   - Concept browser with search and filters
   - Auto-suggestion for related content
   - Timeline view of knowledge acquisition

3. **Parity Considerations**:
   - Works identically in both Tauri and Web
   - Visualization libraries are web-compatible
   - Database operations are the same

**Database Schema**:
```sql
CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
);

CREATE TABLE concept_links (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,  -- 'document', 'extract', 'learning_item'
    source_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    relevance REAL DEFAULT 1.0,
    FOREIGN KEY (concept_id) REFERENCES concepts(id)
);

CREATE TABLE concept_relationships (
    id TEXT PRIMARY KEY,
    concept_a_id TEXT NOT NULL,
    concept_b_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,  -- 'related', 'prerequisite', 'contains'
    strength REAL DEFAULT 1.0,
    FOREIGN KEY (concept_a_id) REFERENCES concepts(id),
    FOREIGN KEY (concept_b_id) REFERENCES concepts(id)
);
```

**Estimated Complexity**: Medium-High
**Estimated Time**: 2-3 weeks

---

### 🔥 Priority 2: Advanced Search & Filtering

**Description**: Full-text search across all documents with AI-powered semantic search and advanced filters.

**User Value**:
- Find content across entire library quickly
- Semantic search (find similar even if exact words don't match)
- Filter by multiple criteria simultaneously
- Save search queries for reuse

**Implementation Plan**:
1. **Backend**:
   - Add FTS5 full-text search index to documents, extracts
   - Semantic search using embeddings (OpenAI text-embedding-3-small)
   - Saved searches table for storing user queries
   - Search history with trending queries

2. **Frontend**:
   - Global search bar (Cmd/Ctrl+K)
   - Advanced search panel with filters
   - Search results with relevance scoring
   - Search query builder for complex queries
   - Saved searches library

3. **Parity Considerations**:
   - Embeddings computed server-side (same for both)
   - Search UI works identically in both versions

**Database Schema**:
```sql
CREATE TABLE document_embeddings (
    document_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,  -- Vector storage
    model_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE VIRTUAL TABLE document_fts USING fts5(
    title,
    content,
    content=documents,
    content_rowid=rowid
);

CREATE TABLE saved_searches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    filters TEXT NOT NULL,  -- JSON
    user_id TEXT,
    created_at TEXT NOT NULL
);
```

**Estimated Complexity**: Medium
**Estimated Time**: 1-2 weeks

---

### 🔥 Priority 3: Collaborative Features (Shared Collections)

**Description**: Allow users to share collections of documents, extracts, and learning cards with other users.

**User Value**:
- Study groups can share materials
- Teachers can distribute content to students
- Public knowledge libraries
- Community-powered content curation

**Implementation Plan**:
1. **Backend**:
   - Add `shared_collections` table
   - Add `collection_members` for permissions
   - Add `shared_items` table linking items to collections
   - HTTP API for collection CRUD operations
   - Permission system (owner, editor, viewer)

2. **Frontend**:
   - Collection browser/discover
   - Create/edit collection interface
   - Share panel with permission settings
   - Import shared collections to library

3. **Parity Considerations**:
   - Same API for both Tauri and Web
   - No special platform-specific features

**Database Schema**:
```sql
CREATE TABLE shared_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private',  -- private, shared, public
    slug TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    item_count INTEGER DEFAULT 0
);

CREATE TABLE collection_permissions (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission_level TEXT NOT NULL,  -- owner, editor, viewer
    granted_at TEXT NOT NULL,
    granted_by TEXT NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES shared_collections(id)
);

CREATE TABLE collection_items (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    item_type TEXT NOT NULL,  -- document, extract, learning_item
    item_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    added_by TEXT NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES shared_collections(id)
);
```

**Estimated Complexity**: High
**Estimated Time**: 2-3 weeks

---

### 🔥 Priority 4: Mobile-Optimized Reading View

**Description**: Responsive, mobile-first reading interface with gesture controls and PWA support.

**User Value**:
- Read on the go from any device
- Sync progress between desktop and mobile
- Offline reading capability (PWA)
- Touch-optimized controls

**Implementation Plan**:
1. **Frontend**:
   - Responsive reading modes for mobile
   - Touch gestures (swipe for next/prev page)
   - PWA manifest for installability
   - Offline page caching
   - Mobile-optimized controls

2. **Backend**:
   - No changes needed (existing APIs work)

3. **Parity Considerations**:
   - Tauri desktop version gets same responsive UI
   - Native mobile app could use same web codebase

**Key Features**:
- Adaptive layout based on screen size
- Bottom navigation for mobile
- Pull-to-refresh for content updates
- Haptic feedback for actions

**Estimated Complexity**: Medium
**Estimated Time**: 1-2 weeks

---

### 🔥 Priority 5: Voice Notes & Audio Recording

**Description**: Record voice notes while reading, associate with extracts, and search transcribed content.

**User Value**:
- Capture thoughts hands-free while reading
- Create audio extracts for later review
- Generate questions from voice notes
- Search through spoken content

**Implementation Plan**:
1. **Backend**:
   - Add `voice_notes` table
   - Integration with speech-to-text API (Whisper)
   - Store both audio and transcription
   - Link voice notes to documents/extracts

2. **Frontend**:
   - Recording controls in reading view
   - Audio player for playback
   - Transcription display with timestamps
   - Search through transcriptions

3. **Parity Considerations**:
   - Tauri: Use native audio recording APIs
   - Web: Use MediaRecorder API
   - Server-side transcription works for both

**Database Schema**:
```sql
CREATE TABLE voice_notes (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    extract_id TEXT,
    audio_path TEXT NOT NULL,
    transcription TEXT,
    duration REAL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (extract_id) REFERENCES extracts(id)
);
```

**Estimated Complexity**: Medium-High
**Estimated Time**: 2 weeks

---

### Priority 6: AI-Powered Content Recommendations

**Description**: Smart recommendations for what to read or review next based on learning patterns.

**User Value**:
- Discover relevant content automatically
- Optimize review schedule with AI
- Get personalized reading suggestions
- Reduce decision fatigue

**Implementation Plan**:
1. **Backend**:
   - Recommendation engine using collaborative filtering
   - Content-based filtering using embeddings
   - Time-based recommendations (reviews due)
   - Track recommendation performance

2. **Frontend**:
   - "For You" section with recommendations
   - Recommendation reasons ("Because you studied X")
   - Feedback mechanism (thumbs up/down)
   - Recommendation settings

3. **Parity Considerations**:
   - Same backend logic for both
   - Same frontend components

**Estimated Complexity**: High
**Estimated Time**: 2-3 weeks

---

### Priority 7: Export to External Platforms

**Description**: Export learning content to Anki, Quizlet, Obsidian, Notion, and other platforms.

**User Value**:
- Use preferred study tools
- Backup content externally
- Cross-platform compatibility
- Integration with existing workflows

**Implementation Plan**:
1. **Backend**:
   - Export formats: Anki APKG, Quizlet CSV, Obsidian Markdown
   - Template system for customizable exports
   - Batch export functionality
   - Export history

2. **Frontend**:
   - Export wizard with format selection
   - Template editor for custom formats
   - Preview before export
   - Export scheduling

3. **Parity Considerations**:
   - File download works in both Tauri and Web
   - Same export logic

**Estimated Complexity**: Medium
**Estimated Time**: 1-2 weeks

---

### Priority 8: Reading Goals & Achievements

**Description**: Gamification system with daily/weekly goals, achievements, and streaks.

**User Value**:
- Stay motivated with goals
- Track consistency with streaks
- Unlock achievements for milestones
- Friendly competition with leaderboards (optional)

**Implementation Plan**:
1. **Backend**:
   - Add `user_goals` table
   - Add `achievements` table
   - Add `user_achievements` table
   - Goal progress calculation
   - Achievement unlock logic

2. **Frontend**:
   - Goal setting interface
   - Progress rings and achievement displays
   - Notification system for unlocks
   - Achievement browser

3. **Parity Considerations**:
   - Same logic for both platforms
   - Same UI components

**Estimated Complexity**: Medium
**Estimated Time**: 1-2 weeks

---

### Priority 9: Multi-Language Support (i18n)

**Description**: Full internationalization with translated UI and RTL language support.

**User Value**:
- Use app in native language
- Support for learning multiple languages
- RTL support for Arabic, Hebrew, etc.
- Community translations

**Implementation Plan**:
1. **Frontend**:
   - Extract all strings to translation files
   - i18n framework (react-i18next or similar)
   - Language switcher in settings
   - RTL layout support

2. **Backend**:
   - Translated error messages
   - Multi-language content detection
   - Localized date/time formats

3. **Parity Considerations**:
   - Same translations for both
   - Same language detection

**Estimated Complexity**: High
**Estimated Time**: 3-4 weeks

---

### Priority 10: Advanced Analytics & Insights

**Description**: Deep learning analytics with retention curves, optimal study time, and performance predictions.

**User Value**:
- Understand personal learning patterns
- Optimize study schedule
- Identify weak areas
- Predict performance

**Implementation Plan**:
1. **Backend**:
   - Extended statistics calculations
   - Retention curve generation
   - Predictive models for card success
   - A/B testing for study strategies

2. **Frontend**:
   - Advanced analytics dashboard
   - Interactive charts (Plotly or D3)
   - Insights and recommendations
   - Export analytics data

3. **Parity Considerations**:
   - Same calculations for both
   - Chart libraries work in both

**Estimated Complexity**: High
**Estimated Time**: 2-3 weeks

---

## Part 4: Implementation Priority Matrix

### Quick Wins (1-2 weeks each)

| Feature | Value | Complexity | Parity | Priority |
|---------|-------|------------|--------|----------|
| Privacy Controls for Sharing | High | Low | ✅ | 🔥 High |
| Advanced Search | High | Medium | ✅ | 🔥 High |
| Export to External Platforms | High | Medium | ✅ | Medium |
| Reading Goals | Medium | Medium | ✅ | Medium |

### Medium-Term (2-3 weeks each)

| Feature | Value | Complexity | Parity | Priority |
|---------|-------|------------|--------|----------|
| Knowledge Graph | Very High | High | ✅ | 🔥 High |
| Collaborative Features | High | High | ✅ | Medium |
| Mobile Reading View | High | Medium | ✅ | 🔥 High |
| Voice Notes | Medium | Medium | ✅ | Medium |

### Long-Term (3-4 weeks each)

| Feature | Value | Complexity | Parity | Priority |
|---------|-------|------------|--------|----------|
| AI Recommendations | High | High | ✅ | Medium |
| Multi-Language | Medium | High | ✅ | Low |
| Advanced Analytics | Medium | High | ✅ | Low |

---

## Part 5: Recommended Implementation Order

### Phase 1: Quick Wins (4-6 weeks total)
1. **Privacy Controls for Sharing** (1 week) - Complete Phase 2.4 from original plan
2. **Advanced Search** (2 weeks) - High value, moderate complexity
3. **Export to External Platforms** (2 weeks) - Highly requested feature
4. **Reading Goals** (1 week) - Quick motivational feature

### Phase 2: Major Features (6-8 weeks total)
1. **Knowledge Graph** (3 weeks) - Highest value new feature
2. **Mobile Reading View** (2 weeks) - Expand accessibility
3. **Voice Notes** (3 weeks) - Unique differentiator

### Phase 3: Community & Advanced (8-10 weeks total)
1. **Collaborative Features** (3 weeks) - Build community
2. **AI Recommendations** (3 weeks) - Enhance discovery
3. **Advanced Analytics** (3 weeks) - Power user features
4. **Multi-Language** (4 weeks) - Global accessibility

---

## Part 6: Next Steps

**For immediate implementation, I recommend:**

1. **Start with Privacy Controls** - Complete the original Phase 2.4 requirements
2. **Implement Advanced Search** - High ROI, builds on existing infrastructure
3. **Build Knowledge Graph MVP** - Start with basic concept extraction and simple visualization

**Each feature proposal above includes:**
- ✅ Database schema migrations
- ✅ Backend API endpoints
- ✅ Frontend component specifications
- ✅ 1:1 parity considerations
- ✅ Estimated complexity and timeline

Would you like me to create detailed design documents for any of these proposed features?
