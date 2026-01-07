# Maintainer: Incrementum Developers
pkgname=incrementum
pkgver=1.0.0
pkgrel=1
pkgdesc="Incrementum - Spaced repetition and incremental reading for effective learning"
arch=('x86_64')
url="https://incrementum.app"
license=('custom')
depends=('webkit2gtk' 'gtk3' 'libappindicator-gtk3' 'librsvg' 'xdotool')
makedepends=('cargo' 'pnpm' 'git')
options=('!lto')  # Disable LTO to avoid compilation issues

# NOTE: Due to Rust compiler stack overflow, you MUST set RUST_MIN_STACK=536870912
# Example: RUST_MIN_STACK=536870912 makepkg -si

prepare() {
  cd "$srcdir"
  # Install frontend dependencies
  pnpm install
}

build() {
  cd "$srcdir"
  # Build the Tauri application
  # NOTE: RUST_MIN_STACK must be set to 536870912 (512MB) to avoid stack overflow
  pnpm tauri build --target x86_64-unknown-linux-gnu
}

package() {
  cd "$srcdir"

  # Install the binary
  install -Dm755 "src-tauri/target/x86_64-unknown-linux-gnu/release/incrementum-tauri" "$pkgdir/usr/bin/incrementum"

  # Install desktop file
  install -Dm644 "incrementum.desktop" "$pkgdir/usr/share/applications/incrementum.desktop"

  # Install icons
  install -Dm644 "src-tauri/icons/128x128.png" "$pkgdir/usr/share/icons/hicolor/128x128/apps/incrementum.png"
  install -Dm644 "src-tauri/icons/32x32.png" "$pkgdir/usr/share/icons/hicolor/32x32/apps/incrementum.png"
  install -Dm644 "src-tauri/icons/icon.png" "$pkgdir/usr/share/icons/hicolor/512x512/apps/incrementum.png"
}
