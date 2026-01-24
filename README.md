# Incrementum

<div align="center">

**Incremental Reading + Spaced Repetition = Knowledge Retention**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-informational)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)]()

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## What is Incrementum?

**Incrementum** is a sophisticated desktop application that combines **incremental reading** with **spaced repetition** to help you efficiently process and retain information from large volumes of content. Built with modern technologies (Tauri + React + Rust), it offers a beautiful, fast, and cross-platform learning environment.

### Core Philosophy

- **Incremental Reading**: Process large documents in small, manageable chunks over time
- **Spaced Repetition**: Review content at scientifically-optimized intervals using FSRS-5 algorithm
- **Import Flexibility**: Bring content from anywhere - PDFs, EPUBs, websites, research papers, even Anki decks
- **Smart Scheduling**: Know exactly when you'll review each card again with preview intervals
- **Rich Analytics**: Track your progress, streaks, and performance metrics

---

## ✨ Features

### 📚 Document Management

- **Multi-Format Import**: Support for PDF, EPUB, Markdown, HTML, TXT, and JSON
- **URL Import**: Fetch and process content from any web URL
- **Arxiv Integration**: Import research papers with full metadata
- **Anki Import**: Migrate your existing .apkg packages
- **SuperMemo Import**: Import from SuperMemo exports
- **Screenshot Capture**: Capture screens and turn them into learning materials
- **Auto-Segmentation**: Intelligently split documents into manageable sections
- **Metadata Extraction**: Automatic word count, reading time, complexity scoring

### 🧠 Learning & Review

- **FSRS-5 Algorithm**: State-of-the-art spaced repetition with 90% retention rate
- **Preview Intervals**: See exactly when each card will be reviewed for all ratings
- **Multiple Card Types**: Flashcards, cloze deletion, Q&A, and basic items
- **Keyboard Shortcuts**: Lightning-fast reviews with full keyboard control
- **Queue Management**: Advanced filtering, sorting, and bulk operations
- **Virtual Scrolling**: Handle 10,000+ cards smoothly

### 📊 Analytics & Insights

- **Dashboard Stats**: Cards due, total cards, retention rate
- **Activity Charts**: 30-day review history visualization
- **Study Streaks**: Track consecutive days of learning
- **Goals System**: Set and track daily/weekly targets
- **Category Breakdown**: Performance by subject area
- **FSRS Metrics**: Stability and difficulty tracking

### 🎨 User Experience

- **17 Beautiful Themes**: 6 dark and 11 light themes with live preview
- **Custom Themes**: Create and edit your own color schemes
- **Responsive Design**: Works on any screen size
- **Fast Performance**: Startup time <500ms, reviews <50ms
- **Cross-Platform**: Native apps for macOS, Windows, and Linux

### 🔧 Advanced Features

- **Cloud Sync**: Sync with Dropbox, Google Drive, OneDrive
- **Browser Extension**: Connect for web-based learning
- **OCR Support**: Extract text from images
- **AI Integration**: Generate flashcards with LLMs
- **RSS Reader**: Learn from your favorite feeds
- **YouTube Integration**: Import videos with transcripts
- **Backup & Restore**: Full data portability

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** toolchain (1.70+)
- **System dependencies** for your platform

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### macOS

```bash
xcode-select --install
```

#### Windows

No additional dependencies required.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/melpomenex/incrementum-tauri.git
cd incrementum-tauri

# Install dependencies
npm install

# Run development server
npm run tauri:dev

# Build for production
npm run tauri:build
```

The production bundle will be in `src-tauri/target/release/bundle/`.

### Download Pre-built Binaries

Visit the [Releases](https://github.com/yourusername/incrementum-tauri/releases) page to download pre-built binaries for your platform.

---

## 🎯 Quick Start

### 1. Import Your First Document

```
Documents → Import Document → Choose source
```

**Import Options:**
- 📁 **Local Files**: Select PDF, EPUB, or text files
- 🌐 **URL**: Enter any web URL
- 📄 **Arxiv**: Paste Arxiv ID or URL
- 📸 **Screenshot**: Capture your screen
- 🃏 **Anki**: Import .apkg file
- 📦 **SuperMemo**: Import ZIP export

### 2. Process Content

Documents are automatically segmented and extracts are created. You can:

- Review extracts in the **Extracts** tab
- Edit, categorize, and tag them
- Convert them to learning items (Flashcards)

### 3. Start Reviewing

```
Review → See due cards → Rate your recall (1-4)
```

**Rating Scale:**
- **1 - Again**: Forgot completely (~10 minutes)
- **2 - Hard**: Remembered with difficulty (~1-2 days)
- **3 - Good**: Remembered easily (~5-7 days)
- **4 - Easy**: Too easy (~10-14 days)

**Preview Intervals**: See exactly when each card will appear next before you rate!

### 4. Track Progress

```
Analytics → View stats, charts, and streaks
```

---

## 📖 Documentation

### For Users

- [Feature Overview](docs/FEATURES_IMPLEMENTED.md) - Complete feature list
- [Installation Guide](docs/INSTALL.md) - Detailed setup instructions
- [OCR Features](docs/OCR_FEATURES.md) - Text extraction from images

### For Developers

- [Project Summary](docs/PROJECT_SUMMARY.md) - Architecture and technical details
- [Implementation Status](docs/IMPLEMENTATION_STATUS.md) - Current progress
- [OpenSpec Workflow](openspec/AGENTS.md) - Contribution guide

---

## 🛠️ Development

### Project Structure

```
incrementum-tauri/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   ├── stores/            # Zustand state management
│   ├── api/               # Tauri command wrappers
│   ├── themes/            # Theme definitions
│   └── utils/             # Utility functions
├── src-tauri/             # Backend (Rust)
│   ├── src/
│   │   ├── commands/      # Tauri command handlers
│   │   ├── models/        # Data models
│   │   ├── database/      # SQLite database layer
│   │   ├── algorithms/    # FSRS, SM-2 implementations
│   │   ├── processor/     # Document processors
│   │   └── integrations/  # External integrations
│   └── Cargo.toml         # Rust dependencies
└── package.json           # Node.js dependencies
```

### Available Scripts

```bash
# Development
npm run tauri:dev           # Start dev server
npm run dev                # Web-only dev server

# Building
npm run tauri:build        # Build production app
npm run build              # Build web frontend

# Testing
npm run test               # Run tests
npm run test:ui            # Test UI
npm run test:coverage      # Coverage report

# Platform-specific builds
npm run tauri:build:linux      # Linux build
npm run tauri:build:macos      # macOS build
npm run tauri:build:windows    # Windows build
```

### Tech Stack

**Frontend:**
- React 19 with TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Vite for fast builds

**Backend:**
- Rust with Tauri 2.0
- SQLite with SQLx
- FSRS-5 algorithm
- Tokio async runtime

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Check [OpenSpec proposals](openspec/changes/) for planned features
2. Create an issue or proposal for new features
3. Fork the repository
4. Create a feature branch
5. Make your changes
6. Write tests if applicable
7. Submit a pull request

### Code Style

- **Rust**: Use `cargo fmt` and follow Rust naming conventions
- **TypeScript**: Use functional components with hooks, proper typing
- **General**: Clear, self-documenting code with comments for complex logic

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Startup | <500ms |
| Queue Loading | <100ms |
| Review Submission | <50ms |
| Preview Intervals | <20ms |
| Analytics Dashboard | <200ms |
| Document Import | <2s* |

*Varies by file size

---

## 📝 License

Apache 2.0 License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **FSRS Team** - For the excellent spaced repetition algorithm
- **Tauri Team** - For the amazing desktop framework
- **Open Spaced Repetition Community** - For research and insights

---

<div align="center">

**Built with ❤️ using Tauri + React + Rust**

[Website](https://readsync.org) • [Documentation](docs/) • [Support](https://github.com/melpomeonex/incrementum-tauri/issues) • [Changelog](CHANGELOG.md)

</div>
