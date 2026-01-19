# qa-chat Specification

## Purpose
Enables users to have AI-powered conversations about their documents through a chat interface, with the ability to reference specific documents via @-mentions, generate flashcards, create summaries, and extract insights.

## ADDED Requirements

### Requirement: Q&A Chat Tab Access
The system SHALL provide a Q&A chat tab accessible from the toolbar.

#### Scenario: User opens Q&A chat from toolbar
- **Given** the user is viewing the application
- **When** the user clicks the "Document Q&A" button in the toolbar (BotMessageSquare icon)
- **Then** the system should open a new Q&A chat tab
- **And** the tab should display an empty chat interface with example prompts
- **And** if a Q&A tab already exists, the system should switch to the existing tab

#### Scenario: User opens Q&A chat in background
- **Given** the user is viewing the application
- **When** the user middle-clicks the "Document Q&A" button
- **Then** the system should open a new Q&A chat tab in the background
- **And** the currently active tab should remain focused

### Requirement: Document @-Mentions
The system SHALL support @-mentioning documents in chat messages to provide context.

#### Scenario: User @-mentions a single document
- **Given** the user is in the Q&A chat tab
- **When** the user types `@` followed by a document title or selects from autocomplete
- **Then** the system should insert a document reference token
- **And** the system should display the document title (not the ID) in the input
- **And** the LLM query should include content from the referenced document

#### Scenario: User @-mentions multiple documents
- **Given** the user is in the Q&A chat tab
- **When** the user types `@` and selects multiple documents
- **Then** the system should include all referenced documents in the LLM context
- **And** the response should indicate which document(s) the answer is based on

#### Scenario: Autocomplete document search
- **Given** the user types `@` in the chat input
- **When** the document list is displayed
- **Then** the system should show documents matching the typed characters
- **And** the user should be able to navigate with arrow keys
- **And** the user should be able to select with Enter

### Requirement: Q&A Message Handling
The system SHALL process user questions and return AI responses based on document context.

#### Scenario: User asks a question without @-mentions
- **Given** the user is in the Q&A chat tab
- **When** the user sends a question without any document references
- **Then** the system should search across all available documents
- **And** the system should return an answer based on relevant documents
- **And** the response should indicate which document(s) were used

#### Scenario: User asks a question with @-mentioned documents
- **Given** the user has @-mentioned one or more documents
- **When** the user sends a question
- **Then** the system should query the LLM with content from only the mentioned documents
- **And** the system should display the AI response with markdown formatting

#### Scenario: LLM returns an error
- **Given** the user sends a question
- **When** the LLM API returns an error
- **Then** the system should display a user-friendly error message
- **And** the system should allow the user to retry

### Requirement: AI-Powered Actions
The system SHALL support AI-initiated actions for creating content from documents.

#### Scenario: User requests flashcard generation
- **Given** the user is chatting about a document
- **When** the user asks "Create flashcards from this document" or similar
- **Then** the system should use the `batch_create_cards` tool
- **And** the system should create Q&A or cloze cards based on document content
- **And** the system should display a success message with card count

#### Scenario: User requests document summary
- **Given** the user has @-mentioned a document
- **When** the user asks "Summarize this document"
- **Then** the system should generate a structured summary
- **And** the summary should include main topics, key points, and conclusions

#### Scenario: User requests insights
- **Given** the user has @-mentioned one or more documents
- **When** the user asks "What are the key insights from these documents?"
- **Then** the system should extract and present insights in a structured format
- **And** insights should be grouped by theme or topic

#### Scenario: User requests document comparison
- **Given** the user has @-mentioned two or more documents
- **When** the user asks "How do these documents compare?"
- **Then** the system should provide a comparison covering themes, arguments, and conclusions

### Requirement: Chat Conversation Management
The system SHALL manage chat state and allow users to control conversations.

#### Scenario: User clears conversation
- **Given** the user has messages in the chat
- **When** the user clicks "Clear Chat"
- **Then** all messages should be removed
- **And** the chat should return to the empty state

#### Scenario: User sends multiple messages
- **Given** the user has an active conversation
- **When** the user sends follow-up questions
- **Then** the system should maintain conversation context
- **And** responses should reference previous messages when relevant

### Requirement: Error Handling and Edge Cases
The system SHALL handle error states gracefully.

#### Scenario: No documents available
- **Given** the user opens the Q&A chat tab
- **When** no documents have been imported
- **Then** the system should display a helpful message explaining documents are needed
- **And** the system should suggest importing documents first

#### Scenario: LLM provider not configured
- **Given** the user sends a question
- **When** no LLM provider is configured
- **Then** the system should display a message directing to Settings
- **And** the message should include instructions for adding an API key

#### Scenario: Document content is too large
- **Given** the user @-mentions a document
- **When** the document content exceeds the context window
- **Then** the system should chunk or truncate the content
- **And** the system should indicate that content was truncated in the response
