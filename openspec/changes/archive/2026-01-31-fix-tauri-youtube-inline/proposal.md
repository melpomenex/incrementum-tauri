# Change: Fix YouTube Videos Not Playing Inline in Tauri

## Problem
YouTube videos currently fail to play inline or are discouraged from playing inline in the Tauri desktop application. Users are presented with a "Window" button and a warning ("If inline playback fails..."), suggesting that inline playback is unstable or broken. This forces users out of the integrated experience and into a separate window, breaking the seamless flow of using the application.

## Solution
The underlying issue causing YouTube embed failures (Tauri's custom protocol `tauri://`) has been addressed by switching to `http://localhost` (via `tauri-plugin-localhost` and disabling `custom-protocol`). However, the frontend code (`YouTubeViewer.tsx`) still retains the workaround UI (warning and "Window" button) and might have brittle `origin` parameter handling that needs verification.

We will:
1.  Remove the "Window" button and the warning message from `YouTubeViewer.tsx`.
2.  Ensure the YouTube iframe `origin` parameter is correctly set to `http://localhost:9527` (or the actual dynamic origin) to satisfy YouTube's IFrame API requirements.
3.  Make the inline player the default and only experience, aligning it with the web version.

## Architecture
- **Frontend**: Update `src/components/viewer/YouTubeViewer.tsx` to remove Tauri-specific workarounds.
- **Tauri Configuration**: Verify `src-tauri/Cargo.toml` ensures `custom-protocol` is disabled (confirmed).

## Validation
- **Manual Test**: Launch the Tauri app, import a YouTube video, and verify it plays inline without errors.
- **Manual Test**: Verify seeking and progress tracking still work (requires `enablejsapi=1` and correct `origin`).
