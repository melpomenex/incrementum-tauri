import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Sparkles,
  Code,
  FileText,
  Settings,
  X,
  Loader2,
} from "lucide-react";
import { chatWithContext } from "../../api/llm";
import { useLLMProvidersStore } from "../../stores/llmProvidersStore";

export interface AssistantContext {
  type: "document" | "web" | "general";
  content?: string;
  url?: string;
  documentId?: string;
  selection?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "success" | "error";
}

interface AssistantPanelProps {
  context?: AssistantContext;
  onToolCall?: (tool: string, params: Record<string, unknown>) => Promise<unknown>;
  className?: string;
}

export function AssistantPanel({
  context,
  onToolCall,
  className = "",
}: AssistantPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "ollama" | "openrouter">("openai");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const providers = [
    { id: "openai", name: "OpenAI", icon: Sparkles, color: "text-green-500" },
    { id: "anthropic", name: "Anthropic", icon: MessageSquare, color: "text-orange-500" },
    { id: "ollama", name: "Ollama", icon: Code, color: "text-blue-500" },
    { id: "openrouter", name: "OpenRouter", icon: Settings, color: "text-purple-500" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add context message when context changes
  useEffect(() => {
    if (context) {
      const contextMessage: Message = {
        id: `context-${Date.now()}`,
        role: "system",
        content: getContextMessage(context),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, contextMessage]);
    }
  }, [context]);

  const getContextMessage = (ctx: AssistantContext): string => {
    switch (ctx.type) {
      case "document":
        return `📄 Viewing document${ctx.documentId ? ` (ID: ${ctx.documentId})` : ""}${ctx.selection ? `. Selected text: "${ctx.selection.slice(0, 100)}..."` : ""}`;
      case "web":
        return `🌐 Browsing: ${ctx.url || "Unknown page"}${ctx.selection ? `. Selected text: "${ctx.selection.slice(0, 100)}..."` : ""}`;
      default:
        return "General context - Ready to help";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context for the LLM
      const contextData = {
        currentContext: context,
        conversationHistory: messages.slice(-10), // Last 10 messages
        availableTools: getAvailableTools(),
      };

      // Call the LLM API (this will be implemented)
      const response = await callLLM(userMessage.content, contextData);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: Date.now(),
        toolCalls: response.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const callLLM = async (
    prompt: string,
    contextData: Record<string, unknown>
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> => {
    try {
      // Get the enabled provider for the selected provider type
      const providers = useLLMProvidersStore.getState().getEnabledProviders();
      const provider = providers.find((p) => p.provider === selectedProvider);

      if (!provider) {
        return {
          content: `No ${selectedProvider} provider configured. Please add an API key in Settings.`,
        };
      }

      // Convert messages to LLM format
      const llmMessages = [
        {
          role: "user" as const,
          content: prompt,
        },
        ...(contextData.conversationHistory as Message[]).map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
      ];

      // Build LLM context
      const llmContext = contextData.currentContext as AssistantContext;

      // Call the LLM API
      const response = await chatWithContext(
        selectedProvider,
        llmMessages,
        {
          type: llmContext.type,
          documentId: llmContext.documentId,
          url: llmContext.url,
          selection: llmContext.selection,
          content: llmContext.content,
        },
        provider.apiKey,
        provider.baseUrl
      );

      return { content: response.content };
    } catch (error) {
      console.error("LLM API error:", error);
      return {
        content: `Error calling LLM: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  };

  const getAvailableTools = () => {
    return [
      {
        name: "create_document",
        description: "Create a new document",
        parameters: { title: "string", content: "string" },
      },
      {
        name: "get_document",
        description: "Get document details",
        parameters: { documentId: "string" },
      },
      {
        name: "search_documents",
        description: "Search documents by content",
        parameters: { query: "string" },
      },
      {
        name: "create_extract",
        description: "Create an extract from selection",
        parameters: { content: "string", note: "string" },
      },
      {
        name: "create_qa_card",
        description: "Create a Q&A flashcard",
        parameters: { question: "string", answer: "string" },
      },
      {
        name: "get_review_queue",
        description: "Get items due for review",
        parameters: {},
      },
    ];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 300 && newWidth <= 800) {
          setWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  if (isCollapsed) {
    return (
      <div className={`flex flex-col bg-card border-l border-border ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-muted transition-colors border-r border-border"
          title="Open Assistant"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
      </div>
    );
  }

  const currentProvider = providers.find((p) => p.id === selectedProvider);

  return (
    <div
      className={`flex flex-col bg-card border-l border-border ${className}`}
      style={{ width: isCollapsed ? "auto" : width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Provider Selector */}
          <div className="flex items-center gap-1 mr-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id as any)}
                className={`p-1.5 rounded transition-colors ${
                  selectedProvider === provider.id
                    ? "bg-muted"
                    : "hover:bg-muted"
                }`}
                title={provider.name}
              >
                <provider.icon className={`w-3 h-3 ${provider.color}`} />
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-muted transition-colors rounded"
            title="Collapse"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Context Banner */}
      {context && (
        <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {context.type === "document" && <FileText className="w-3 h-3" />}
            {context.type === "web" && <Code className="w-3 h-3" />}
            <span>{getContextMessage(context)}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Ask me anything about your documents</p>
            <p className="text-xs mt-1">I have context of what you're viewing</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 mb-1">
                {message.role === "system" && (
                  <Settings className="w-3 h-3 text-muted-foreground" />
                )}
                {message.role === "assistant" && (
                  <>
                    {selectedProvider === "openai" && <Sparkles className="w-3 h-3 text-green-500" />}
                    {selectedProvider === "anthropic" && <MessageSquare className="w-3 h-3 text-orange-500" />}
                    {selectedProvider === "ollama" && <Code className="w-3 h-3 text-blue-500" />}
                    {selectedProvider === "openrouter" && <Settings className="w-3 h-3 text-purple-500" />}
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {message.role === "user"
                    ? "You"
                    : message.role === "system"
                    ? "System"
                    : currentProvider?.name || "Assistant"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
              </div>

              {/* Tool Calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                        tool.status === "success"
                          ? "bg-green-100 text-green-800"
                          : tool.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      <Code className="w-3 h-3" />
                      <span className="font-medium">{tool.name}</span>
                      <span className="opacity-75">
                        {JSON.stringify(tool.parameters)}
                      </span>
                      {tool.status === "pending" && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="flex flex-col gap-2">
          {/* Available Tools Hint */}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>I can help with: documents, extracts, flashcards, reviews</span>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your document, or type /help for commands..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setInput("/tools")}
              className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors"
            >
              /tools
            </button>
            <button
              onClick={() => setInput("/help")}
              className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors"
            >
              /help
            </button>
            <button
              onClick={() => setMessages([])}
              className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors ml-auto"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-border group-hover:bg-primary/50 rounded" />
      </div>
    </div>
  );
}
