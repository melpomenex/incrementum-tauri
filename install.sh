#!/bin/bash
set -e

echo "Installing Incrementum on Arch Linux..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script with sudo"
    exit 1
fi

# Install dependencies if not already installed
echo "Installing dependencies..."
pacman -S --needed --noconfirm webkit2gtk gtk3 libappindicator-gtk3 librsvg xdotool

# Install binary
echo "Installing binary..."
cp src-tauri/target/x86_64-unknown-linux-gnu/release/incrementum-tauri /usr/local/bin/incrementum
chmod +x /usr/local/bin/incrementum

# Install desktop file
echo "Installing desktop entry..."
mkdir -p /usr/share/applications
cp incrementum.desktop /usr/share/applications/

# Install icons
echo "Installing icons..."
mkdir -p /usr/share/icons/hicolor/32x32/apps
mkdir -p /usr/share/icons/hicolor/128x128/apps
mkdir -p /usr/share/icons/hicolor/512x512/apps
cp src-tauri/icons/32x32.png /usr/share/icons/hicolor/32x32/apps/incrementum.png
cp src-tauri/icons/128x128.png /usr/share/icons/hicolor/128x128/apps/incrementum.png
cp src-tauri/icons/icon.png /usr/share/icons/hicolor/512x512/apps/incrementum.png

# Update icon cache
update-desktop-database /usr/share/applications
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true

echo ""
echo "Incrementum installed successfully!"
echo ""
echo "NOTE: If you're on Wayland and the app doesn't start from the launcher,"
echo "run it from terminal with: GDK_BACKEND=x11 incrementum"

