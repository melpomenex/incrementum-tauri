import { useState, useRef, useEffect, useCallback } from "react";
import { useDocumentStore, useLLMProvidersStore, useSettingsStore } from "../../stores";
import { chatWithContext, type LLMMessage } from "../../api/llm";
import { getDocument, extractDocumentText } from "../../api/documents";
import { getExtracts } from "../../api/extracts";
import {
  MessageSquare,
  Send,
  Loader2,
  X,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { callIncrementumMCPTool, getIncrementumMCPTools, type MCPTool } from "../../api/mcp";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  mentionedDocumentIds?: string[];
  toolCalls?: ToolCall[];
  sourceDocuments?: string[]; // IDs of documents used for response
}

interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "success" | "error";
}

interface DocumentMention {
  id: string;
  title: string;
  index: number; // Position in the input text
}

// Mention token format in input: @{documentId}
const MENTION_REGEX = /@{([^}]+)}/g;

export function DocumentQATab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [rawInput, setRawInput] = useState(""); // Input with mention tokens
  const [mentions, setMentions] = useState<DocumentMention[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  const [providerError, setProviderError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionPopupRef = useRef<HTMLDivElement>(null);

  const { documents } = useDocumentStore();
  const getEnabledProviders = useLLMProvidersStore((state) => state.getEnabledProviders);
  const contextWindowTokens = useSettingsStore((state) => state.settings.ai.maxTokens);

  // Filter documents for mention autocomplete
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Parse mentions from input text
  const parseMentions = useCallback((text: string): { text: string; mentions: DocumentMention[] } => {
    const newMentions: DocumentMention[] = [];
    let lastIndex = 0;
    let cleanedText = text;

    let match: RegExpExecArray | null;
    while ((match = MENTION_REGEX.exec(text)) !== null) {
      const documentId = match[1];
      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        newMentions.push({
          id: documentId,
          title: doc.title,
          index: match.index,
        });
      }
    }

    return { text, mentions: newMentions };
  }, [documents]);

  // Format input for display (replace tokens with badges)
  const formatInputForDisplay = useCallback((text: string, mentionList: DocumentMention[]): string => {
    let formatted = text;
    mentionList.forEach((mention) => {
      const token = `@{${mention.id}}`;
      formatted = formatted.replace(token, `@${mention.title}`);
    });
    return formatted;
  }, []);

  // Handle input change with @ trigger detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawInput(value);

    const cursorPosition = e.target.selectionStart;

    // Check if we're typing after @
    const beforeCursor = value.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentionPopup(true);
      setMentionQuery(atMatch[1]);
      setMentionCursorIndex(0);
    } else {
      setShowMentionPopup(false);
      setMentionQuery("");
    }

    // Parse existing mentions
    const { mentions: newMentions } = parseMentions(value);
    setMentions(newMentions);

    // Update display value
    setInput(formatInputForDisplay(value, newMentions));
  };

  // Handle document selection from mention popup
  const handleSelectDocument = (doc: { id: string; title: string }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const value = rawInput;

    // Find the @ position
    const beforeCursor = value.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const atPosition = cursorPosition - atMatch[0].length;
      const mentionToken = `@{${doc.id}}`;
      const newValue =
        value.slice(0, atPosition) + mentionToken + " " + value.slice(cursorPosition);

      setRawInput(newValue);
      setInput(formatInputForDisplay(newValue, [...mentions, { id: doc.id, title: doc.title, index: atPosition }]));
      setShowMentionPopup(false);

      // Set cursor after the mention
      setTimeout(() => {
        const newPosition = atPosition + mentionToken.length + 1;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  // Handle keyboard navigation in mention popup
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionCursorIndex((prev) =>
          prev < filteredDocuments.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionCursorIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filteredDocuments.length > 0) {
        e.preventDefault();
        handleSelectDocument(filteredDocuments[mentionCursorIndex]);
      } else if (e.key === "Escape") {
        setShowMentionPopup(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Remove a mention
  const handleRemoveMention = (mentionId: string) => {
    const token = `@{${mentionId}}`;
    const newValue = rawInput.replace(token, "");
    setRawInput(newValue);
    const { mentions: newMentions } = parseMentions(newValue);
    setMentions(newMentions);
    setInput(formatInputForDisplay(newValue, newMentions));
  };

  const clearConversation = () => {
    setMessages([]);
    setProviderError(null);
  };

  // Get document content for context
  const getDocumentContent = async (documentId: string): Promise<string> => {
    try {
      const doc = await getDocument(documentId);
      const docTitle = doc?.title || "Unknown Document";

      // If document has content, use it
      if (doc && doc.content) {
        return `Document: ${docTitle}\n\n${doc.content}`;
      }

      // Try to extract text from the document (e.g., PDF)
      try {
        const extractionResult = await extractDocumentText(documentId);
        if (extractionResult.content) {
          console.log(`[Document Q&A] Extracted ${extractionResult.content.length} chars from document`);
          return `Document: ${docTitle}\n\n${extractionResult.content}`;
        }
      } catch (extractionError) {
        console.warn(`Failed to extract text from document ${documentId}:`, extractionError);
      }

      // Otherwise, try to get extracts (highlights/notes) from the document
      try {
        const extracts = await getExtracts(documentId);
        if (extracts && extracts.length > 0) {
          const extractContent = extracts
            .map((e, i) => {
              let text = `[Extract ${i + 1}]`;
              if (e.page_number) text += ` (Page ${e.page_number})`;
              text += `\n${e.content}`;
              if (e.notes) text += `\nNote: ${e.notes}`;
              return text;
            })
            .join("\n\n");
          return `Document: ${docTitle}\n\nExtracts and highlights from this document:\n\n${extractContent}`;
        }
      } catch (extractError) {
        console.warn(`Failed to get extracts for document ${documentId}:`, extractError);
      }

      return `Document: ${docTitle}\n\n(No content or extracts available. This document may be a PDF or file that hasn't been processed yet.)`;
    } catch (error) {
      console.error(`Failed to get document ${documentId}:`, error);
      return `Document ID: ${documentId}\n\n(Error loading content)`;
    }
  };

  // Build aggregated content from mentioned documents
  const buildMultiDocumentContext = async (documentIds: string[]): Promise<string> => {
    if (documentIds.length === 0) {
      // If no documents mentioned, search all documents
      return "User is asking about their documents. Search across all available documents to find relevant information.";
    }

    const contents = await Promise.all(
      documentIds.map((id) => getDocumentContent(id))
    );

    // Rough token estimation and truncation
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 4000;
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    let combined = contents.join("\n\n---\n\n");
    if (combined.length > maxChars) {
      combined = combined.slice(0, maxChars) + "\n\n[Content truncated due to length...]";
    }

    return combined;
  };

  // Parse tool calls from LLM response
  const parseToolCalls = (content: string) => {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /```tool_calls\s*([\s\S]*?)```/g;
    let cleanedContent = content;

    let match: RegExpExecArray | null;
    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const calls = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.tool_calls)
            ? parsed.tool_calls
            : [];

        calls.forEach((call: { name?: string; arguments?: Record<string, unknown> }) => {
          if (typeof call?.name === "string") {
            toolCalls.push({
              name: call.name,
              parameters: call.arguments || {},
              status: "pending",
            });
          }
        });
        cleanedContent = cleanedContent.replace(match[0], "").trim();
      } catch (error) {
        console.warn("Failed to parse tool call block:", error);
      }
    }

    return { cleanedContent, toolCalls };
  };

  // Execute tool calls
  const executeToolCalls = async (messageId: string, calls: ToolCall[]) => {
    for (const call of calls) {
      try {
        const result = await callIncrementumMCPTool(call.name, call.parameters);
        updateToolCall(messageId, call.name, { result, status: "success" });
      } catch (error) {
        updateToolCall(messageId, call.name, {
          result: error instanceof Error ? error.message : error,
          status: "error",
        });
      }
    }
  };

  const updateToolCall = (messageId: string, toolName: string, updates: Partial<ToolCall>) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.toolCalls) return message;
        const updatedCalls = message.toolCalls.map((call) =>
          call.name === toolName ? { ...call, ...updates } : call
        );
        return { ...message, toolCalls: updatedCalls };
      })
    );
  };

  const handleSendMessage = async () => {
    if (!rawInput.trim() || isProcessing) return;

    // Parse mentions from input
    const mentionedDocumentIds = mentions.map((m) => m.id);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input, // Display version with document titles
      timestamp: Date.now(),
      mentionedDocumentIds,
    };

    setMessages((prev) => [...prev, userMessage]);
    const savedRawInput = rawInput;
    setRawInput("");
    setInput("");
    setMentions([]);
    setProviderError(null);
    setIsProcessing(true);

    try {
      // Check for LLM provider
      const enabledProviders = getEnabledProviders();
      if (!enabledProviders || enabledProviders.length === 0) {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: "system",
          content: "No LLM provider configured. Please add an API key in Settings to use Document Q&A.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsProcessing(false);
        return;
      }

      const provider = enabledProviders[0];

      // Build system prompt with document context
      const mcpTools = (await getIncrementumMCPTools()) || [];
      const systemPrompt: LLMMessage = {
        role: "system",
        content: `You are a helpful assistant that answers questions about documents.

${mentionedDocumentIds.length > 0
  ? `IMPORTANT: The user has provided document content below. Answer their question directly using ONLY the provided document content. Do NOT use tools to fetch the document - the content is already provided in the user's message.`
  : `The user is asking a general question. Answer based on your knowledge.`}

ONLY use tools when the user explicitly asks you to CREATE or SAVE something:
- "Create flashcards" or "make cards" → use create_qa_card or create_cloze_card
- "Create an extract" or "save this" → use create_extract
- "Save this note" → use create_extract

For regular questions like "summarize", "explain", "what is", etc. - just answer directly from the provided content. Do NOT use tools for questions.

${mcpTools.length > 0 ? `Available tools (only use when asked to create/save): ${mcpTools.map((t) => t.name).join(", ")}

Tool call format (only if needed):
\`\`\`tool_calls
{"tool_calls":[{"name":"tool_name","arguments":{"key":"value"}}]}
\`\`\`` : ''}`,
      };

      // Get document context
      const documentContext = await buildMultiDocumentContext(mentionedDocumentIds);

      const userPrompt: LLMMessage = {
        role: "user",
        content: mentionedDocumentIds.length > 0
          ? `Document context:\n${documentContext}\n\nUser question: ${savedRawInput.replace(MENTION_REGEX, "")}`
          : savedRawInput,
      };

      // Call LLM
      const response = await chatWithContext(
        provider.provider,
        provider.model,
        [systemPrompt, userPrompt],
        {
          type: mentionedDocumentIds.length > 0 ? "document" : "general",
          documentId: mentionedDocumentIds[0],
          content: documentContext,
        },
        provider.apiKey,
        provider.baseUrl
      );

      const { cleanedContent, toolCalls } = parseToolCalls(response.content);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: cleanedContent || response.content,
        timestamp: Date.now(),
        sourceDocuments: mentionedDocumentIds.length > 0 ? mentionedDocumentIds : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (toolCalls.length > 0) {
        await executeToolCalls(assistantMessage.id, toolCalls);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response from AI. Please check your API key and try again."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple markdown rendering
  const renderMarkdown = (text: string): string => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted p-2 rounded mt-2 mb-2 overflow-x-auto"><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  };

  // Empty state when no documents
  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground mb-2">No Documents Yet</h2>
          <p className="text-muted-foreground mb-4">
            Import some documents first to start asking questions about them.
          </p>
          <p className="text-sm text-muted-foreground">
            Use the "Import File" button in the toolbar to add documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Document Q&A</h2>
        </div>
        <button
          onClick={clearConversation}
          className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Mention badges in input area */}
      {mentions.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-2">
          {mentions.map((mention) => (
            <span
              key={mention.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-sm rounded-full"
            >
              <FileText className="w-3 h-3" />
              {mention.title}
              <button
                onClick={() => handleRemoveMention(mention.id)}
                className="hover:bg-primary/30 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Ask Your Documents
              </h2>
              <p className="text-muted-foreground mb-4">
                Type @ to mention documents and ask questions about them.
              </p>
              <div className="text-sm text-muted-foreground text-left">
                <p className="font-semibold mb-2">Example questions:</p>
                <ul className="space-y-1">
                  <li>• "@MyDocument What are the main points?"</li>
                  <li>• "Create flashcards from mentioned documents"</li>
                  <li>• "Summarize these documents"</li>
                  <li>• "What insights can you extract?"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Message header */}
                <div className="flex items-center gap-2 mb-1">
                  {message.role === "user" ? (
                    <span className="text-xs text-muted-foreground">You</span>
                  ) : message.role === "system" ? (
                    <>
                      <Settings className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">System</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-xs text-muted-foreground">AI</span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {message.sourceDocuments.length} doc{message.sourceDocuments.length > 1 ? "s" : ""} referenced
                    </span>
                  )}
                </div>

                {/* Message content */}
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "system"
                        ? "bg-muted text-muted-foreground border border-border"
                        : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                    />
                  )}

                  {/* Tool calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolCalls.map((tool, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                            tool.status === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : tool.status === "error"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          <span className="font-medium">{tool.name}</span>
                          {tool.status === "pending" && <Loader2 className="w-3 h-3 animate-spin" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mentioned documents in user message */}
                {message.mentionedDocumentIds && message.mentionedDocumentIds.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {message.mentionedDocumentIds.map((docId) => {
                      const doc = documents.find((d) => d.id === docId);
                      return doc ? (
                        <span
                          key={docId}
                          className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {doc.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-start">
                <div className="bg-muted rounded-lg p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border relative">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={rawInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type @ to mention documents... (Shift+Enter for new line)"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none pr-12"
              rows={2}
              disabled={isProcessing}
            />
            {/* Character indicator for mentions */}
            {mentions.length > 0 && (
              <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">
                {mentions.length} document{mentions.length > 1 ? "s" : ""} mentioned
              </div>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!rawInput.trim() || isProcessing}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mention autocomplete popup */}
        {showMentionPopup && filteredDocuments.length > 0 && (
          <div
            ref={mentionPopupRef}
            className="absolute bottom-full left-4 right-4 mb-2 max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10"
          >
            <div className="max-h-48 overflow-auto">
              {filteredDocuments.map((doc, index) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc)}
                  className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 ${
                    index === mentionCursorIndex ? "bg-muted" : ""
                  }`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {doc.title}
                    </div>
                    {doc.metadata?.author && (
                      <div className="text-xs text-muted-foreground truncate">
                        {doc.metadata.author}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 bg-muted text-xs text-muted-foreground">
              Use ↑↓ to navigate, Enter to select, Escape to close
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
