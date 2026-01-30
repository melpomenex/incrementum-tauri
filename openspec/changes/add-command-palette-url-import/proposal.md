# Change: Add command palette URL import

## Why
Users frequently want to quickly import content (YouTube videos, articles, web pages) while browsing the app. The current workflow requires navigating to specific import screens. Supporting direct paste-to-import in the command palette (Ctrl+K → Ctrl+V) streamlines this flow significantly.

## What Changes
- Add URL detection and import capability to the command palette input
- When a URL is pasted or typed, detect content type (YouTube video, RSS feed, web article)
- Show preview and import options inline in the palette
- Import and notify user with toast/notification (palette stays open for batch imports)
- Auto-detect URL type based on pattern matching

## Impact
- Affected specs: `specs/command-palette-import/spec.md` (new capability)
- Affected code: CommandCenter.tsx, GlobalSearch.tsx, youtube.ts, rss.ts, new URL import handler
- Builds on existing: `search-discovery` spec (command palette search), `web-import` spec (import capabilities)
