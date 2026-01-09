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

### 1.3 Core Infrastructure ✅ COMPLETE
- [x] Set up IPC layer for Rust backend communication
- [x] Create database migration system
- [x] Implement file picker and file system helpers
- [x] Set up error handling and logging system
- [x] Create notification system (desktop notifications)
- [x] Implement keyboard shortcut registration system

## Phase 2: Document Management

### 2.1 Document Import ✅ COMPLETE
- [x] Build file picker component supporting PDF, EPUB, text
- [x] Implement PDF import with metadata extraction
- [x] Implement EPUB import with chapter parsing
- [x] Create URL import dialog
- [ ] Build Arxiv import integration
- [x] Implement Screenshot capture and import
- [x] Add Anki deck/package import
- [x] Create SuperMemo collection import

### 2.2 Document Viewer ✅ COMPLETE
- [x] Build PDF viewer component with pan/zoom
- [x] Implement EPUB viewer with navigation
- [x] Create document controls toolbar
- [x] Add table of contents navigation
- [x] Implement text selection and highlighting
- [x] Add page/chapter navigation controls
- [ ] Create fullscreen reading mode

### 2.3 Document Processing
- [ ] Implement auto-segmentation (semantic, paragraph, fixed-length, smart)
- [x] Create OCR service integration layer
- [ ] Build OCR provider selection UI
- [ ] Implement Google Document AI integration
- [ ] Implement local OCR (Marker/Nougat)
- [ ] Create math OCR for scientific content
- [ ] Build key phrase extraction
- [ ] Implement auto-extract on document load

### 2.4 Annotations & Extracts ✅ COMPLETE
- [x] Create highlight system with 5 color options
- [x] Implement extract creation from selections
- [x] Build extracts tree view
- [x] Add cloze deletion creation
- [x] Create extract editor dialog
- [x] Implement extract-to-card conversion
- [x] Add batch extract operations

## Phase 3: Learning System

### 3.1 Algorithm Implementation ✅ COMPLETE
- [x] Port FSRS algorithm to Rust backend
- [x] Port SM2 algorithm to Rust backend
- [x] Port SuperMemo algorithm to Rust backend
- [x] Create algorithm configuration interface
- [x] Implement parameter tuning UI
- [x] Add forgetting curve visualization
- [x] Build retention vs difficulty charts

### 3.1.1 FSRS 5.2 Scheduling Alignment
- [ ] Update FSRS scheduling logic to align with FSRS 5.2 for learning items
- [ ] Confirm learning items use FSRS 5.2 when FSRS is active
- [ ] Add validation or tests for FSRS 5.2 scheduling outcomes

### 3.2 Queue Management ✅ COMPLETE
- [x] Create learning queue data model
- [x] Build queue list component with filtering
- [x] Implement priority rating system
- [x] Add custom interval scheduling
- [x] Create queue search and filter
- [x] Implement batch queue operations
- [x] Build queue statistics panel

### 3.5 Document Queue Priority Scheduling
- [ ] Add rating (1-4) and priority slider (0-100) controls to Document View queue items
- [ ] Compute combined priority score (rating + slider) and sort the Document View queue by the score
- [ ] Persist rating and slider updates and refresh queue ordering
- [ ] Add validation or tests for priority score calculation

### 3.3 Review Interface ✅ COMPLETE
- [x] Design review session flow
- [x] Build flip card component with animations
- [x] Create cloze card component
- [x] Implement rating buttons (Again, Hard, Good, Easy)
- [x] Add review session statistics
- [x] Create review session summary
- [x] Implement keyboard shortcuts for review

### 3.4 Statistics & Analytics ✅ COMPLETE
- [x] Build dashboard with stat cards
- [x] Create learning progress charts
- [x] Implement retention rate tracking
- [x] Add upcoming reviews view
- [x] Build flashcard stats view
- [x] Create calendar heat map for reviews
- [x] Implement performance analytics

## Phase 4: Advanced Features

### 4.1 Knowledge Graph ✅ COMPLETE
- [x] Set up graph visualization library (React Flow)
- [x] Create 2D graph view component
- [x] Build 3D knowledge sphere (Three.js)
- [x] Implement force-directed layout
- [x] Add document-to-extract edge rendering
- [x] Create graph search and filtering
- [x] Implement graph interaction (zoom, pan, click)

### 4.2 RSS & Web Content ✅ COMPLETE
- [x] Build RSS feed manager dialog
- [x] Implement RSS polling service
- [x] Create RSS article list view
- [x] Add article processing and queuing
- [x] Implement RSS auto-import settings
- [x] Create YouTube viewer widget
- [x] Integrate SponsorBlock service
- [x] Build web browser component with sync

### 4.3 Web Browser Native Webview
- [ ] Replace iframe rendering with a Tauri-native webview surface in the Web Browser tab
- [ ] Wire navigation controls (back/forward/refresh) to the native webview APIs
- [ ] Surface loading state and title updates from the native webview
- [ ] Confirm external browser fallback remains available

### 4.3 Integration Services ✅ COMPLETE
- [x] Create Anki Connect client in Rust
- [x] Build Anki integration settings
- [x] Implement Anki deck sync
- [x] Create Anki card export
- [x] Build Obsidian vault integration
- [x] Implement Obsidian daily notes
- [x] Create Obsidian bidirectional sync
- [x] Build browser extension sync server
- [x] Implement VPS cloud sync

### 4.4 AI Features ✅ COMPLETE
- [x] Create Document Q&A panel
- [x] Implement QA provider integration (OpenAI, Anthropic, etc.)
- [x] Build auto QA generation
- [x] Create context window management
- [x] Implement smart priority scoring
- [x] Build learning style prediction
- [x] Create user behavior tracker
- [x] Implement adaptive weight learning

## Phase 5: Settings & Configuration

### 5.1 Settings Tabs Implementation ✅ COMPLETE
- [x] Complete Documents settings tab
- [x] Complete Learning settings tab
- [x] Complete Algorithm settings tab
- [x] Complete API settings tab
- [x] Complete QA settings tab
- [x] Complete Commands settings tab
- [ ] Complete Audio Transcription settings tab
- [x] Complete Integrations settings tab
- [ ] Complete MCP Servers settings tab
- [x] Complete Obsidian Integration settings tab
- [x] Complete Keybindings settings tab
- [x] Complete RSS Feeds settings tab
- [x] Complete SponsorBlock settings tab
- [ ] Complete Smart Queues settings tab
- [x] Complete Sync settings tab

### 5.2 Keybindings System ✅ COMPLETE
- [x] Create keybinding registry
- [x] Build Vimium-style input manager
- [x] Implement command palette
- [x] Create keybinding editor UI
- [x] Add conflict detection
- [x] Implement context-aware keybindings
- [x] Create cheatsheet dialog

## Phase 6: Polish & Optimization

### 6.1 Remaining Themes ✅ COMPLETE
- [x] Migrate Forest Light theme
- [x] Migrate Ice Blue theme
- [x] Migrate MapQuest theme
- [x] Migrate Milky Matcha theme
- [x] Migrate Minecraft theme
- [x] Migrate Nocturne Dark theme
- [x] Migrate Omar Chy Bliss theme
- [x] Migrate Sandstone Light theme
- [x] Migrate Super Game Bro theme
- [x] Migrate Cartographer theme
- [x] Migrate Modern Polished theme
- [x] Migrate remaining Mistral variants

### 6.2 Theme Picker ✅ COMPLETE
- [x] Create theme picker dialog with preview
- [x] Implement theme customization (accent colors)
- [x] Add custom theme creation
- [x] Create theme import/export
- [ ] Build theme gallery with screenshots

### 6.3 Performance & UX ✅ COMPLETE
- [x] Implement lazy loading for large document lists
- [x] Add virtual scrolling for queue and extracts
- [x] Optimize graph rendering for large datasets
- [x] Create loading states and skeletons
- [x] Add error boundaries and recovery
- [ ] Implement undo/redo for critical operations
- [x] Add keyboard navigation throughout
- [x] Create tooltips and help text
- [x] Implement accessibility features (ARIA labels, screen readers)

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
