# Design: Q&A Chat Tab with @-Mentions

## Overview
This design enhances the existing `DocumentQATab` component to create a fully functional AI-powered chat interface for document Q&A. The design leverages existing infrastructure (LLM integration, tab system, document store) and adds @-mention functionality for document reference.

## Architecture

### Component Hierarchy
```
DocumentQATab (enhanced)
├── ChatHeader
│   ├── DocumentSelector (fallback for non-@mention users)
│   └── ClearButton
├── ChatMessages
│   ├── UserMessage
│   ├── AssistantMessage (with markdown rendering)
│   └── DocumentReferenceBadge (shows @-mentioned docs)
└── ChatInput
    ├── MentionAutocomplete (new)
    └── TextInput with @ trigger
```

### Data Flow
1. User types `@` in chat input
2. MentionAutocomplete shows searchable document list
3. User selects document(s) - inserted as `@{documentId}` syntax
4. On send, parse mentions and build LLM context from document content
5. Call LLM API with document context
6. Display response with source document indicators

## Technical Decisions

### 1. @-Mention Syntax
Use `@{documentId}` format in messages. This is:
- Parseable with simple regex
- Hidden from user (displayed as document title)
- Extensible to future entities (collections, tags)

### 2. Document Context Strategy
For MVP, use the existing `chatWithContext` function which already supports document context. The enhancement is:
- Support multiple documents in a single query
- Aggregate content from mentioned documents
- Respect token limits (chunking/truncation)

### 3. State Management
- Chat conversations: Store in component state, optionally persist to localStorage
- Mention state: Managed within ChatInput component
- No new global stores needed

### 4. LLM Integration
Reuse existing:
- `chatWithContext` from `src/api/llm/index.ts`
- Provider selection from settings
- Tool calling infrastructure (for "create flashcard" actions)

### 5. Autocomplete Implementation
A simple filtered list component:
- Triggered by `@` character
- Shows documents with title and optional snippet
- Keyboard navigable
- Closes on selection or Escape

## Trade-offs

### Chosen: Inline @-mentions vs. separate document selector
**Decision:** Inline @-mentions
**Reasoning:** More natural conversation flow, enables multi-document queries in one message. Kept as dropdown fallback for discoverability.

### Chosen: Client-side chunking vs. server-side embeddings
**Decision:** Client-side content passing (MVP)
**Reasoning:** Faster implementation, leverages existing `chatWithContext`. Vector embeddings/future RAG can be added later as enhancement.

### Chosen: New tab vs. reuse AssistantPanel
**Decision:** Enhance existing DocumentQATab as dedicated tab
**Reasoning:** AssistantPanel is for contextual assistance (while viewing). DocumentQ&A is for exploratory queries. Different use cases, different UI patterns.

## Future Enhancements (Out of Scope for MVP)
- Vector embeddings for semantic search across documents
- Streaming responses
- Conversation history persistence across sessions
- Export chat to notes
- Voice input
- Collection-level @-mentions
- Suggested questions based on document content
