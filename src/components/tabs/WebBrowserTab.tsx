/**
 * Web Browser Tab with Extract Creation
 * 
 * This component provides a web browser view that allows users to:
 * - Navigate websites via iframe (web) or native webview (Tauri)
 * - Create extracts from selected text
 * - View and manage created extracts
 * 
 * NOTE: Cross-origin iframe security prevents direct access to selection.
 * We work around this by:
 * 1. For Tauri: Using the native webview's selection API
 * 2. For Web: Using a floating selection toolbar that captures text before it goes to the iframe
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ExternalLink,
  HighlighterIcon,
  BookmarkPlus,
  Sparkles,
  X,
  Plus,
  Tag,
  FolderOpen,
  MessageSquare,
  CheckCircle,
  BookOpen,
  Clock,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { invokeCommand, isTauri } from "../../lib/tauri";
import { createExtract, type CreateExtractInput, type Extract } from "../../api/extracts";
import { createLearningItem, type CreateLearningItemInput } from "../../api/learning-items";
import { createDocument } from "../../api/documents";
import { AssistantPanel, type AssistantContext } from "../assistant/AssistantPanel";
import { useToast } from "../common/Toast";
import { formatRelativeTime } from "../../utils/date";

// Type definitions for lazy loading
type WebviewType = import("@tauri-apps/api/webview").Webview;

interface WebExtract {
  id?: string;
  content: string;
  htmlContent?: string;
  url: string;
  pageTitle: string;
  timestamp: number;
  note?: string;
  tags?: string[];
}

interface ExtractDialogProps {
  extract: WebExtract;
  onSave: (data: { content: string; htmlContent?: string; note: string; tags: string[] }) => void;
  onClose: () => void;
}

function ExtractDialog({ extract, onSave, onClose }: ExtractDialogProps) {
  const toast = useToast();
  const [content, setContent] = useState(extract.content || "");
  const [note, setNote] = useState(extract.note || "");
  const [tags, setTags] = useState<string[]>(extract.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [color, setColor] = useState("yellow");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const isManualMode = !extract.content;

  const colors = [
    { name: "yellow", value: "#fef08a", bg: "bg-yellow-200", border: "border-yellow-400" },
    { name: "green", value: "#bbf7d0", bg: "bg-green-200", border: "border-green-400" },
    { name: "blue", value: "#bfdbfe", bg: "bg-blue-200", border: "border-blue-400" },
    { name: "purple", value: "#e9d5ff", bg: "bg-purple-200", border: "border-purple-400" },
    { name: "red", value: "#fecaca", bg: "bg-red-200", border: "border-red-400" },
    { name: "orange", value: "#fed7aa", bg: "bg-orange-200", border: "border-orange-400" },
  ];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveAsExtract = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }
    setIsSaving(true);
    try {
      onSave({ content, htmlContent: extract.htmlContent, note, tags });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFlashcard = async () => {
    setIsGenerating(true);
    try {
      await createLearningItem({
        item_type: "Qa",
        question: `What is the main point of: "${extract.content.slice(0, 100)}..."?`,
        answer: extract.content,
      });
      onClose();
    } catch (error) {
      console.error("Error creating flashcard:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview of the extract with color
  const selectedColor = colors.find(c => c.name === color) || colors[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedColor.bg}`}>
              <HighlighterIcon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Create Extract</h3>
              <p className="text-xs text-muted-foreground">From: {extract.pageTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Selected content preview / Manual input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              {isManualMode ? "Extract Content" : "Selected Content"}
              {extract.htmlContent && !isManualMode && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Rich formatting preserved
                </span>
              )}
            </label>
            
            {isManualMode ? (
              // Manual input mode - user needs to paste or type content
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Tip:</strong> Due to browser security, we can't automatically capture text from websites. 
                    Please copy the text you want to save, then paste it below.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setIsPasting(true);
                      try {
                        const text = await navigator.clipboard.readText();
                        setContent(text);
                        toast.success("Pasted from clipboard");
                      } catch (error) {
                        toast.error("Could not access clipboard. Please paste manually.");
                      } finally {
                        setIsPasting(false);
                      }
                    }}
                    disabled={isPasting}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    {isPasting ? "Pasting..." : "Paste from Clipboard"}
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type the content you want to save..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                  rows={6}
                />
              </div>
            ) : (
              // Auto-captured content mode
              <>
                <div className={`p-4 rounded-lg border-2 ${selectedColor.border} ${selectedColor.bg} bg-opacity-30 max-h-48 overflow-y-auto`}>
                  {extract.htmlContent ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground"
                      dangerouslySetInnerHTML={{ __html: extract.htmlContent }}
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{content}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.length} characters selected
                </p>
              </>
            )}
          </div>

          {/* Color selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Highlight Color
            </label>
            <div className="flex items-center gap-3">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`w-10 h-10 rounded-full ${c.bg} border-2 transition-all ${
                    color === c.name ? `${c.border} ring-2 ring-offset-2 ring-offset-card ring-primary scale-110` : 'border-transparent hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts, context, or why this extract is important..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Tags
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
              <button
                onClick={handleAddTag}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Source info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{extract.url}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border bg-muted/30 space-y-2">
          <button
            onClick={handleSaveAsExtract}
            disabled={isSaving || !content.trim()}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                {isManualMode ? "Save Extract" : "Save as Extract"}
              </>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCreateFlashcard}
              disabled={isGenerating}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Creating..." : "Create Flashcard"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to detect if we're on Linux
function isLinux(): boolean {
  return navigator.platform.includes("Linux") || navigator.userAgent.includes("Linux");
}

export function WebBrowserTab({ initialUrl }: { initialUrl?: string }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [webviewError, setWebviewError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [extractDialog, setExtractDialog] = useState<WebExtract | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedExtracts, setSavedExtracts] = useState<WebExtract[]>([]);
  const [showAssistant, setShowAssistant] = useState(false);
  const [iframeStatus, setIframeStatus] = useState<"idle" | "loading" | "loaded" | "blocked">("idle");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeTimeoutRef = useRef<number | null>(null);
  const webviewRef = useRef<WebviewType | null>(null);
  const webviewContainerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const [extractsExpanded, setExtractsExpanded] = useState(true);

  const assistantContext = useMemo<AssistantContext>(() => {
    return currentUrl ? { type: "web", url: currentUrl } : { type: "web" };
  }, [currentUrl]);

  // Handle navigation
  const handleNavigate = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) return;

    let formattedUrl = inputUrl;
    if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
      if (inputUrl.includes(" ")) {
        formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}`;
      } else {
        formattedUrl = `https://${inputUrl}`;
      }
    }

    setIsLoading(true);
    setWebviewError(null);
    setCurrentUrl(formattedUrl);
    setUrl(formattedUrl);
    if (!isTauri()) {
      setIframeStatus("loading");
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPageTitle(new URL(formattedUrl).hostname);
  }, [history, historyIndex]);

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setUrl(url);
      if (!isTauri()) {
        setIsLoading(true);
        setIframeStatus("loading");
      }
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setUrl(url);
      if (!isTauri()) {
        setIsLoading(true);
        setIframeStatus("loading");
      }
    }
  };

  const handleRefresh = () => {
    if (currentUrl) {
      setRefreshToken((token) => token + 1);
      if (!isTauri()) {
        setIsLoading(true);
        setIframeStatus("loading");
      }
    }
  };

  const handleOpenInBrowser = async () => {
    if (currentUrl) {
      try {
        if (isTauri()) {
          const { openUrl } = await import("@tauri-apps/plugin-opener");
          await openUrl(currentUrl);
        } else {
          window.open(currentUrl, "_blank");
        }
      } catch (error) {
        console.error("Error opening URL:", error);
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeStatus((prev) => (prev === "loading" ? "loaded" : prev));
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeStatus("blocked");
  };

  const handleAddBookmark = () => {
    if (currentUrl && !bookmarks.includes(currentUrl)) {
      setBookmarks([...bookmarks, currentUrl]);
      toast.success("Bookmark added");
    }
  };

  // Extract creation - handles cross-origin iframe limitations
  const handleCreateExtract = useCallback(async () => {
    // Try to get selection from the iframe if same-origin, otherwise from main window
    let selectedText = "";
    let htmlContent: string | undefined;
    
    // For Tauri: use native webview API to get selection
    if (isTauri() && webviewRef.current) {
      try {
        // Execute JavaScript in the webview to get selection
        const result = await webviewRef.current.evaluateJavaScript<string>(`
          (function() {
            const selection = window.getSelection()?.toString() || '';
            return selection;
          })()
        `);
        selectedText = result?.trim() || "";
      } catch (error) {
        console.log("Could not get selection from webview:", error);
      }
    }
    
    // For Web: try to get selection from iframe if same-origin
    if (!selectedText && !isTauri()) {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow && iframe.contentDocument) {
        try {
          const iframeSelection = iframe.contentWindow.getSelection()?.toString();
          selectedText = iframeSelection?.trim() || "";
        } catch (e) {
          // Cross-origin restriction - can't access iframe content
          console.log("Cross-origin iframe - using fallback method");
        }
      }
    }
    
    // Fallback: get selection from main window (user may have copied text)
    if (!selectedText) {
      const selection = window.getSelection();
      selectedText = selection?.toString().trim() || "";
      
      // Try to capture HTML from main window selection
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();
          const tempDiv = document.createElement("div");
          tempDiv.appendChild(fragment);
          htmlContent = tempDiv.innerHTML;
        } catch (e) {
          console.warn("Could not capture HTML content:", e);
        }
      }
    }

    // If still no text, show manual input dialog
    if (!selectedText) {
      setExtractDialog({
        content: "",
        htmlContent: undefined,
        url: currentUrl,
        pageTitle: pageTitle || new URL(currentUrl).hostname,
        timestamp: Date.now(),
      });
      return;
    }

    setExtractDialog({
      content: selectedText,
      htmlContent,
      url: currentUrl,
      pageTitle: pageTitle || new URL(currentUrl).hostname,
      timestamp: Date.now(),
    });
  }, [currentUrl, pageTitle]);

  // Save extract with proper document creation
  const handleSaveExtract = async (data: { content: string; htmlContent?: string; note: string; tags: string[] }) => {
    try {
      // Create or get a document for this web page
      const docTitle = pageTitle || new URL(currentUrl).hostname;
      let documentId: string;

      try {
        // Try to create a document for this URL
        const doc = await createDocument(
          docTitle,
          currentUrl,
          "web"
        );
        documentId = doc.id;
      } catch (error) {
        // If document creation fails, use a temporary ID
        console.warn("Failed to create document, using temp ID:", error);
        documentId = `web-${Date.now()}`;
      }

      // Create the extract
      const extractInput: CreateExtractInput = {
        document_id: documentId,
        content: data.content,
        html_content: data.htmlContent,
        source_url: extractDialog?.url || currentUrl,
        page_title: pageTitle,
        note: data.note,
        tags: data.tags,
        color: "yellow",
      };

      const createdExtract = await createExtract(extractInput);

      // Add to saved extracts with the real ID
      const newExtract: WebExtract = {
        id: createdExtract.id,
        content: data.content,
        htmlContent: data.htmlContent,
        url: extractDialog?.url || currentUrl,
        pageTitle: extractDialog?.pageTitle || pageTitle,
        timestamp: Date.now(),
        note: data.note,
        tags: data.tags,
      };

      setSavedExtracts((prev) => [newExtract, ...prev]);

      // Show success toast with actions
      toast.success(
        "Extract created successfully",
        <div className="flex flex-col gap-2">
          <p className="text-sm">Extract saved with {data.content.length} characters</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSidebar(true)}
              className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded transition-colors"
            >
              View Extracts
            </button>
          </div>
        </div>,
        { duration: 5000 }
      );

      setExtractDialog(null);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error("Error saving extract:", error);
      toast.error("Failed to create extract", error instanceof Error ? error.message : "Please try again");
    }
  };

  // Delete an extract
  const handleDeleteExtract = (index: number) => {
    setSavedExtracts((prev) => prev.filter((_, i) => i !== index));
    toast.success("Extract removed");
  };

  // View extract details
  const handleViewExtract = (extract: WebExtract) => {
    setExtractDialog(extract);
  };

  const updateWebviewBounds = useCallback(async () => {
    if (!webviewRef.current || !webviewContainerRef.current) return;

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(async () => {
          if (!webviewRef.current || !webviewContainerRef.current) {
            resolve();
            return;
          }

          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const toolbarHeight = 140;
          
          const x = 8;
          const y = toolbarHeight;
          const width = windowWidth - 16;
          const height = windowHeight - toolbarHeight - 10;

          if (width > 0 && height > 200) {
            try {
              if (isTauri()) {
                const { LogicalPosition, LogicalSize } = await import("@tauri-apps/api/dpi");
                await webviewRef.current?.setPosition(new LogicalPosition(x, y));
                await webviewRef.current?.setSize(new LogicalSize(width, height));
              }
            } catch (e) {
              console.warn("Failed to update webview bounds:", e);
            }
          }
          resolve();
        }, 50);
      });
    });
  }, []);

  // Initialize
  useEffect(() => {
    if (initialUrl) {
      void handleNavigate(initialUrl);
    }
  }, [initialUrl, handleNavigate]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create webview for Tauri
  useEffect(() => {
    if (!currentUrl) {
      if (webviewRef.current) {
        void webviewRef.current.close();
        webviewRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    const createWebview = async () => {
      if (!isMountedRef.current || isCancelled) return;

      setIsLoading(true);
      setWebviewError(null);

      if (webviewRef.current) {
        await webviewRef.current.close().catch(() => undefined);
        webviewRef.current = null;
      }

      if (isTauri()) {
        const { Webview } = await import("@tauri-apps/api/webview");
        const existing = await Webview.getByLabel("web-browser");
        if (existing) {
          await existing.close().catch(() => undefined);
        }
      }

      if (!webviewContainerRef.current || !isMountedRef.current || isCancelled) {
        setIsLoading(false);
        return;
      }

      try {
        if (!isTauri()) {
          setIsLoading(false);
          return;
        }

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { Webview } = await import("@tauri-apps/api/webview");
        const appWindow = getCurrentWindow();

        await new Promise<void>((resolve) => {
          if (appWindow.label) {
            resolve();
          } else {
            appWindow.once("tauri://created", () => resolve());
          }
        });

        if (!webviewContainerRef.current || !isMountedRef.current || isCancelled) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const toolbarHeight = 140;
        
        const x = 8;
        const y = toolbarHeight;
        const width = windowWidth - 16;
        const height = windowHeight - toolbarHeight - 10;

        const webview = new Webview(appWindow, "web-browser", {
          url: currentUrl,
          x,
          y,
          width,
          height,
        });

        if (!isMountedRef.current || isCancelled) {
          await webview.close().catch(() => undefined);
          return;
        }

        webviewRef.current = webview;

        webview.once("tauri://created", async () => {
          if (!isCancelled) {
            await updateWebviewBounds();
            setIsLoading(false);
            setTimeout(() => void updateWebviewBounds(), 200);
            setTimeout(() => void updateWebviewBounds(), 500);
          }
        }).catch((e) => console.warn("Failed to attach created listener:", e));

        webview.once("tauri://error", (event: unknown) => {
          if (!isCancelled) {
            setIsLoading(false);
            const errorMessage = (event as any)?.payload?.message || String(event);
            setWebviewError(`Failed to load: ${errorMessage}`);
          }
        }).catch((e) => console.warn("Failed to attach error listener:", e));

        setTimeout(() => {
          if (!isCancelled && webviewRef.current === webview) {
            setIsLoading(false);
            void updateWebviewBounds();
          }
        }, 3000);
      } catch (error) {
        console.error("Exception creating webview:", error);
        if (!isCancelled) {
          setIsLoading(false);
          setWebviewError(`Exception: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      void createWebview();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [currentUrl, refreshToken, updateWebviewBounds]);

  // Resize observer
  useEffect(() => {
    if (!webviewContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      void updateWebviewBounds();
    });
    observer.observe(webviewContainerRef.current);
    return () => observer.disconnect();
  }, [updateWebviewBounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webviewRef.current) {
        void webviewRef.current.close();
        webviewRef.current = null;
      }
      if (isTauri()) {
        import("@tauri-apps/api/webview").then(({ Webview }) => {
          Webview.getByLabel("web-browser")
            .then((existing) => existing?.close())
            .catch(() => undefined);
        });
      }
    };
  }, []);

  // Load bookmarks and extracts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("web-browser-bookmarks");
    if (saved) setBookmarks(JSON.parse(saved));
    
    const savedExtractsData = localStorage.getItem("web-browser-extracts");
    if (savedExtractsData) setSavedExtracts(JSON.parse(savedExtractsData));
  }, []);

  // Persist bookmarks and extracts
  useEffect(() => {
    localStorage.setItem("web-browser-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem("web-browser-extracts", JSON.stringify(savedExtracts));
  }, [savedExtracts]);

  // Keyboard shortcut: Ctrl/Cmd + Shift + E to create extract
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handleCreateExtract();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateExtract]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {/* Browser Toolbar */}
      <div className="p-2 border-b border-border space-y-2 flex-shrink-0 bg-card">
        {/* Navigation Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={!currentUrl}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* URL Input */}
          <div className="flex-1 flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleNavigate(url)}
              placeholder="Enter URL or search..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            />
            <button
              onClick={() => handleNavigate(url)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Go
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleAddBookmark}
            disabled={!currentUrl || bookmarks.includes(currentUrl)}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            title="Add bookmark"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-lg transition-colors ${showSidebar ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Toggle sidebar"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAssistant(!showAssistant)}
            className={`p-2 rounded-lg transition-colors ${showAssistant ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Toggle assistant"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenInBrowser}
            disabled={!currentUrl}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            title="Open in system browser"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Extract Actions Row */}
        {currentUrl && (
          <div className="flex items-center gap-3 pl-1">
            <button
              onClick={handleCreateExtract}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors text-sm flex items-center gap-2 font-medium"
              title="Create extract from selected text (Ctrl/Cmd + Shift + E)"
            >
              <HighlighterIcon className="w-4 h-4" />
              Create Extract
            </button>
            <span className="text-xs text-muted-foreground">
              Select text on this page, then click button or press
              <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Shift+E</kbd>
            </span>
            {savedExtracts.length > 0 && (
              <span className="ml-auto text-xs text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {savedExtracts.length} extract{savedExtracts.length > 1 ? 's' : ''} saved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Bookmarks & Extracts */}
        {showSidebar && (
          <div className="w-80 border-r border-border bg-card overflow-y-auto flex-shrink-0">
            {/* Extracts Section */}
            <div className="p-4 border-b border-border">
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setExtractsExpanded(!extractsExpanded)}
              >
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <HighlighterIcon className="w-4 h-4 text-primary" />
                  Recent Extracts
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {savedExtracts.length}
                  </span>
                </h3>
                <span className="text-muted-foreground text-xs">
                  {extractsExpanded ? '▼' : '▶'}
                </span>
              </div>
              
              {extractsExpanded && (
                <>
                  {savedExtracts.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-lg">
                      <HighlighterIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No extracts yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select text and click "Create Extract"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedExtracts.map((extract, index) => (
                        <div
                          key={index}
                          className="p-3 bg-muted/50 hover:bg-muted rounded-lg border border-border group transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground line-clamp-3 mb-2">
                                {extract.content}
                              </p>
                              {extract.note && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 bg-background/50 p-1.5 rounded">
                                  {extract.note}
                                </p>
                              )}
                              {extract.tags && extract.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {extract.tags.map((tag) => (
                                    <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(extract.timestamp)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleViewExtract(extract)}
                                className="p-1.5 hover:bg-background rounded transition-colors"
                                title="View extract"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExtract(index)}
                                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                                title="Delete extract"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bookmarks Section */}
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-primary" />
                Bookmarks
              </h3>
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bookmark, index) => (
                    <button
                      key={index}
                      onClick={() => handleNavigate(bookmark)}
                      className="block w-full text-left px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm text-foreground truncate transition-colors"
                    >
                      {bookmark}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browser Content */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: '200px' }}>
          {!currentUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="text-center max-w-md p-8">
                <div className="text-6xl mb-4">🌐</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Web Browser
                </h2>
                <p className="text-muted-foreground mb-6">
                  Enter a URL above to browse the web and create extracts from any content.
                </p>
                <div className="bg-card border border-border rounded-lg p-4 text-left">
                  <p className="font-medium text-foreground mb-3">How to create extracts:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Navigate to any website</li>
                    <li>Select text you want to save</li>
                    <li>Click "Create Extract" or press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Shift+E</kbd></li>
                    <li>Add notes and tags, then save</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                </div>
              )}
              {webviewError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
                  <div className="text-center max-w-md px-4">
                    <p className="text-sm text-destructive mb-2">{webviewError}</p>
                    <button
                      onClick={handleOpenInBrowser}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Browser
                    </button>
                  </div>
                </div>
              )}
              {!isTauri() && iframeStatus === "blocked" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-50">
                  <div className="text-center max-w-md px-4 space-y-3">
                    <p className="text-sm text-foreground font-semibold">
                      This site prevents embedding in an iframe.
                    </p>
                    <button
                      onClick={handleOpenInBrowser}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Browser
                    </button>
                  </div>
                </div>
              )}
              <div ref={webviewContainerRef} className="absolute inset-0 w-full h-full">
                {!isTauri() && currentUrl && (
                  <iframe
                    key={`${currentUrl}-${refreshToken}`}
                    ref={iframeRef}
                    src={currentUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    title="Web Browser"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Assistant Panel */}
        {showAssistant && (
          <AssistantPanel
            context={assistantContext}
            className="flex-shrink-0 border-l-4 border-primary w-96"
          />
        )}
      </div>

      {/* Extract Dialog */}
      {extractDialog && (
        <ExtractDialog
          extract={extractDialog}
          onSave={handleSaveExtract}
          onClose={() => setExtractDialog(null)}
        />
      )}
    </div>
  );
}
