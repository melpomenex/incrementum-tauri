## Context
The assistant currently exposes a static tool list in the UI, but the LLM responses are text-only and never invoke tools. There is already an MCP tool registry in the Tauri backend with more capabilities than are exposed in the assistant. The user expects explicit requests like “save these cloze cards” to persist cards to the database, and to auto-attach to the active document when inside a document view.

## Goals / Non-Goals
- Goals:
  - Provide a minimal, explicit tool-call format that the assistant can emit and the UI can execute.
  - Surface 10 additional built-in tools to the assistant and include them in the tool list.
  - Default document association for created extracts/cards when a document context exists.
- Non-Goals:
  - Full multi-provider function-calling APIs.
  - Automatic tool calls without user intent (must be triggered by an explicit user ask).

## Decisions
- Decision: Use a simple fenced JSON block protocol for tool calls rather than provider-specific function calling.
  - Why: Keeps implementation local to the app, requires no external API changes, and is deterministic to parse.
- Decision: Populate the assistant’s tool list from the backend MCP registry so the list matches what can be executed.
  - Why: Reduces drift between available tools and UI copy.

## Risks / Trade-offs
- Parsing errors if the assistant emits malformed tool JSON.
  - Mitigation: Validate JSON, surface clear error messages, and skip invalid tool calls without breaking the message.
- Over-execution if the assistant emits tool calls when not requested.
  - Mitigation: Only execute tool calls when the user message explicitly asked to save/create and the tool calls are present.

## Migration Plan
- No data migration required.
- Rollback is removing tool-call execution and reverting tool list back to static.

## Open Questions
- None.
