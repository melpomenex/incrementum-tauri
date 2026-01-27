# Installation Guide

Detailed setup instructions for Incrementum on all platforms.

---

## Table of Contents

1. [Pre-built Binaries](#pre-built-binaries)
2. [Build from Source](#build-from-source)
3. [Platform-Specific Instructions](#platform-specific-instructions)
4. [Troubleshooting](#troubleshooting)
5. [Development Setup](#development-setup)

---

## Pre-built Binaries

The easiest way to install Incrementum is to download a pre-built binary.

### Download

1. Visit the [Releases](https://github.com/melpomenex/incrementum-tauri/releases) page
2. Download the appropriate version for your platform:
   - **Windows**: `Incrementum_x64-setup.exe` or `Incrementum_x64.msi`
   - **macOS**: `Incrementum_x64.dmg` (Intel) or `Incrementum_aarch64.dmg` (Apple Silicon)
   - **Linux**: `incrementum_x64.AppImage`, `.deb`, or `.rpm`

### Installation

#### Windows

1. Run the downloaded `.exe` or `.msi` installer
2. Follow the setup wizard
3. Launch Incrementum from the Start menu or desktop shortcut

**Windows Defender**: If Windows SmartScreen appears, click "More info" → "Run anyway"

#### macOS

1. Open the downloaded `.dmg` file
2. Drag Incrementum to the Applications folder
3. Launch from Applications

**Security Warning**: If you see "Cannot be opened because the developer cannot be verified":
- Right-click the app → "Open"
- Click "Open" in the dialog
- Or: System Preferences → Security & Privacy → "Open Anyway"

#### Linux

**AppImage (Recommended)**
```bash
# Make executable
chmod +x incrementum_x64.AppImage

# Run
./incrementum_x64.AppImage

# Optional: Move to applications directory
sudo mv incrementum_x64.AppImage /usr/local/bin/incrementum
```

**Debian/Ubuntu (.deb)**
```bash
sudo dpkg -i incrementum_x64.deb
sudo apt-get install -f  # Fix dependencies if needed
```

**Fedora/RHEL (.rpm)**
```bash
sudo rpm -i incrementum_x64.rpm
```

**Arch Linux**
```bash
# Using the PKGBUILD in the repository
cd incrementum-tauri
makepkg -si
```

---

## Build from Source

Building from source requires Rust and Node.js toolchains.

### Prerequisites

#### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend build system |
| npm | 9+ | Package management |
| Rust | 1.70+ | Backend runtime |
| Git | Any | Source control |

#### Verify Installations

```bash
node --version    # Should be v18.x.x or higher
npm --version     # Should be 9.x.x or higher
cargo --version   # Should be 1.70.x or higher
```

### Platform-Specific Dependencies

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    pkg-config
```

#### Linux (Fedora)

```bash
sudo dnf install -y \
    webkit2gtk4.1-devel \
    openssl-devel \
    curl \
    wget \
    file \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    pkgconfig
```

#### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Or via Homebrew
brew install curl openssl
```

#### Windows

No additional dependencies required. Windows SDK is installed with Visual Studio Build Tools or the full Visual Studio.

If you don't have them:
1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. Install "Desktop development with C++" workload

### Build Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/melpomenex/incrementum-tauri.git
   cd incrementum-tauri
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri:dev
   ```

4. **Build for production**
   ```bash
   # Build for current platform
   npm run tauri:build
   
   # Platform-specific builds
   npm run tauri:build:linux
   npm run tauri:build:macos
   npm run tauri:build:windows
   ```

The production bundles will be in `src-tauri/target/release/bundle/`.

---

## Platform-Specific Instructions

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Optional: Development settings
VITE_DEV_SERVER_PORT=3000

# Optional: API keys for AI features
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

### Rust Toolchain

Incrementum uses a specific Rust toolchain version:

```bash
# The project uses rust-toolchain.toml
cat rust-toolchain.toml

# To manually set toolchain
rustup override set stable
```

### Database Location

Incrementum uses SQLite for data storage:

| Platform | Database Location |
|----------|-------------------|
| Windows | `%APPDATA%\incrementum\incrementum.db` |
| macOS | `~/Library/Application Support/incrementum/incrementum.db` |
| Linux | `~/.local/share/incrementum/incrementum.db` |

---

## Troubleshooting

### Common Issues

#### Build Failures

**Error: `linker cc not found` (Linux)**
```bash
sudo apt install build-essential
```

**Error: `Could not findwebkit2gtk` (Linux)**
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

**Error: `error running rc.exe` (Windows)**
- Install Visual Studio Build Tools with Windows SDK
- Or install the full Visual Studio with C++ workload

#### Runtime Issues

**Blank screen on startup**
1. Check the console for errors (Ctrl+Shift+I)
2. Try clearing app data:
   - Windows: Delete `%APPDATA%\incrementum`
   - macOS: Delete `~/Library/Application Support/incrementum`
   - Linux: Delete `~/.local/share/incrementum`

**Import not working**
- Check file permissions
- Ensure the file isn't open in another program
- Try restarting the application

**Slow performance**
- Disable unnecessary browser extensions
- Check available disk space
- Consider enabling "Dense Mode" in settings

#### Linux-Specific

**AppImage won't run**
```bash
chmod +x incrementum_x64.AppImage
./incrementum_x64.AppImage --no-sandbox
```

**Missing libssl**
```bash
# Ubuntu/Debian
sudo apt install libssl3

# Fedora
sudo dnf install openssl-libs
```

#### macOS-Specific

**"Damaged" app warning**
```bash
xattr -cr /Applications/Incrementum.app
```

---

## Development Setup

### IDE Recommendations

| IDE | Extensions/Plugins |
|-----|-------------------|
| VS Code | Rust Analyzer, ESLint, Prettier, Tailwind CSS |
| IntelliJ | Rust Plugin, Node.js Plugin |
| Vim/Neovim | rust-analyzer, coc-eslint |

### Development Scripts

```bash
# Start development server with hot reload
npm run tauri:dev

# Start web-only development (faster, no Rust compilation)
npm run dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate test coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

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

### Debugging

#### Frontend Debugging

1. Open DevTools: `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
2. Use React DevTools extension for component inspection
3. Check the Console for errors and logs

#### Backend Debugging

```bash
# Run with debug logging
RUST_LOG=debug npm run tauri:dev

# Log to file
RUST_LOG=debug npm run tauri:dev 2> debug.log
```

#### Database Inspection

```bash
# Using sqlite3 CLI
sqlite3 ~/.local/share/incrementum/incrementum.db

# Or use a GUI tool like DB Browser for SQLite
```

---

## Updating

### Pre-built Binaries

1. Download the latest release
2. Install over the existing version
3. Your data will be preserved

### Source Build

```bash
cd incrementum-tauri
git pull origin main
npm install
npm run tauri:build
```

---

## Uninstallation

### Windows

1. Settings → Apps → Incrementum → Uninstall
2. Or: Control Panel → Programs → Uninstall

### macOS

```bash
rm -rf /Applications/Incrementum.app
rm -rf ~/Library/Application\ Support/incrementum
```

### Linux

```bash
# AppImage - just delete the file
rm /path/to/incrementum.AppImage

# .deb package
sudo apt remove incrementum

# Remove data
rm -rf ~/.local/share/incrementum
```

---

## Getting Help

- **Documentation**: [docs/](/docs/)
- **Issues**: [GitHub Issues](https://github.com/melpomenex/incrementum-tauri/issues)
- **Discussions**: [GitHub Discussions](https://github.com/melpomenex/incrementum-tauri/discussions)

---

*Last updated: January 2026*
