## 1. Implementation
- [ ] 1.1 Expand the assistant tool inventory to include 10 additional built-in tools sourced from the MCP registry.
- [ ] 1.2 Add a tool-call parsing and execution pipeline in the assistant panel, including error handling and UI status updates.
- [ ] 1.3 Auto-fill `document_id` for create-card/extract tools when a document context is available.
- [ ] 1.4 Update assistant help/tooling copy to reflect the expanded tool list and tool-call format.

## 2. Validation
- [ ] 2.1 Manual: Ask the assistant to generate and save 5 cloze cards while viewing a document; verify cards are stored and linked to that document.
- [ ] 2.2 Manual: Ask for a non-document save (general context); confirm the assistant prompts for document association or fails gracefully.
