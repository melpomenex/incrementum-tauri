# Change: Add assistant tool calling and expanded tool inventory

## Why
The assistant can list a few tools but cannot actually save generated flashcards/extracts to the database. Users need the assistant to persist outputs (e.g., cloze cards) and to access a broader set of built-in tools.

## What Changes
- Add a lightweight tool-call protocol so assistant responses can trigger tool execution.
- Expand the assistant tool inventory by 10 additional built-in tools.
- Auto-attach created extracts/flashcards to the active document when the assistant runs inside a document context.

## Impact
- Affected specs: assistant-tools (new)
- Affected code: assistant panel (`src/components/assistant/AssistantPanel.tsx`), MCP tool inventory and execution (`src/api/mcp.ts`, `src-tauri/src/commands/mcp.rs`, `src-tauri/src/mcp/tools.rs`)
