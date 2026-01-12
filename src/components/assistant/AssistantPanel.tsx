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
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { chatWithContext } from "../../api/llm";
import { useSettingsStore } from "../../stores";
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

export type AssistantPosition = "left" | "right";

interface AssistantPanelProps {
  context?: AssistantContext;
  onToolCall?: (tool: string, params: Record<string, unknown>) => Promise<unknown>;
  className?: string;
  onInputHoverChange?: (isHovered: boolean) => void;
  onWidthChange?: (width: number) => void;
  position?: AssistantPosition;
  onPositionChange?: (position: AssistantPosition) => void;
}

const ASSISTANT_POSITION_KEY = "assistant-panel-position";
const ASSISTANT_WIDTH_KEY = "assistant-panel-width";

export function AssistantPanel({
  context,
  onToolCall,
  className = "",
  onInputHoverChange,
  onWidthChange,
  position: externalPosition,
  onPositionChange,
}: AssistantPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(ASSISTANT_WIDTH_KEY);
    return saved ? parseInt(saved) : 400;
  });
  const [position, setPosition] = useState<AssistantPosition>(() => {
    if (externalPosition) return externalPosition;
    const saved = localStorage.getItem(ASSISTANT_POSITION_KEY);
    return saved === "left" ? "left" : "right";
  });
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "ollama" | "openrouter">(() => {
    const stored = localStorage.getItem("assistant-llm-provider");
    if (stored === "openai" || stored === "anthropic" || stored === "ollama" || stored === "openrouter") {
      return stored;
    }
    return "openai";
  });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const contextWindowTokens = useSettingsStore((state) => state.settings.ai.maxTokens);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastContextSignatureRef = useRef<string | null>(null);

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

  useEffect(() => {
    onInputHoverChange?.(isInputFocused || isInputHovered);
  }, [isInputFocused, isInputHovered, onInputHoverChange]);

  useEffect(() => {
    localStorage.setItem("assistant-llm-provider", selectedProvider);
  }, [selectedProvider]);

  // Add context message when context changes
  useEffect(() => {
    if (context) {
      const signature = `${context.type}:${context.documentId ?? ""}:${context.url ?? ""}`;
      if (lastContextSignatureRef.current === signature) {
        return;
      }
      lastContextSignatureRef.current = signature;
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

  const renderMarkdown = (text: string): string => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const codeBlocks: string[] = [];
    const escaped = escapeHtml(text);
    const withPlaceholders = escaped.replace(/```([\s\S]*?)```/g, (_match, code) => {
      const index = codeBlocks.length;
      const trimmed = code.trim();
      codeBlocks.push(
        `<pre class="mt-2 overflow-x-auto rounded bg-background/80 p-2 text-xs"><code>${trimmed}</code></pre>`
      );
      return `@@CODEBLOCK_${index}@@`;
    });

    const formatInline = (value: string) => {
      let formatted = value;
      formatted = formatted.replace(/`([^`]+)`/g, "<code class=\"rounded bg-background/80 px-1 py-0.5 text-xs\">$1</code>");
      formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a class=\"underline decoration-dotted underline-offset-4\" href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      formatted = formatted.replace(/_(.+?)_/g, "<em>$1</em>");
      return formatted;
    };

    const lines = withPlaceholders.split(/\r?\n/);
    let html = "";
    let listType: "ul" | "ol" | null = null;
    let blockquoteLines: string[] = [];

    const isTableSeparator = (line: string) =>
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    const hasTablePipe = (line: string) => /\|/.test(line);

    const flushList = () => {
      if (listType) {
        html += listType === "ul" ? "</ul>" : "</ol>";
        listType = null;
      }
    };

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        const content = blockquoteLines.map(formatInline).join("<br>");
        html += `<blockquote class="border-l-2 border-border pl-3 italic text-muted-foreground">${content}</blockquote>`;
        blockquoteLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
      const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      const hrMatch = line.match(/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/);

      if (headingMatch) {
        flushList();
        flushBlockquote();
        const level = headingMatch[1].length;
        const content = formatInline(headingMatch[2]);
        const sizeClass =
          level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm";
        html += `<h${level} class="${sizeClass} font-semibold mt-2 mb-1">${content}</h${level}>`;
        continue;
      }

      if (hrMatch) {
        flushList();
        flushBlockquote();
        html += "<hr class=\"my-2 border-border\" />";
        continue;
      }

      if (blockquoteMatch) {
        flushList();
        blockquoteLines.push(blockquoteMatch[1]);
        continue;
      }

      if (hasTablePipe(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        flushList();
        flushBlockquote();
        const headerLine = line;
        const separatorLine = lines[i + 1];
        const rows: string[] = [];
        i += 2;
        while (i < lines.length && hasTablePipe(lines[i]) && lines[i].trim() !== "") {
          rows.push(lines[i]);
          i += 1;
        }
        i -= 1;

        const parseRow = (row: string) =>
          row
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => formatInline(cell.trim()));

        const headerCells = parseRow(headerLine);
        const bodyRows = rows.map(parseRow);

        html += "<div class=\"overflow-x-auto\"><table class=\"w-full border-collapse text-sm\">";
        html += "<thead><tr>";
        headerCells.forEach((cell) => {
          html += `<th class="border border-border px-2 py-1 text-left font-semibold">${cell}</th>`;
        });
        html += "</tr></thead>";
        html += "<tbody>";
        bodyRows.forEach((cells) => {
          html += "<tr>";
          cells.forEach((cell) => {
            html += `<td class="border border-border px-2 py-1 align-top">${cell}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table></div>";
        continue;
      }

      if (unorderedMatch) {
        flushBlockquote();
        if (listType !== "ul") {
          flushList();
          listType = "ul";
          html += "<ul class=\"list-disc pl-5 space-y-1\">";
        }
        html += `<li>${formatInline(unorderedMatch[1])}</li>`;
        continue;
      }

      if (orderedMatch) {
        flushBlockquote();
        if (listType !== "ol") {
          flushList();
          listType = "ol";
          html += "<ol class=\"list-decimal pl-5 space-y-1\">";
        }
        html += `<li>${formatInline(orderedMatch[1])}</li>`;
        continue;
      }

      if (line.trim() === "") {
        flushList();
        flushBlockquote();
        html += "<br>";
        continue;
      }

      flushList();
      flushBlockquote();
      html += `<p>${formatInline(line)}</p>`;
    }

    flushList();
    flushBlockquote();

    codeBlocks.forEach((block, index) => {
      html = html.replace(`@@CODEBLOCK_${index}@@`, block);
    });

    return html;
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
    const userInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Handle slash commands locally
      if (userInput === "/help") {
        const helpMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `**Available Commands:**

/help - Show this help message
/tools - List available tools
/clear - Clear conversation

**Available Tools:**
• create_document - Create a new document
• get_document - Get document details
• search_documents - Search documents by content
• create_extract - Create an extract from selection
• create_qa_card - Create a Q&A flashcard
• get_review_queue - Get items due for review

I also have context of what you're currently viewing, so feel free to ask questions about your documents!`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, helpMessage]);
        setIsLoading(false);
        return;
      }

      if (userInput === "/tools") {
        const tools = getAvailableTools();
        const toolsList = tools.map(t => `• **${t.name}** - ${t.description}`).join('\n');
        const toolsMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `**Available Tools:**\n\n${toolsList}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, toolsMessage]);
        setIsLoading(false);
        return;
      }

      if (userInput === "/clear") {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      // Build context for the LLM
      // Filter conversation history to only include user and assistant messages
      const filteredHistory = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-10); // Last 10 messages (excluding system messages)

      const contextData = {
        currentContext: context,
        conversationHistory: filteredHistory,
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
      // Get all providers to check if selected provider exists but is disabled
      const allProviders = useLLMProvidersStore.getState().providers;
      const enabledProviders = useLLMProvidersStore.getState().getEnabledProviders();

      console.log("All providers:", allProviders.map((p) => ({
        id: p.id,
        provider: p.provider,
        name: p.name,
        enabled: p.enabled,
        hasApiKey: !!p.apiKey && p.apiKey.trim().length > 0,
      })));

      // Check if the selected provider exists but is disabled
      const selectedTypeProvider = allProviders.find((p) => p.provider === selectedProvider);

      if (!selectedTypeProvider) {
        // Provider doesn't exist at all
        const availableTypes = enabledProviders.map((p) => p.provider).join(", ");
        return {
          content: `No ${selectedProvider} provider configured. Available providers: ${availableTypes || "None"}. Please add an API key in Settings.`,
        };
      }

      if (!selectedTypeProvider.enabled) {
        // Provider exists but is disabled
        return {
          content: `The ${selectedProvider} provider is configured but disabled. Please enable it in Settings, or select a different provider.`,
        };
      }

      if (!selectedTypeProvider.apiKey || !selectedTypeProvider.apiKey.trim()) {
        return {
          content: `${selectedProvider} provider found but API key is empty. Please remove and re-add the provider in Settings.`,
        };
      }

      const provider = selectedTypeProvider;

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
      const contextWindow = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;

      // Call the LLM API
      const response = await chatWithContext(
        selectedProvider,
        provider.model,
        llmMessages,
        {
          type: llmContext.type,
          documentId: llmContext.documentId,
          url: llmContext.url,
          selection: llmContext.selection,
          content: llmContext.content,
          contextWindowTokens: contextWindow,
        },
        provider.apiKey,
        provider.baseUrl && provider.baseUrl.trim() ? provider.baseUrl : undefined
      );

      return { content: response.content };
    } catch (error) {
      console.error("LLM API error:", error);
      // Better error handling - Tauri errors can be strings or objects
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
      return {
        content: `Error calling LLM: ${errorMessage}`,
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

  // Sync external position prop
  useEffect(() => {
    if (externalPosition && externalPosition !== position) {
      setPosition(externalPosition);
    }
  }, [externalPosition]);

  // Handle position toggle
  const togglePosition = () => {
    const newPosition = position === "left" ? "right" : "left";
    setPosition(newPosition);
    localStorage.setItem(ASSISTANT_POSITION_KEY, newPosition);
    onPositionChange?.(newPosition);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        let newWidth: number;
        if (position === "right") {
          // Panel on right: width = screen width - mouse X
          newWidth = window.innerWidth - e.clientX;
        } else {
          // Panel on left: width = mouse X
          newWidth = e.clientX;
        }
        if (newWidth >= 300 && newWidth <= 800) {
          setWidth(newWidth);
          localStorage.setItem(ASSISTANT_WIDTH_KEY, newWidth.toString());
          onWidthChange?.(newWidth);
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
  }, [isResizing, position, onWidthChange]);

  if (isCollapsed) {
    return (
      <div className={`flex flex-col bg-card ${position === "right" ? "border-l" : "border-r"} border-border relative ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-muted transition-colors"
          title="Open Assistant"
        >
          {position === "right" ? (
            <ChevronLeft className="w-4 h-4 text-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-foreground" />
          )}
        </button>
      </div>
    );
  }

  const currentProvider = providers.find((p) => p.id === selectedProvider);

  return (
    <div
      className={`flex flex-col bg-card ${position === "right" ? "border-l" : "border-r"} border-border relative ${className}`}
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
                className={`p-1.5 rounded transition-colors ${selectedProvider === provider.id
                    ? "bg-muted"
                    : "hover:bg-muted"
                  }`}
                title={provider.name}
              >
                <provider.icon className={`w-3 h-3 ${provider.color}`} />
              </button>
            ))}
          </div>
          {/* Position Toggle Button */}
          <button
            onClick={togglePosition}
            className="p-1.5 hover:bg-muted transition-colors rounded"
            title={position === "right" ? "Move to left side" : "Move to right side"}
          >
            {position === "right" ? (
              <PanelLeftClose className="w-4 h-4 text-foreground" />
            ) : (
              <PanelRightClose className="w-4 h-4 text-foreground" />
            )}
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-muted transition-colors rounded"
            title="Collapse"
          >
            {position === "right" ? (
              <ChevronRight className="w-4 h-4 text-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-foreground" />
            )}
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
              className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"
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
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted text-foreground"
                  }`}
              >
                {message.role === "user" ? (
                  message.content
                ) : (
                  <div
                    className="assistant-markdown leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                )}
              </div>

              {/* Tool Calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${tool.status === "success"
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
          <div
            className="flex gap-2"
            onMouseEnter={() => setIsInputHovered(true)}
            onMouseLeave={() => setIsInputHovered(false)}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
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
              onClick={() => setInput("/clear")}
              className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground transition-colors ml-auto"
            >
              /clear
            </button>
          </div>
        </div>
      </div>

      {/* Resize Handle - positioned based on panel position */}
      <div
        onMouseDown={handleResizeStart}
        className={`absolute top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors group ${position === "right" ? "left-0" : "right-0"
          }`}
      >
        <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-border group-hover:bg-primary/50 rounded ${position === "right" ? "left-0" : "right-0"
          }`} />
      </div>
    </div>
  );
}
