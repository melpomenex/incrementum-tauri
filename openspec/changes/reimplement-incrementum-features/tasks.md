# Implementation Tasks

## Phase 1: Foundation & Infrastructure

### 1.1 Theme System Foundation ✅ COMPLETE
- [x] Create theme type definitions and interfaces
- [x] Set up theme provider with React Context
- [x] Migrate 17 themes from QSS to CSS variables (all themes complete)
- [x] Implement theme persistence using localStorage + Tauri
- [x] Create base theme components with CSS variables
- [x] Add theme switching mechanism with live preview
- [x] Build ThemePicker component with all 17 themes
- [x] Build ThemeCustomizer component for creating custom themes

**Files Created:**
- `src/types/theme.ts` - Theme type definitions
- `src/themes/builtin.ts` - All 17 theme implementations
- `src/contexts/ThemeContext.tsx` - Theme provider and hooks
- `src/components/settings/ThemePicker.tsx` - Theme selection UI
- `src/components/settings/ThemeCustomizer.tsx` - Theme creation UI

### 1.2 Settings Framework ✅ COMPLETE
- [x] Design settings schema with validation (17 categories)
- [x] Create settings store (Zustand with Zod validation)
- [x] Build settings page router and layout
- [x] Implement general settings tab
- [x] Implement interface settings tab with theme picker
- [x] Add settings export/import functionality
- [x] Create reset to defaults functionality
- [x] Integrate SettingsPage into app with ThemeProvider

**Files Created:**
- `src/types/settings.ts` - Settings type definitions
- `src/utils/settingsValidation.ts` - Zod validation schemas
- `src/config/defaultSettings.ts` - Default settings values
- `src/stores/settingsStore.ts` - Zustand store with persistence
- `src/components/settings/SettingsPage.tsx` - Main settings UI (enhanced)
- `src/main.tsx` - Updated with ThemeProvider wrapper

### 1.3 Core Infrastructure
- [ ] Set up IPC layer for Rust backend communication
- [ ] Create database migration system
- [ ] Implement file picker and file system helpers
- [ ] Set up error handling and logging system
- [ ] Create notification system (desktop notifications)
- [ ] Implement keyboard shortcut registration system

## Phase 2: Document Management

### 2.1 Document Import
- [ ] Build file picker component supporting PDF, EPUB, text
- [ ] Implement PDF import with metadata extraction
- [ ] Implement EPUB import with chapter parsing
- [ ] Create URL import dialog
- [ ] Build Arxiv import integration
- [ ] Implement Screenshot capture and import
- [ ] Add Anki deck/package import
- [ ] Create SuperMemo collection import

### 2.2 Document Viewer
- [ ] Build PDF viewer component with pan/zoom
- [ ] Implement EPUB viewer with navigation
- [ ] Create document controls toolbar
- [ ] Add table of contents navigation
- [ ] Implement text selection and highlighting
- [ ] Add page/chapter navigation controls
- [ ] Create fullscreen reading mode

### 2.3 Document Processing
- [ ] Implement auto-segmentation (semantic, paragraph, fixed-length, smart)
- [ ] Create OCR service integration layer
- [ ] Build OCR provider selection UI
- [ ] Implement Google Document AI integration
- [ ] Implement local OCR (Marker/Nougat)
- [ ] Create math OCR for scientific content
- [ ] Build key phrase extraction
- [ ] Implement auto-extract on document load

### 2.4 Annotations & Extracts
- [ ] Create highlight system with 5 color options
- [ ] Implement extract creation from selections
- [ ] Build extracts tree view
- [ ] Add cloze deletion creation
- [ ] Create extract editor dialog
- [ ] Implement extract-to-card conversion
- [ ] Add batch extract operations

## Phase 3: Learning System

### 3.1 Algorithm Implementation
- [ ] Port FSRS algorithm to Rust backend
- [ ] Port SM2 algorithm to Rust backend
- [ ] Port SuperMemo algorithm to Rust backend
- [ ] Create algorithm configuration interface
- [ ] Implement parameter tuning UI
- [ ] Add forgetting curve visualization
- [ ] Build retention vs difficulty charts

### 3.2 Queue Management
- [ ] Create learning queue data model
- [ ] Build queue list component with filtering
- [ ] Implement priority rating system
- [ ] Add custom interval scheduling
- [ ] Create queue search and filter
- [ ] Implement batch queue operations
- [ ] Build queue statistics panel

### 3.3 Review Interface
- [ ] Design review session flow
- [ ] Build flip card component with animations
- [ ] Create cloze card component
- [ ] Implement rating buttons (Again, Hard, Good, Easy)
- [ ] Add review session statistics
- [ ] Create review session summary
- [ ] Implement keyboard shortcuts for review

### 3.4 Statistics & Analytics
- [ ] Build dashboard with stat cards
- [ ] Create learning progress charts
- [ ] Implement retention rate tracking
- [ ] Add upcoming reviews view
- [ ] Build flashcard stats view
- [ ] Create calendar heat map for reviews
- [ ] Implement performance analytics

## Phase 4: Advanced Features

### 4.1 Knowledge Graph
- [ ] Set up graph visualization library (React Flow)
- [ ] Create 2D graph view component
- [ ] Build 3D knowledge sphere (Three.js)
- [ ] Implement force-directed layout
- [ ] Add document-to-extract edge rendering
- [ ] Create graph search and filtering
- [ ] Implement graph interaction (zoom, pan, click)

### 4.2 RSS & Web Content
- [ ] Build RSS feed manager dialog
- [ ] Implement RSS polling service
- [ ] Create RSS article list view
- [ ] Add article processing and queuing
- [ ] Implement RSS auto-import settings
- [ ] Create YouTube viewer widget
- [ ] Integrate SponsorBlock service
- [ ] Build web browser component with sync

### 4.3 Integration Services
- [ ] Create Anki Connect client in Rust
- [ ] Build Anki integration settings
- [ ] Implement Anki deck sync
- [ ] Create Anki card export
- [ ] Build Obsidian vault integration
- [ ] Implement Obsidian daily notes
- [ ] Create Obsidian bidirectional sync
- [ ] Build browser extension sync server
- [ ] Implement VPS cloud sync

### 4.4 AI Features
- [ ] Create Document Q&A panel
- [ ] Implement QA provider integration (OpenAI, Anthropic, etc.)
- [ ] Build auto QA generation
- [ ] Create context window management
- [ ] Implement smart priority scoring
- [ ] Build learning style prediction
- [ ] Create user behavior tracker
- [ ] Implement adaptive weight learning

## Phase 5: Settings & Configuration

### 5.1 Settings Tabs Implementation
- [ ] Complete Documents settings tab
- [ ] Complete Learning settings tab
- [ ] Complete Algorithm settings tab
- [ ] Complete API settings tab
- [ ] Complete QA settings tab
- [ ] Complete Commands settings tab
- [ ] Complete Audio Transcription settings tab
- [ ] Complete Integrations settings tab
- [ ] Complete MCP Servers settings tab
- [ ] Complete Obsidian Integration settings tab
- [ ] Complete Keybindings settings tab
- [ ] Complete RSS Feeds settings tab
- [ ] Complete SponsorBlock settings tab
- [ ] Complete Smart Queues settings tab
- [ ] Complete Sync settings tab

### 5.2 Keybindings System
- [ ] Create keybinding registry
- [ ] Build Vimium-style input manager
- [ ] Implement command palette
- [ ] Create keybinding editor UI
- [ ] Add conflict detection
- [ ] Implement context-aware keybindings
- [ ] Create cheatsheet dialog

## Phase 6: Polish & Optimization

### 6.1 Remaining Themes
- [ ] Migrate Forest Light theme
- [ ] Migrate Ice Blue theme
- [ ] Migrate MapQuest theme
- [ ] Migrate Milky Matcha theme
- [ ] Migrate Minecraft theme
- [ ] Migrate Nocturne Dark theme
- [ ] Migrate Omar Chy Bliss theme
- [ ] Migrate Sandstone Light theme
- [ ] Migrate Super Game Bro theme
- [ ] Migrate Cartographer theme
- [ ] Migrate Modern Polished theme
- [ ] Migrate remaining Mistral variants

### 6.2 Theme Picker
- [ ] Create theme picker dialog with preview
- [ ] Implement theme customization (accent colors)
- [ ] Add custom theme creation
- [ ] Create theme import/export
- [ ] Build theme gallery with screenshots

### 6.3 Performance & UX
- [ ] Implement lazy loading for large document lists
- [ ] Add virtual scrolling for queue and extracts
- [ ] Optimize graph rendering for large datasets
- [ ] Create loading states and skeletons
- [ ] Add error boundaries and recovery
- [ ] Implement undo/redo for critical operations
- [ ] Add keyboard navigation throughout
- [ ] Create tooltips and help text
- [ ] Implement accessibility features (ARIA labels, screen readers)

### 6.4 Testing & Documentation
- [ ] Write unit tests for core algorithms
- [ ] Create integration tests for IPC layer
- [ ] Build E2E tests for critical workflows
- [ ] Write user documentation
- [ ] Create video tutorials
- [ ] Build interactive tutorial/onboarding

## Dependencies & Notes

### Parallel Work Streams
- Theme system and settings framework can be built in parallel
- Document import and viewer are independent of learning system
- Knowledge graph can be developed alongside RSS features
- Integration services can be implemented in any order

### Critical Path
1. Theme system → Settings framework
2. Settings → Document management
3. Document management → Learning system
4. Learning system → Advanced features

### Risk Mitigation
- OCR providers may have rate limits - implement queuing
- Graph visualization performance - test with large datasets early
- Anki sync complexity - start with read-only, add write later
- MCP server integration - implement timeout and error handling
