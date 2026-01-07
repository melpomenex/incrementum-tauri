# Incrementum Tauri - Handoff Document

## Project Overview

Incrementum is a Tauri 2.0 application (Rust backend + React 19 frontend) for spaced repetition learning with AI-powered flashcard generation.

**Repository:** `/home/ubuntu/Code/Incrementum-CPP/incrementum-tauri`

**Current Status:** White screen on launch - frontend not loading in production build

---

## Build Instructions

### Prerequisites

```bash
# Install dependencies (Arch Linux)
sudo pacman -S webkit2gtk gtk3 libappindicator-gtk3 librsvg xdotool
sudo pacman -S base-devel cargo pnpm git
```

### Building

**IMPORTANT:** Due to Rust compiler stack overflow, you MUST set `RUST_MIN_STACK=536870912` (512MB):

```bash
# Set environment variable
export RUST_MIN_STACK=536870912

# Install frontend dependencies
pnpm install

# Build frontend
pnpm build

# Build Tauri application
RUST_MIN_STACK=536870912 pnpm tauri build --target x86_64-unknown-linux-gnu
```

**Build output:** `src-tauri/target/x86_64-unknown-linux-gnu/release/incrementum-tauri`

### Installation

```bash
# Manual install
sudo cp src-tauri/target/x86_64-unknown-linux-gnu/release/incrementum-tauri /usr/local/bin/incrementum
sudo chmod +x /usr/local/bin/incrementum

# Install desktop entry and icons
sudo mkdir -p /usr/share/applications
sudo cp incrementum.desktop /usr/share/applications/
sudo mkdir -p /usr/share/icons/hicolor/32x32/apps
sudo mkdir -p /usr/share/icons/hicolor/128x128/apps
sudo mkdir -p /usr/share/icons/hicolor/512x512/apps
sudo cp src-tauri/icons/32x32.png /usr/share/icons/hicolor/32x32/apps/incrementum.png
sudo cp src-tauri/icons/128x128.png /usr/share/icons/hicolor/128x128/apps/incrementum.png
sudo cp src-tauri/icons/icon.png /usr/share/icons/hicolor/512x512/apps/incrementum.png
```

### Running

```bash
# Wayland compatibility
GDK_BACKEND=x11 incrementum
```

---

## Current Issue: White Screen on Launch

### Symptoms

1. **Production build**: Application launches but displays only a white screen
2. **Console is empty**: Opening dev tools (F12 or right-click → Inspect) shows empty console
3. **JavaScript not executing**: No console.log output, no errors
4. **Firefox test**: Opening `dist/index.html` in Firefox also shows white screen

### Technical Details

**Environment:**
- OS: Arch Linux (Wayland)
- Desktop: (check with `echo $XDG_SESSION_TYPE`)
- Rust: stable (check with `rustc --version`)
- Node: 20.19.6 (via mise)
- pnpm: latest

**Key Files:**

1. **`src-tauri/tauri.conf.json`** - Tauri configuration
   ```json
   {
     "build": {
       "frontendDist": "../dist"
     },
     "app": {
       "windows": [{
         "devtools": true,
         ...
       }],
       "security": {
         "csp": null
       }
     }
   }
   ```

2. **`src/main.tsx`** - React entry point
   - Uses React Router v6
   - Uses TanStack Query for data fetching
   - Has ErrorBoundary for catching errors
   - Console logging added for debugging

3. **`dist/index.html`** - Built HTML
   - References `/assets/index-*.js` (module script)
   - No CSP issues (disabled)

### What We've Tried

1. ✅ **Disabled CSP** - Set to `null` in tauri.conf.json
2. ✅ **Removed React.StrictMode** - Can cause double-rendering issues
3. ✅ **Added ErrorBoundary** - To catch and display React errors
4. ✅ **Added console.log** - In main.tsx to verify JS execution
5. ✅ **Inline styles in PageLoader** - Removed CSS module dependencies
6. ✅ **Checked frontend build** - `pnpm build` completes successfully
7. ✅ **Verified asset paths** - Files exist in `dist/assets/`
8. ✅ **Checked binary** - Assets are bundled (verified with `strings`)
9. ✅ **Tested in Firefox** - Also shows white screen (same issue)
10. ✅ **Wayland workaround** - Using `GDK_BACKEND=x11`

### What Works

- ✅ **Debug build compiles** - `RUST_MIN_STACK=536870912 pnpm tauri build --debug`
- ✅ **Database initializes** - SQLite connection works
- ✅ **All Rust commands registered** - AI commands, documents, etc.
- ✅ **Binary is created** - All artifacts generated

### What Doesn't Work

- ❌ **Production build** - White screen, no JavaScript execution
- ❌ **Firefox** - Opening dist/index.html directly also shows white screen
- ❌ **Dev tools** - F12 doesn't work, right-click → Inspect doesn't work
- ❌ **Console output** - Completely empty

---

## Investigation Steps for Next Agent

### 1. Verify Frontend Build

```bash
# Check if files exist
ls -la dist/
ls -la dist/assets/index-*.js

# Check HTML content
cat dist/index.html

# Verify JS file is valid
head -20 dist/assets/index-*.js
```

### 2. Test with Simple HTML

Create a minimal test file to verify webview works:

```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test</h1>
  <script>console.log('Works!');</script>
</body>
</html>
```

### 3. Check for Module Loading Issues

The issue might be with ES modules (`type="module"`). Try:
1. Removing `type="module"` from script tags
2. Using a bundled UMD build instead
3. Check if there's a MIME type issue

### 4. Investigate Vite Build

```bash
# Check vite config
cat vite.config.ts

# Try building with different options
pnpm build --debug
pnpm build --mode development

# Check output
ls -la dist/
```

### 5. Check WebKitGTK Version

```bash
# Check version
pacman -Q webkit2gtk

# Check if it works with other Tauri apps
# Try creating a minimal Tauri test app
```

### 6. Enable More Logging

In `src-tauri/src/lib.rs`, add logging to window creation:

```rust
use tracing::{info, error, debug};

// In the setup function
info!("Window created, loading frontend from: {:?}", app.path().app_data_dir());
```

### 7. Try Different Build Approaches

```bash
# Try debug build
RUST_MIN_STACK=536870912 pnpm tauri build --debug

# Try without optimization
CARGO_PROFILE_RELEASE_OPT_LEVEL=0 pnpm tauri build
```

### 8. Check for React Router Issues

The app uses React Router v6 with lazy loading. Try:
1. Removing lazy loading
2. Using hash router instead of browser router
3. Simplifying routes

### 9. Test with Alternative Frontend

Temporarily replace React with vanilla JS to isolate the issue.

---

## Relevant Code Snippets

### Entry Point (src/main.tsx)

```typescript
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy loaded routes
const Index = lazy(() => import("./routes/index").then(m => ({ default: m.Index })));
// ... other routes

console.log('Starting Incrementum app...');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ... */}
            </Routes>
          </Suspense>
        </MainLayout>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);
```

### Built HTML (dist/index.html)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Tauri + React + Typescript</title>
    <script type="module" crossorigin src="/assets/index-CjX-GCSC.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-vendor-Dr1ckmEv.js">
    <!-- ... -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

---

## Potential Root Causes

1. **ES Module Loading**: WebKitGTK might not handle ES modules correctly from `file://` protocol
2. **MIME Type Issues**: Module scripts might not have correct MIME type
3. **React 19 + Vite Compatibility**: New React version might have issues
4. **BrowserRouter Hash Mode**: Might need to use HashRouter instead
5. **WebKitGTK Bug**: Specific version incompatibility
6. **Tauri Custom Protocol**: The `tauri://` protocol might not be serving files correctly

---

## Quick Wins to Try

1. **Switch to HashRouter**: Replace `BrowserRouter` with `HashRouter`
2. **Bundle as single file**: Configure Vite to output a single JS bundle
3. **Use UMD build**: Change Vite config to output UMD instead of ES modules
4. **Downgrade React**: Try React 18 instead of 19
5. **Test on Xorg**: Try running on pure X11 instead of Wayland
6. **Check SELinux**: Security policies might be blocking file:// access

---

## Files Modified During Debugging

- `src-tauri/tauri.conf.json` - CSP disabled, devtools enabled
- `src/main.tsx` - ErrorBoundary added, console.log added, inline styles
- `src-tauri/src/database/connection.rs` - Fixed SQLite connection string
- `src-tauri/src/lib.rs` - Removed opener plugin
- `incrementum.desktop` - Added `GDK_BACKEND=x11`
- `install.sh` - Updated with Wayland note

---

## Contact/Follow-up

**Branch:** `srht-release`

**Last working state:** Unknown (this is a rewrite from C++ version)

**Git status:**
```
?? incrementum-tauri/
?? openspec/changes/rewrite-tauri-typescript/
```

**Next steps:**
1. Determine if this is a WebKitGTK, Tauri, or frontend build issue
2. Get a minimal "Hello World" Tauri app working on this system
3. Incrementally add complexity until the issue is found

## Resolution (2025-01-07)

### Fixes Applied
1.  **Switched to HashRouter**: Modified `src/main.tsx` to use `HashRouter` instead of `BrowserRouter`. This resolves routing issues in production builds where the application is served via local files/custom protocols.
2.  **Build Stack Size**: Confirmed that `RUST_MIN_STACK=1073741824` (1GB) is required for compilation.
3.  **Linux WebKitGTK Workarounds**: Added critical environment variables to `src-tauri/src/main.rs` to fix hardware acceleration/rendering issues (White Screen / GBM buffer errors):
    ```rust
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
    ```

### Verification
-   **Frontend Build**: Successful (`pnpm build`).
-   **Tauri Build**: Successful (`pnpm tauri build`).
-   **Runtime**: Application launches successfully, displaying the React UI ("barebones app with links").

### Instructions for Future Builds
Use the following command to build:
```bash
export RUST_MIN_STACK=1073741824
pnpm install
pnpm build
pnpm tauri build --target x86_64-unknown-linux-gnu
```

