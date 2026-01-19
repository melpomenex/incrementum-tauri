# Change: Add Q&A chat tab with document @-mentions

## Why
The Document Q&A button exists in the toolbar but is currently non-functional. Users need an intuitive way to ask questions about their documents using AI, with the ability to reference specific documents or collections through @-mentions. This enables document-based learning, summarization, flashcard generation, and insight extraction.

## What Changes
- Connect the existing toolbar "Document Q&A" button to open a functional chat tab
- Implement @-mention autocomplete for documents in the chat input
- Add tab type "doc-qa" to the tabs system
- Create a Q&A chat interface that leverages existing LLM integration
- Support querying single documents, multiple documents, or all documents
- Enable AI-powered actions: create flashcards, generate summaries, extract insights, compare documents
- Persist chat conversations per user session
- Show which documents are referenced in each question/response

## Impact
- Affected specs: qa-chat (new)
- Affected code:
  - `src/components/Toolbar.tsx` - wire handleDocQA to open tab
  - `src/stores/tabsStore.ts` - add "doc-qa" tab type
  - `src/components/tabs/DocumentQATab.tsx` - fully implement with @-mentions and LLM
  - `src/api/llm/index.ts` - potentially extend for multi-document context
