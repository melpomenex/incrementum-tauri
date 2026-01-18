# Change: Update PWA mobile navigation and offline experience

## Why
The PWA bottom menu is present but non-functional, which breaks mobile UX and makes the PWA feel unfinished.

## What Changes
- Make the mobile bottom navigation functional and aligned with the app’s tab system.
- Add Queue and Settings to the bottom navigation.
- Hide the bottom navigation during full-screen reading modes.
- Ensure PWA install prompt shows only in browser (not Tauri) and only when not installed.
- Improve offline UX for app shell, cached documents, review queue, RSS cache, and analytics.

## Impact
- Affected specs: new `pwa-navigation`, `pwa-offline`, `pwa-install`
- Affected code: mobile navigation components, layout wrapper, tab store integration, service worker caching, offline indicators
