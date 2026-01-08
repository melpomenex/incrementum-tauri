# Proposal: Full Incrementum-CPP Feature Reimplementation

## Metadata
- **ID**: reimplement-incrementum-features
- **Status**: Proposed
- **Created**: 2025-01-08
- **Author**: AI Assistant

## Problem Statement
The current Tauri-based Incrementum application has basic functionality but lacks the comprehensive feature set of the mature Qt-based Incrementum-CPP implementation. Users rely on features like:
- Multiple sophisticated themes (17 themes exist in Incrementum-CPP)
- Comprehensive settings management across 20+ categories
- Advanced learning algorithms (FSRS, SM2, SuperMemo)
- Document processing (OCR, PDF conversion, segmentation)
- Integration services (Anki, Obsidian, RSS, MCP servers)
- Smart queue management and analytics
- Browser synchronization
- Cloud sync capabilities
- Command palette and vim-style keybindings

## Proposed Solution
Implement a modern, feature-complete reimplementation of all Incrementum-CPP functionality using:
- **Tauri + React + TypeScript** for the frontend
- **Modern CSS-in-JS or Tailwind** for theming (migrating from QSS)
- **React component patterns** instead of Qt widgets
- **Modern state management** (Zustand or Jotai)
- **Web-based theming system** that can import/migrate QSS themes

## Scope

### Feature Areas to Implement

#### 1. Theme System (17 themes from Incrementum-CPP)
- Modern Dark
- Material You (Material 3)
- Snow (Omarchy-inspired light theme)
- Mistral (Light/Dark)
- Aurora Light
- Forest Light
- Ice Blue
- MapQuest
- Milky Matcha
- Minecraft
- Nocturne Dark
- Omar Chy Bliss
- Sandstone Light
- Super Game Bro
- Cartographer
- Modern Polished

**Implementation**: Modern CSS/React-based theme picker with:
- Live theme preview
- Custom theme creation
- Import/export themes
- Dark/light mode detection
- Accent color customization

#### 2. Settings Management (20+ categories)
From the SettingsDialog, implement all settings categories:
- **General**: Auto-save, recent documents, default category, statistics, session restore
- **User Interface**: Theme selection, dense mode, toolbar icon size, statistics display, hint modes
- **Documents**: Auto-segmentation, highlighting, OCR providers, math OCR settings
- **Learning**: Intervals, retention, scheduling, queue modes
- **Algorithm**: FSRS/SM2 selection, forgetting curves, stability parameters
- **Automation**: Auto-sync, notifications, background processing
- **Sync**: Browser sync, VPS cloud sync, desktop full sync
- **API Settings**: QA providers, local LLM, transcription services
- **QA**: Auto-generation, difficulty levels, system prompts, context windows
- **Commands**: Custom command registration and management
- **Audio Transcription**: Auto-transcription, language selection, timestamps, diarization
- **Integrations**: Obsidian, Anki bidirectional sync
- **MCP Servers**: 3 configurable MCP server connections
- **Obsidian Integration**: Advanced sync settings, conflict resolution
- **Keybindings**: Comprehensive keyboard shortcut configuration (Vimium-style)
- **RSS Feeds**: Feed management, auto-import, cleanup settings
- **SponsorBlock**: YouTube sponsor skipping with category filters
- **Smart Queues**: Auto-refresh, queue modes, intelligent filtering

#### 3. Core Features

##### Document Management
- Import: PDF, EPUB, Arxiv, SuperMemo, Anki packages, URLs, screenshots
- Viewer: Enhanced PDF viewer, EPUB viewer, document controls
- Processing: Auto-segmentation, OCR (Google, AWS, Mistral, Mathpix, GPT-4o, Claude, local)
- Extraction: Key phrase extraction, cloze creation
- Annotations: Highlights (5 colors), extracts, notes
- Offline copies: Save and manage offline versions

##### Learning & Review
- Algorithms: FSRS, SM2, SuperMemo with configurable parameters
- Queue management: Smart queues, reading queues, interleaved modes
- Review interface: Flip cards, cloze cards, rating system
- Statistics: Dashboard, charts, flashcard stats, upcoming views
- Scheduling: Custom intervals, priority ratings, due date management

##### Knowledge Graph
- 2D graph visualization with force-directed layout
- 3D knowledge sphere visualization
- Document-to-extract relationships
- Category-based clustering
- Interactive navigation

##### RSS & Web Content
- RSS feed management with auto-polling
- YouTube integration with SponsorBlock
- Web browser with sync capabilities
- Article processing and queue management
- Auto-import and cleanup

##### Integration Services
- **Anki Sync**: Bidirectional sync, deck management, media handling
- **Obsidian Sync**: Vault integration, daily notes, templating, real-time sync
- **Browser Extension**: Highlight sync, web clipping
- **Cloud Sync (VPS)**: Cross-device synchronization
- **MCP Servers**: Connect to external AI services

##### Advanced Features
- **Command Palette**: Fuzzy search for all commands
- **Vim-style Keybindings**: Comprehensive input manager with Vimium mode
- **Developer Console**: Debug and development tools
- **Smart Priority Scoring**: ML-based queue prioritization
- **User Behavior Tracking**: Learning pattern analysis
- **Audio Transcription**: Whisper integration with speaker diarization
- **Document Q&A**: AI-powered question answering from document context
- **Search**: Full-text search with filters
- **Statistics & Analytics**: Comprehensive learning analytics
- **Bento Grid Dashboard**: Modern dashboard layout
- **Arxiv Viewer**: Academic paper integration

## Technical Approach

### Architecture Changes
1. **Theme System**: Migrate from QSS to CSS-in-JS (emotion/styled-components) or Tailwind with theme variables
2. **Component Migration**: Map Qt widgets to React components with modern design patterns
3. **State Management**: Implement Zustand/Jotai stores for global state (replacing Qt signals/slots)
4. **Settings Persistence**: Use Tauri's stores with schema validation
5. **IPC Layer**: Rust backend for file operations, database access, and external integrations

### Implementation Strategy
1. **Phase 1**: Core infrastructure (theme system, settings framework, routing)
2. **Phase 2**: Document management (import, viewing, basic annotations)
3. **Phase 3**: Learning system (algorithms, review interface, queue management)
4. **Phase 4**: Advanced features (knowledge graph, RSS, integrations)
5. **Phase 5**: Polish & optimization (animations, performance, accessibility)

### Theme Migration Strategy
- Parse QSS files to extract color schemes and styling patterns
- Convert to CSS custom properties (variables)
- Create theme provider with React context
- Implement theme picker with live preview
- Support custom themes through JSON schema

## Alternatives Considered

### Alternative 1: Minimal Implementation
Only implement core learning features, defer advanced functionality.
- **Pros**: Faster to market, simpler codebase
- **Cons**: Loses power users, misses critical features

### Alternative 2: Incremental Migration
Keep Qt app as reference, migrate features incrementally.
- **Pros**: Lower risk, can test as we go
- **Cons**: Split focus, longer timeline

### Alternative 3: Hybrid Approach
Use web view for some features, native for others.
- **Pros**: Leverage existing Qt code
- **Cons**: Complex architecture, poor UX

**Decision**: Full reimplementation with modern stack is best for long-term maintainability and UX.

## Success Criteria
- [ ] All 17 themes available with live preview
- [ ] All 20+ settings categories implemented
- [ ] Document import (PDF, EPUB, Arxiv, Anki) working
- [ ] Learning algorithms (FSRS, SM2) functional
- [ ] Review interface complete with all card types
- [ ] Knowledge graph visualization working
- [ ] RSS feed management functional
- [ ] Anki and Obsidian integrations operational
- [ ] Command palette and keybindings system working
- [ ] Performance matches or exceeds Qt version
- [ ] Modern, responsive UI across all platforms

## Dependencies
- Tauri 2.0+ for desktop framework
- React 18+ for UI framework
- Modern graph library (React Flow or Cytoscape.js)
- Database (SQLite through Tauri)
- PDF processing library
- OCR provider APIs (Google, AWS, etc.)

## Timeline Estimate
(To be determined after detailed task breakdown)
