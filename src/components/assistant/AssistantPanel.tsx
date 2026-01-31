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
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { chatWithContext } from "../../api/llm";
import { callIncrementumMCPTool, getIncrementumMCPTools, type MCPTool } from "../../api/mcp";
import { renderMarkdown } from "../../utils/markdown";
import { useSettingsStore } from "../../stores";
import { useLLMProvidersStore } from "../../stores/llmProvidersStore";
import { ShareMessageDialog } from "./ShareMessageDialog";
import { copyToClipboard, generateSingleMessageMarkdown, type ConversationMessage } from "../../api/integrations";

export interface AssistantContext {
  type: "document" | "web" | "video" | "general";
  content?: string;
  url?: string;
  documentId?: string;
  selection?: string;
  contextWindowTokens?: number;
  position?: {
    pageNumber?: number;
    scrollPercent?: number;
    currentTime?: number;
  };
  metadata?: {
    title?: string;
    duration?: number;
    videoId?: string;
  };
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
  selectedProvider?: "openai" | "anthropic" | "ollama" | "openrouter";
  onProviderChange?: (provider: "openai" | "anthropic" | "ollama" | "openrouter") => void;
  appendContextMessages?: boolean;
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
  selectedProvider: externalSelectedProvider,
  onProviderChange,
  appendContextMessages = true,
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

  // Debug logging
  useEffect(() => {
    console.log('[AssistantPanel] Mounted/Updated', { isCollapsed, width, position, className });
  }, [isCollapsed, width, position, className]);
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "ollama" | "openrouter">(() => {
    const stored = localStorage.getItem("assistant-llm-provider");
    if (stored === "openai" || stored === "anthropic" || stored === "ollama" || stored === "openrouter") {
      return stored;
    }
    return "openai";
  });
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Use external provider if provided
  const effectiveProvider = externalSelectedProvider ?? selectedProvider;
  const [isInputHovered, setIsInputHovered] = useState(false);
  const contextWindowTokens = useSettingsStore((state) => state.settings.ai.maxTokens);
  
  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<Message | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastContextSignatureRef = useRef<string | null>(null);

  const providers = [
    { id: "openai", name: "OpenAI", icon: Sparkles, color: "text-green-500" },
    { id: "anthropic", name: "Anthropic", icon: MessageSquare, color: "text-orange-500" },
    { id: "ollama", name: "Ollama", icon: Code, color: "text-blue-500" },
    { id: "openrouter", name: "OpenRouter", icon: Settings, color: "text-purple-500" },
  ];

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
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

  // Sync external provider prop
  useEffect(() => {
    if (externalSelectedProvider && externalSelectedProvider !== selectedProvider) {
      setSelectedProvider(externalSelectedProvider);
    }
  }, [externalSelectedProvider]);

  useEffect(() => {
    let isActive = true;
    getIncrementumMCPTools()
      .then((tools) => {
        if (isActive) {
          setAvailableTools(tools);
        }
      })
      .catch((error) => {
        console.error("Failed to load assistant tools:", error);
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Add context message when context changes
  useEffect(() => {
    if (context && appendContextMessages) {
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
      case "document": {
        const title = ctx.metadata?.title;
        const base = title
          ? `📄 ${title}`
          : `📄 Viewing document${ctx.documentId ? ` (ID: ${ctx.documentId})` : ""}`;
        return `${base}${ctx.position?.pageNumber ? ` • Page ${ctx.position.pageNumber}` : ""}${typeof ctx.position?.scrollPercent === "number" ? ` • ${ctx.position.scrollPercent.toFixed(1)}%` : ""}${ctx.selection ? `. Selected text: "${ctx.selection.slice(0, 100)}..."` : ""}`;
      }
      case "web": {
        const title = ctx.metadata?.title;
        const base = title ? `🌐 ${title}` : `🌐 Browsing: ${ctx.url || "Unknown page"}`;
        return `${base}${ctx.selection ? `. Selected text: "${ctx.selection.slice(0, 100)}..."` : ""}`;
      }
      case "video":
        return `🎬 Watching video: ${ctx.metadata?.title || ctx.metadata?.videoId || "Unknown"}${typeof ctx.position?.currentTime === "number" ? ` • ${formatDuration(ctx.position.currentTime)}` : ""}${ctx.metadata?.duration ? ` / ${formatDuration(ctx.metadata.duration)}` : ""}${ctx.selection ? `. Selected text: "${ctx.selection.slice(0, 100)}..."` : ""}`;
      default:
        return "General context - Ready to help";
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        const toolsList = getAvailableTools()
          .map((tool) => `• **${tool.name}** - ${tool.description}`)
          .join("\n");
        const helpMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `**Available Commands:**

/help - Show this help message
/tools - List available tools
/clear - Clear conversation

**Available Tools:**
${toolsList || "No tools available."}

**Tool Calls:**
To save items, I will include a tool call block like:
\`\`\`tool_calls
{"tool_calls":[{"name":"create_cloze_card","arguments":{"text":"...","document_id":"..."}}]}
\`\`\`

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
      const { cleanedContent, toolCalls } = parseToolCalls(response.content);

      const displayContent = cleanedContent || (toolCalls.length > 0 ? "Running tool calls..." : response.content);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: displayContent,
        timestamp: Date.now(),
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
        hasApiKey: p.apiKey ? p.apiKey.trim().length > 0 : false,
      })));

      // Check if the selected provider exists but is disabled
      const selectedTypeProvider = allProviders.find((p) => p.provider === effectiveProvider);

      if (!selectedTypeProvider) {
        // Provider doesn't exist at all
        const availableTypes = enabledProviders.map((p) => p.provider).join(", ");
        return {
          content: `No ${effectiveProvider} provider configured. Available providers: ${availableTypes || "None"}. Please add an API key in Settings.`,
        };
      }

      if (!selectedTypeProvider.enabled) {
        // Provider exists but is disabled
        return {
          content: `The ${effectiveProvider} provider is configured but disabled. Please enable it in Settings, or select a different provider.`,
        };
      }

      if (!selectedTypeProvider.apiKey || !selectedTypeProvider.apiKey.trim()) {
        return {
          content: `${effectiveProvider} provider found but API key is empty. Please remove and re-add the provider in Settings.`,
        };
      }

      const provider = selectedTypeProvider;

      // Convert messages to LLM format
      const toolInstruction = buildToolInstruction(getAvailableTools());
      const llmMessages = [
        {
          role: "system" as const,
          content: toolInstruction,
        },
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
      const effectiveContextWindow = llmContext.contextWindowTokens && llmContext.contextWindowTokens > 0
        ? llmContext.contextWindowTokens
        : contextWindow;

      // Call the LLM API
      const response = await chatWithContext(
        effectiveProvider,
        provider.model,
        llmMessages,
        {
          type: llmContext.type,
          documentId: llmContext.documentId,
          url: llmContext.url,
          selection: llmContext.selection,
          content: llmContext.content,
          contextWindowTokens: effectiveContextWindow,
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
    return availableTools.length > 0 ? availableTools : [
      {
        name: "create_document",
        description: "Create a new document",
        inputSchema: { title: "string", content: "string" },
      },
      {
        name: "get_document",
        description: "Get document details",
        inputSchema: { document_id: "string" },
      },
      {
        name: "search_documents",
        description: "Search documents by content",
        inputSchema: { query: "string" },
      },
      {
        name: "create_extract",
        description: "Create an extract from selection",
        inputSchema: { content: "string", note: "string" },
      },
      {
        name: "create_qa_card",
        description: "Create a Q&A flashcard",
        inputSchema: { question: "string", answer: "string" },
      },
      {
        name: "get_review_queue",
        description: "Get items due for review",
        inputSchema: {},
      },
    ];
  };

  const parseToolCalls = (content: string) => {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /```tool_calls\s*([\s\S]*?)```/g;
    let cleanedContent = content;
    let match: RegExpExecArray | null;

    while ((match = toolCallRegex.exec(content)) !== null) {
      const raw = match[1].trim();
      try {
        const parsed = JSON.parse(raw);
        const calls = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.tool_calls)
            ? parsed.tool_calls
            : [];

        calls.forEach((call: { name?: string; arguments?: Record<string, unknown> }) => {
          if (typeof call?.name === "string") {
            const args = call.arguments;
            const normalizedArgs = args && typeof args === "object" && !Array.isArray(args)
              ? args
              : {};
            toolCalls.push({
              name: call.name,
              parameters: normalizedArgs,
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

  const executeToolCalls = async (messageId: string, calls: ToolCall[]) => {
    for (let index = 0; index < calls.length; index += 1) {
      const call = calls[index];
      const parameters = normalizeToolParameters(call.name, call.parameters);
      updateToolCall(messageId, index, { parameters });

      try {
        const result = await callIncrementumMCPTool(call.name, parameters);
        updateToolCall(messageId, index, { result, status: "success" });
      } catch (error) {
        updateToolCall(messageId, index, {
          result: error instanceof Error ? error.message : error,
          status: "error",
        });
      }
    }
  };

  const updateToolCall = (messageId: string, index: number, updates: Partial<ToolCall>) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.toolCalls) return message;
        const updatedCalls = message.toolCalls.map((call, callIndex) =>
          callIndex === index ? { ...call, ...updates } : call
        );
        return { ...message, toolCalls: updatedCalls };
      })
    );
  };

  const normalizeToolParameters = (toolName: string, parameters: Record<string, unknown>) => {
    const normalized = { ...parameters };
    const documentId = context?.documentId;
    const attachableTools = new Set([
      "create_cloze_card",
      "create_qa_card",
      "create_extract",
      "batch_create_cards",
    ]);

    if (documentId && attachableTools.has(toolName) && normalized.document_id == null) {
      normalized.document_id = documentId;
    }

    return normalized;
  };

  const buildToolInstruction = (tools: MCPTool[]) => {
    if (tools.length === 0) {
      return "Answer normally. Tool calls are unavailable.";
    }
    const toolNames = tools.map((tool) => tool.name).join(", ");
    return `You can call tools when the user asks to create, save, update, or delete data.
Use this exact format for tool calls:
\`\`\`tool_calls
{"tool_calls":[{"name":"tool_name","arguments":{}}]}
\`\`\`
Available tools: ${toolNames}`;
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

  // Handle copying a single message to clipboard
  const handleCopyMessage = async (message: Message) => {
    const conversationMessage: ConversationMessage = {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    };
    
    const title = context?.metadata?.title || 
                  (context?.type === "document" ? "Document Discussion" : 
                   context?.type === "web" ? "Web Page Discussion" : 
                   "AI Conversation");
    
    const markdown = generateSingleMessageMarkdown(
      conversationMessage,
      title,
      context ? getContextMessage(context) : undefined
    );
    
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  // Handle opening share dialog for a single message
  const handleShareMessage = (message: Message) => {
    setShareMessage(message);
    setIsShareDialogOpen(true);
  };

  // Handle opening share dialog for the whole conversation
  const handleShareConversation = () => {
    setShareMessage(null);
    setIsShareDialogOpen(true);
  };

  // Convert internal messages to conversation messages for export
  const getConversationMessages = (): ConversationMessage[] => {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
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

  const currentProvider = providers.find((p) => p.id === effectiveProvider);

  const handleProviderChange = (providerId: "openai" | "anthropic" | "ollama" | "openrouter") => {
    setSelectedProvider(providerId);
    onProviderChange?.(providerId);
  };

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
          {/* Share Conversation Button */}
          {messages.length > 0 && (
            <button
              onClick={handleShareConversation}
              className="p-1.5 hover:bg-muted transition-colors rounded mr-1"
              title="Share conversation"
            >
              <Share2 className="w-4 h-4 text-foreground" />
            </button>
          )}
          {/* Provider Selector */}
          <div className="flex items-center gap-1 mr-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id as any)}
                className={`p-1.5 rounded transition-colors ${effectiveProvider === provider.id
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
            {context.type === "video" && context.content && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/80">
                Transcript attached
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-4"
      >
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
              className={`flex flex-col group ${message.role === "user" ? "items-end" : "items-start"
                }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 mb-1">
                {message.role === "system" && (
                  <Settings className="w-3 h-3 text-muted-foreground" />
                )}
                {message.role === "assistant" && (
                  <>
                    {effectiveProvider === "openai" && <Sparkles className="w-3 h-3 text-green-500" />}
                    {effectiveProvider === "anthropic" && <MessageSquare className="w-3 h-3 text-orange-500" />}
                    {effectiveProvider === "ollama" && <Code className="w-3 h-3 text-blue-500" />}
                    {effectiveProvider === "openrouter" && <Settings className="w-3 h-3 text-purple-500" />}
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

              {/* Message Actions - only for assistant messages */}
              {message.role === "assistant" && (
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyMessage(message)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleShareMessage(message)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Share/Export"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              )}

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
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="flex flex-col gap-2">
          {/* Available Tools Hint */}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Type /tools to see available tools</span>
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

      {/* Share Dialog */}
      <ShareMessageDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        messages={getConversationMessages()}
        singleMessage={shareMessage ? {
          role: shareMessage.role,
          content: shareMessage.content,
          timestamp: shareMessage.timestamp,
        } : undefined}
        contextInfo={context ? getContextMessage(context) : undefined}
        documentTitle={context?.metadata?.title || 
          (context?.type === "document" ? "Document Discussion" : 
           context?.type === "web" ? "Web Page Discussion" : 
           "AI Conversation")}
      />

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
