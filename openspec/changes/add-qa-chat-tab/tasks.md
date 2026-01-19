## 1. Tab system integration
- [ ] 1.1 Add "doc-qa" to TabType union in `src/stores/tabsStore.ts`
- [ ] 1.2 Register DocumentQATab component in tab content mapping
- [ ] 1.3 Wire `handleDocQA()` in Toolbar to open Q&A tab (reuse existing addTab pattern)

## 2. @-Mention autocomplete component
- [ ] 2.1 Create MentionAutocomplete component with document list
- [ ] 2.2 Implement `@` trigger detection in textarea
- [ ] 2.3 Add document search/filter by title
- [ ] 2.4 Add keyboard navigation (arrow keys, Enter, Escape)
- [ ] 2.5 Style to match existing UI (positioned above/below input)

## 3. Enhanced chat input with mentions
- [ ] 3.1 Update ChatInput to track and render mention tokens
- [ ] 3.2 Implement mention parser to extract document IDs from message
- [ ] 3.3 Store mention state and display formatted badges in input
- [ ] 3.4 Handle backspace/delete on mention tokens

## 4. LLM integration for multi-document queries
- [ ] 4.1 Extend `chatWithContext` to accept multiple document IDs
- [ ] 4.2 Implement content aggregation for multiple documents
- [ ] 4.3 Add context window management (chunking/truncation)
- [ ] 4.4 Source attribution in responses (which docs were used)

## 5. Chat interface enhancements
- [ ] 5.1 Replace simulated responses with real LLM calls
- [ ] 5.2 Display referenced documents in message bubbles
- [ ] 5.3 Add loading state with streaming indicator
- [ ] 5.4 Error handling with user-friendly messages
- [ ] 5.5 Tool call integration for flashcard generation

## 6. Tool actions integration
- [ ] 6.1 Wire up `batch_create_cards` for flashcard generation requests
- [ ] 6.2 Display tool call results in chat
- [ ] 6.3 Handle create_extract tool from chat context

## 7. Edge cases and validation
- [ ] 7.1 Empty document list state with helpful message
- [ ] 7.2 No LLM provider configured state with Settings link
- [ ] 7.3 Content truncation handling for large documents
- [ ] 7.4 Network error handling and retry UI

## 8. Testing
- [ ] 8.1 Test @-mention with single document
- [ ] 8.2 Test @-mention with multiple documents
- [ ] 8.3 Test query without @-mentions (search all)
- [ ] 8.4 Test tool calls (create flashcards)
- [ ] 8.5 Test keyboard navigation in autocomplete
- [ ] 8.6 Test error states (no API key, no docs)
- [ ] 8.7 Test tab persistence and reopening
