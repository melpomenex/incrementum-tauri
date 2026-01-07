# Installing Incrementum on Arch Linux

## Quick Install (Recommended)

The easiest way to install Incrementum is using the provided install script:

```bash
sudo ./install.sh
```

This will:
- Install all required dependencies
- Install the Incrementum binary to `/usr/local/bin/incrementum`
- Install the desktop entry and icons
- Update the desktop and icon caches

## Manual Installation

If you prefer to install manually:

### 1. Install Dependencies

```bash
sudo pacman -S webkit2gtk gtk3 libappindicator-gtk3 librsvg xdotool
```

### 2. Install Binary

```bash
sudo cp src-tauri/target/x86_64-unknown-linux-gnu/release/incrementum-tauri /usr/local/bin/incrementum
sudo chmod +x /usr/local/bin/incrementum
```

### 3. Install Desktop Entry

```bash
sudo mkdir -p /usr/share/applications
sudo cp incrementum.desktop /usr/share/applications/
```

### 4. Install Icons

```bash
sudo mkdir -p /usr/share/icons/hicolor/32x32/apps
sudo mkdir -p /usr/share/icons/hicolor/128x128/apps
sudo mkdir -p /usr/share/icons/hicolor/512x512/apps
sudo cp src-tauri/icons/32x32.png /usr/share/icons/hicolor/32x32/apps/incrementum.png
sudo cp src-tauri/icons/128x128.png /usr/share/icons/hicolor/128x128/apps/incrementum.png
sudo cp src-tauri/icons/icon.png /usr/share/icons/hicolor/512x512/apps/incrementum.png
```

### 5. Update Caches

```bash
sudo update-desktop-database /usr/share/applications
sudo gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor
```

## Running Incrementum

After installation, you can run Incrementum from:

- **Application Menu**: Look for "Incrementum" in your desktop environment's application launcher
- **Command Line**: `incrementum`

## Uninstalling

```bash
sudo rm /usr/local/bin/incrementum
sudo rm /usr/share/applications/incrementum.desktop
sudo rm /usr/share/icons/hicolor/*/apps/incrementum.png
sudo update-desktop-database /usr/share/applications
sudo gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor
```

## Building from Source

If you want to build from source:

### Prerequisites

```bash
sudo pacman -S base-devel cargo pnpm git
```

### Build

**Important:** Due to Rust compiler stack overflow, you MUST set `RUST_MIN_STACK=536870912`:

```bash
RUST_MIN_STACK=536870912 pnpm install
RUST_MIN_STACK=536870912 pnpm tauri build --target x86_64-unknown-linux-gnu
```

Then run `./install.sh` to install the built binary.

## Troubleshooting

### "incrementum: command not found"

Make sure `/usr/local/bin` is in your PATH:
```bash
echo $PATH | grep -o "/usr/local/bin"
```

If not, add it to your `~/.bashrc` or `~/.zshrc`:
```bash
export PATH="/usr/local/bin:$PATH"
```

### Missing Dependencies

If you get errors about missing shared libraries, install the dependencies:
```bash
sudo pacman -S webkit2gtk gtk3 libappindicator-gtk3 librsvg xdotool
```

### Build Fails with SIGSEGV

Make sure you set `RUST_MIN_STACK=536870912` when building:
```bash
RUST_MIN_STACK=536870912 pnpm tauri build
```

### AI Features Not Working

AI commands require API keys:
- **OpenAI**: Get key from https://platform.openai.com/api-keys
- **Anthropic**: Get key from https://console.anthropic.com/
- **Ollama**: Install and run locally from https://ollama.ai/

Configure the API keys within the Incrementum application settings.
