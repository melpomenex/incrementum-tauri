# OpenSpec Proposal: Full Incrementum-CPP Feature Reimplementation

## Overview

This proposal documents a comprehensive reimplementation of all features from the Qt-based Incrementum-CPP application in the modern Tauri + React + TypeScript codebase.

## What I Found

### Features Catalogued from Incrementum-CPP

After thorough examination of `Incrementum-CPP/`, I identified the following major feature areas:

#### 1. **Theme System (17 Themes)**
All themes are implemented as QSS (Qt Style Sheets) files:
- Modern Dark
- Material You (Material 3 Design)
- Snow (light, minimalist)
- Mistral (Light & Dark variants)
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

#### 2. **Settings Management (20+ Categories)**
The `SettingsDialog.cpp` (~29,000 lines) reveals comprehensive settings:
- General (auto-save, recent documents, session restore)
- User Interface (themes, dense mode, toolbar, statistics)
- Documents (auto-segment, OCR providers, math OCR)
- Learning (intervals, retention, queue modes)
- Algorithm (FSRS/SM2/SuperMemo selection)
- Automation (auto-sync, notifications)
- API Settings (QA providers, local LLM, transcription)
- QA (auto-generation, difficulty, context windows)
- Commands (custom command registration)
- Audio Transcription (Whisper, diarization)
- Integrations (Anki, Obsidian, MCP servers)
- Keybindings (comprehensive Vimium-style system)
- RSS Feeds (feed management, auto-import)
- SponsorBlock (YouTube integration)
- Sync (browser, VPS cloud, desktop)
- Smart Queues (intelligent filtering)

#### 3. **Document Management**
From `MainWindow.h` and dialogs:
- Import: PDF, EPUB, Arxiv, SuperMemo, Anki packages, URLs, screenshots
- Viewing: Enhanced PDF viewer, EPUB viewer, document controls
- Processing: Auto-segmentation (4 strategies), OCR (7 providers), math OCR
- Annotations: Highlights (5 colors), extracts, cloze deletions
- Offline copies with management

#### 4. **Learning & Review**
- Algorithms: FSRS, SM2, SuperMemo with full parameter control
- Queue: Smart queues, reading queues, interleaved modes
- Review: Flip cards, cloze cards, rating system
- Statistics: Dashboard, charts, upcoming views, flashcard stats

#### 5. **Knowledge Graph**
- 2D graph visualization (`GraphView.cpp`)
- 3D knowledge sphere (`KnowledgeSphereWidget`)
- Force-directed layout
- Document-to-extract relationships

#### 6. **RSS & Web**
- RSS feed manager (`RssFeedDialog.cpp`)
- YouTube viewer with SponsorBlock
- Web browser with sync capabilities
- Auto-import and cleanup

#### 7. **Advanced Features**
- Command Palette (`CommandPaletteDialog.cpp`)
- Vim-style keybindings (`InputManager.h`)
- Developer Console
- Smart Priority Scoring (ML-based)
- User Behavior Tracking
- Document Q&A with AI
- Full-text search
- Bento Grid Dashboard
- Arxiv viewer

## Proposal Structure

The OpenSpec proposal is located at:
```
openspec/changes/reimplement-incrementum-features/
├── proposal.md          # Overview and problem statement
├── design.md            # Technical architecture and design
├── tasks.md             # Detailed implementation tasks
├── specs/               # Requirement specifications
│   ├── theme-system/
│   ├── settings-management/
│   └── document-management/
└── README.md           # This file
```

## Key Architectural Decisions

### 1. Theme Migration: QSS → CSS-in-JS/Tailwind
- Parse QSS files to extract color schemes
- Convert to CSS custom properties
- Implement React Context-based theme provider
- Support live theme switching and preview

### 2. Settings: Qt Settings → Zustand + Tauri Store
- Schema-based validation with Zod
- Persistent storage via Tauri's secure store
- Event-driven updates for dependent systems
- Import/export functionality

### 3. Components: Qt Widgets → React Components
- Map widgets to modern React patterns
- Smart components (with state) vs dumb components (presentational)
- Hooks for business logic
- Context for global state

### 4. IPC: Qt Signals → Tauri Commands
- Rust backend for file operations
- Async command invocation
- Event system for notifications
- Type-safe IPC layer

## Implementation Phases

### Phase 1: Foundation
- Theme system (5 core themes)
- Settings framework
- Basic routing and layout

### Phase 2: Documents
- Import (PDF, EPUB, Arxiv, URL)
- Viewing with controls
- Basic processing (segmentation)

### Phase 3: Learning
- Algorithm implementation
- Queue management
- Review interface

### Phase 4: Advanced Features
- Knowledge graph
- RSS & integrations
- AI features

### Phase 5: Polish
- Remaining themes
- Performance optimization
- Testing and documentation

## Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Tauri 2.0+** for desktop
- **Tailwind CSS + emotion** for styling
- **Zustand** for state management
- **React Router v7** for routing
- **React Flow** for 2D graph
- **Three.js** for 3D knowledge sphere
- **Recharts** for statistics

### Backend (Rust)
- **Tauri 2.0**
- **SQLite** (via sqlx)
- **Tokio** for async runtime
- **reqwest** for HTTP clients

## What's Next

1. **Review the proposal** - Check `openspec/changes/reimplement-incrementum-features/proposal.md`
2. **Validate** - Run `openspec validate reimplement-incrementum-features --strict`
3. **Discuss** - Any questions or clarifications needed?
4. **Approval** - Ready to implement?

## Questions to Consider

1. **Priority**: Which features are most critical for your use case?
2. **Timeline**: Do you have timeline constraints?
3. **Resources**: Will this be a solo effort or team project?
4. **Incremental delivery**: Would you prefer to release phases incrementally?
5. **Backward compatibility**: Need to support Qt app data migration?

## Feature Completeness Checklist

From my analysis, here are ALL features that need implementation:

### Core Features ✅
- [ ] 17 themes with picker
- [ ] 20+ settings categories
- [ ] Document import (6 formats)
- [ ] Document viewer (PDF/EPUB)
- [ ] OCR integration (7 providers)
- [ ] Auto-segmentation (4 strategies)
- [ ] Highlights and extracts
- [ ] Cloze deletion creation
- [ ] Learning algorithms (FSRS/SM2/SuperMemo)
- [ ] Queue management
- [ ] Review interface
- [ ] Statistics dashboard

### Advanced Features ✅
- [ ] Knowledge graph (2D & 3D)
- [ ] RSS feed management
- [ ] YouTube + SponsorBlock
- [ ] Anki integration
- [ ] Obsidian integration
- [ ] Browser extension sync
- [ ] VPS cloud sync
- [ ] MCP server integration
- [ ] Command palette
- [ ] Vimium keybindings
- [ ] Document Q&A
- [ ] Audio transcription
- [ ] SMART priority scoring
- [ ] User behavior tracking

### Integration Features ✅
- [ ] Arxiv import
- [ ] SuperMemo import
- [ ] Anki package import
- [ ] Screenshot capture
- [ ] Web browser integration
- [ ] Developer console
- [ ] Full-text search

## File Locations

Reference files from Incrementum-CPP:
- Settings: `Incrementum-CPP/src/ui/dialogs/SettingsDialog.cpp` (122KB)
- Main Window: `Incrementum-CPP/src/ui/MainWindow.cpp` (288KB)
- Themes: `Incrementum-CPP/resources/styles/*.qss` (17 files)
- Widgets: `Incrementum-CPP/src/ui/widgets/` (40+ widget files)
- Dialogs: `Incrementum-CPP/src/ui/dialogs/` (20+ dialog files)

Let me know if you'd like me to dive deeper into any specific area or adjust the proposal!
