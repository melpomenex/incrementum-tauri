import { useState, useRef, useCallback, useEffect, useMemo } from "react";
// Dynamic imports or helpers to prevent PWA crash
// import { openUrl } from "@tauri-apps/plugin-opener";
// import { getCurrentWindow } from "@tauri-apps/api/window";
// import { Webview } from "@tauri-apps/api/webview";
// import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
// import { invoke } from "@tauri-apps/api/core";
import { invokeCommand, isTauri } from "../../lib/tauri";
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
} from "lucide-react";
import { createExtract, type CreateExtractInput } from "../../api/extracts";
import { createLearningItem, type CreateLearningItemInput } from "../../api/learning-items";
import { AssistantPanel, type AssistantContext } from "../assistant/AssistantPanel";
import { useToast } from "../common/Toast";

// Type definitions for lazy loading
type WebviewType = import("@tauri-apps/api/webview").Webview; // Instance type


interface WebExtract {
  /** Plain text content */
  content: string;
  /** Rich HTML content with inline styles for visual fidelity */
  htmlContent?: string;
  url: string;
  pageTitle: string;
  timestamp: number;
}

interface ExtractDialogProps {
  extract: WebExtract;
  onSave: (data: { content: string; htmlContent?: string; note: string; tags: string[] }) => void;
  onClose: () => void;
}

function ExtractDialog({ extract, onSave, onClose }: ExtractDialogProps) {
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [color, setColor] = useState("yellow");
  const [isGenerating, setIsGenerating] = useState(false);

  const colors = [
    { name: "yellow", value: "#fef08a", bg: "bg-yellow-200" },
    { name: "green", value: "#bbf7d0", bg: "bg-green-200" },
    { name: "blue", value: "#bfdbfe", bg: "bg-blue-200" },
    { name: "purple", value: "#e9d5ff", bg: "bg-purple-200" },
    { name: "red", value: "#fecaca", bg: "bg-red-200" },
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
    onSave({ content: extract.content, htmlContent: extract.htmlContent, note, tags });
    onClose();
  };

  const handleCreateFlashcard = async () => {
    setIsGenerating(true);
    try {
      // Create a Q&A item from the extract
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <HighlighterIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Create Extract</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Selected Content
              {extract.htmlContent && (
                <span className="ml-2 text-xs text-primary font-normal">
                  (Rich formatting preserved)
                </span>
              )}
            </label>
            <div className="p-3 bg-muted rounded-lg text-sm text-foreground max-h-40 overflow-y-auto">
              {extract.htmlContent ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: extract.htmlContent }}
                />
              ) : (
                extract.content
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your notes about this extract..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
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
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Highlight Color
            </label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`w-8 h-8 rounded-full ${c.bg} ${color === c.name ? "ring-2 ring-primary ring-offset-2" : ""
                    } transition-all`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleSaveAsExtract}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <BookmarkPlus className="w-4 h-4" />
            Save as Extract
          </button>
          <button
            onClick={handleCreateFlashcard}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Creating..." : "Create Flashcard"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to detect if we're on Linux (WebKitGTK has different coordinate system)
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

  // Debug logging for assistant toggle
  const handleToggleAssistant = () => {
    const newState = !showAssistant;
    console.log('[WebBrowserTab] Toggling assistant:', { from: showAssistant, to: newState });
    setShowAssistant(newState);
  };
  const [iframeStatus, setIframeStatus] = useState<"idle" | "loading" | "loaded" | "blocked">("idle");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeTimeoutRef = useRef<number | null>(null);

  const assistantContext = useMemo<AssistantContext>(() => {
    return currentUrl ? { type: "web", url: currentUrl } : { type: "web" };
  }, [currentUrl]);

  const webviewRef = useRef<WebviewType | null>(null);
  const webviewHostRef = useRef<HTMLDivElement | null>(null);
  const webviewContainerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  const handleNavigate = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) return;

    // Add protocol if missing
    let formattedUrl = inputUrl;
    if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
      // Check if it's a search query
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

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Try to get page title (will be updated by webview)
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
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const href = iframe.contentWindow?.location?.href;
      if (href === "about:blank") {
        setIframeStatus("blocked");
        return;
      }

      // Inject script to handle extract requests (works for same-origin iframes)
      try {
        if (iframe.contentWindow && iframe.contentDocument) {
          const script = iframe.contentDocument.createElement('script');
          script.textContent = `
            (function() {
              window.addEventListener('message', function(event) {
                if (event.data.type === 'incrementum-get-selection' &&
                    event.data.source === 'incrementum-web-browser') {
                  const selection = window.getSelection()?.toString() || '';
                  event.source.postMessage({
                    type: 'incrementum-selection-response',
                    selection: selection
                  }, event.origin);
                }
              });
            })();
          `;
          iframe.contentDocument.head.appendChild(script);
        }
      } catch (scriptError) {
        // Script injection failed (likely cross-origin)
        console.log("Could not inject script into iframe:", scriptError);
      }
    } catch {
      // Cross-origin access errors are expected and not actionable here.
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeStatus("blocked");
  };

  const handleAddBookmark = () => {
    if (currentUrl && !bookmarks.includes(currentUrl)) {
      setBookmarks([...bookmarks, currentUrl]);
    }
  };

  const handleCreateExtract = useCallback(() => {
    if (isTauri()) {
      // Tauri webview mode: get selection through JavaScript injection
      const selection = window.getSelection();
      const selectedText = selection?.toString();

      if (selectedText) {
        let htmlContent: string | undefined;

        // Try to capture HTML content with computed styles for visual fidelity
        if (selection && selection.rangeCount > 0) {
          try {
            const range = selection.getRangeAt(0);
            const fragment = range.cloneContents();

            // Create a temporary container to serialize the HTML
            const tempDiv = document.createElement("div");
            tempDiv.appendChild(fragment);

            // Inline computed styles for all elements to preserve visual appearance
            const elements = tempDiv.querySelectorAll("*");
            elements.forEach((el) => {
              if (el instanceof HTMLElement) {
                const computed = window.getComputedStyle(el);
                // Capture essential styling properties
                const essentialStyles = [
                  "font-family",
                  "font-size",
                  "font-weight",
                  "font-style",
                  "line-height",
                  "color",
                  "background-color",
                  "text-decoration",
                  "text-align",
                  "margin",
                  "padding",
                  "border",
                  "border-radius",
                  "display",
                  "list-style-type",
                ];

                const inlineStyles = essentialStyles
                  .map((prop) => {
                    const value = computed.getPropertyValue(prop);
                    // Skip default/empty values
                    if (value && value !== "none" && value !== "normal" && value !== "0px") {
                      return `${prop}: ${value}`;
                    }
                    return null;
                  })
                  .filter(Boolean)
                  .join("; ");

                if (inlineStyles) {
                  el.setAttribute("style", inlineStyles);
                }
              }
            });

            htmlContent = tempDiv.innerHTML;
          } catch (e) {
            console.warn("Could not capture HTML content:", e);
          }
        }

        setExtractDialog({
          content: selectedText,
          htmlContent,
          url: currentUrl,
          pageTitle: pageTitle,
          timestamp: Date.now(),
        });
      } else {
        toast.error("Please select some text first");
      }
    } else {
      // PWA/Web mode: use postMessage to communicate with iframe
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) {
        toast.error("No browser content available");
        return;
      }

      try {
        // Send a message to the iframe requesting the selection
        iframe.contentWindow.postMessage({
          type: 'incrementum-get-selection',
          source: 'incrementum-web-browser'
        }, '*');

        // Set up a one-time listener for the response
        const messageHandler = (event: MessageEvent) => {
          // Verify the message is from the iframe
          if (event.source !== iframe.contentWindow) return;

          if (event.data.type === 'incrementum-selection-response') {
            window.removeEventListener('message', messageHandler);

            if (event.data.selection) {
              setExtractDialog({
                content: event.data.selection,
                url: currentUrl,
                pageTitle: pageTitle,
                timestamp: Date.now(),
              });
            } else {
              toast.error("Please select some text first");
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Timeout after 2 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
        }, 2000);

      } catch (error) {
        console.error("Failed to communicate with iframe:", error);

        // Check if it's a cross-origin issue
        const iframeOrigin = new URL(currentUrl).origin;
        const parentOrigin = window.location.origin;

        if (iframeOrigin !== parentOrigin) {
          toast.error(
            `Cannot extract from ${iframeOrigin}. Try opening in system browser or import the URL as a document.`
          );
        } else {
          toast.error("Failed to get selection. Please try selecting text again.");
        }
      }
    }
  }, [currentUrl, pageTitle, toast]);

  const handleSaveExtract = async (data: { content: string; htmlContent?: string; note: string; tags: string[] }) => {
    try {
      // First, create a document for this web page if it doesn't exist
      const docId = `web-${Date.now()}`;

      // Create the extract with rich HTML content for visual fidelity
      const extractInput: CreateExtractInput = {
        document_id: docId,
        content: data.content,
        html_content: data.htmlContent,
        source_url: extractDialog?.url || currentUrl,
        note: data.note,
        tags: data.tags,
        color: "yellow",
      };

      await createExtract(extractInput);

      // Add to saved extracts
      setSavedExtracts([
        ...savedExtracts,
        {
          content: data.content,
          htmlContent: data.htmlContent,
          url: extractDialog?.url || currentUrl,
          pageTitle: extractDialog?.pageTitle || pageTitle,
          timestamp: Date.now(),
        },
      ]);

      toast.success("Extract created", "Saved from web page.");
    } catch (error) {
      console.error("Error saving extract:", error);
      toast.error("Failed to create extract");
    }
  };

  const updateWebviewBounds = useCallback(async () => {
    if (!webviewRef.current || !webviewContainerRef.current) return;

    // Use requestAnimationFrame to ensure layout is finalized
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        // Small additional delay to ensure flex layouts are calculated
        setTimeout(async () => {
          if (!webviewRef.current || !webviewContainerRef.current) {
            resolve();
            return;
          }

          // On Linux WebKitGTK, getBoundingClientRect() reports incorrect heights
          // because the webview is a native window using window-relative coordinates.
          // Use window-based calculations for reliable dimensions.
          
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const toolbarHeight = 140; // Approximate: top bar + address bar + extract bar
          
          // Use window-relative coordinates for the webview
          const x = 8; // Small margin from left
          const y = toolbarHeight;
          const width = windowWidth - 16; // Small margin on both sides
          const height = windowHeight - toolbarHeight - 10; // Bottom margin

          console.log(`Webview bounds (window-based): x=${x}, y=${y}, width=${width}, height=${height}, window=${windowWidth}x${windowHeight}`);

          // Only update if we have valid dimensions
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
        }, 50); // Reduced delay for faster response
      });
    });
  }, []);

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
      if (!isMountedRef.current || isCancelled) {
        return;
      }

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
          // PWA mode: do nothing, render iframe in render function
          setIsLoading(false);
          return;
        }

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { Webview } = await import("@tauri-apps/api/webview");

        const appWindow = getCurrentWindow();

        // Wait for window to be ready before creating webview
        await new Promise<void>((resolve) => {
          if (appWindow.label) {
            resolve();
          } else {
            appWindow.once("tauri://created", () => resolve());
          }
        });

        if (!webviewContainerRef.current || !isMountedRef.current || isCancelled) {
          return;
        }

        // On Linux WebKitGTK, getBoundingClientRect() reports incorrect heights
        // Use window-based calculations for reliable dimensions (same as updateWebviewBounds)
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const toolbarHeight = 140; // Approximate: top bar + address bar + extract bar
        
        const x = 8;
        const y = toolbarHeight;
        const width = windowWidth - 16;
        const height = windowHeight - toolbarHeight - 10;

        console.log(`Creating webview (window-based): x=${x}, y=${y}, width=${width}, height=${height}, url=${currentUrl}`);

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

        // Handle webview created event
        webview.once("tauri://created", async () => {
          console.log("Webview created event received");
          if (!isCancelled) {
            // Update bounds multiple times to catch layout changes
            await updateWebviewBounds();
            setIsLoading(false);
            console.log("Loading state cleared by tauri://created");
            // Additional bounds updates after layout settles
            setTimeout(() => void updateWebviewBounds(), 200);
            setTimeout(() => void updateWebviewBounds(), 500);
          }
        }).catch((e) => console.warn("Failed to attach created listener:", e));

        // Handle webview error event
        webview.once("tauri://error", (event: unknown) => {
          console.error("Webview error event received:", event);
          if (!isCancelled) {
            setIsLoading(false);
            const errorMessage = (event as any)?.payload?.message || (event as any)?.error?.message || String(event);
            setWebviewError(`Failed to load the page in the native webview: ${errorMessage}`);
          }
        }).catch((e) => console.warn("Failed to attach error listener:", e));

        // Fallback: if events don't fire within 3 seconds, clear loading anyway
        setTimeout(() => {
          if (!isCancelled && webviewRef.current === webview) {
            console.log("Fallback: clearing loading state after 3s timeout");
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

    // Delay to ensure container layout is fully rendered
    const timeoutId = setTimeout(() => {
      void createWebview();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [currentUrl, refreshToken, updateWebviewBounds]);

  useEffect(() => {
    if (!webviewContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      void updateWebviewBounds();
    });

    observer.observe(webviewContainerRef.current);
    return () => observer.disconnect();
  }, [updateWebviewBounds]);

  // Update webview bounds when assistant visibility changes
  useEffect(() => {
    // Small delay to allow layout animation to complete
    const timeoutId = setTimeout(() => {
      void updateWebviewBounds();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [showAssistant, updateWebviewBounds]);

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

  useEffect(() => {
    if (isTauri()) return;
    if (!currentUrl) {
      setIframeStatus("idle");
      return;
    }

    setIframeStatus("loading");
    if (iframeTimeoutRef.current) {
      window.clearTimeout(iframeTimeoutRef.current);
    }
    iframeTimeoutRef.current = window.setTimeout(() => {
      setIframeStatus((prev) => (prev === "loading" ? "blocked" : prev));
    }, 6000);

    return () => {
      if (iframeTimeoutRef.current) {
        window.clearTimeout(iframeTimeoutRef.current);
      }
    };
  }, [currentUrl, refreshToken]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("web-browser-bookmarks");
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }

    const savedExtractsData = localStorage.getItem("web-browser-extracts");
    if (savedExtractsData) {
      setSavedExtracts(JSON.parse(savedExtractsData));
    }
  }, []);

  // Save bookmarks to localStorage when they change
  useEffect(() => {
    localStorage.setItem("web-browser-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Keyboard shortcut handler for creating extracts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + E to create extract
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
      <div className="p-2 border-b border-border space-y-2 flex-shrink-0">
        {/* Navigation Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={!currentUrl}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Go
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleAddBookmark}
            disabled={!currentUrl || bookmarks.includes(currentUrl)}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 transition-colors"
            title="Add bookmark"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded hover:bg-muted transition-colors"
            title="Toggle sidebar"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleAssistant}
            className={`p-2 rounded transition-colors ${showAssistant ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Toggle assistant"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenInBrowser}
            disabled={!currentUrl}
            className="p-2 rounded hover:bg-muted disabled:opacity-50 transition-colors"
            title="Open in system browser"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Extract Actions Row */}
        {currentUrl && (
          <div className="flex items-center gap-2 pl-1">
            <button
              onClick={handleCreateExtract}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm flex items-center gap-2"
              title="Create extract from selected text (Ctrl/Cmd + Shift + E)"
            >
              <HighlighterIcon className="w-4 h-4" />
              Create Extract
            </button>
            <span className="text-xs text-muted-foreground">
              Select text on the page, then click button or press Ctrl/Cmd+Shift+E
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Bookmarks & Extracts */}
        {showSidebar && (
          <div className="w-80 border-r border-border bg-card overflow-y-auto">
            {/* Bookmarks Section */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4" />
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

            {/* Extracts Section */}
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <HighlighterIcon className="w-4 h-4" />
                Recent Extracts
              </h3>
              {savedExtracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No extracts yet</p>
              ) : (
                <div className="space-y-3">
                  {savedExtracts.map((extract, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-lg text-sm"
                    >
                      <div className="font-medium text-foreground mb-1">
                        {extract.pageTitle}
                      </div>
                      <div className="text-muted-foreground text-xs mb-2">
                        {extract.url}
                      </div>
                      <div className="text-foreground line-clamp-2">
                        {extract.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browser Content - fills remaining space */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: '200px' }}>
          {!currentUrl ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🌐</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Web Browser
                </h2>
                <p className="text-muted-foreground mb-4">
                  Enter a URL above to browse the web. You can select text to create extracts and flashcards.
                </p>
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Features:</p>
                  <ul className="text-left space-y-1">
                    <li>• Navigate websites</li>
                    <li>• Select text to create extracts</li>
                    <li>• Generate flashcards from content</li>
                    <li>• Bookmark important pages</li>
                    <li>• Open in external browser for full functionality</li>
                  </ul>
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
                    <p className="text-xs text-muted-foreground">
                      On Linux, this can happen if WebKit dependencies are missing.
                    </p>
                  </div>
                </div>
              )}
              {!isTauri() && iframeStatus === "blocked" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-50">
                  <div className="text-center max-w-md px-4 space-y-3">
                    <p className="text-sm text-foreground font-semibold">
                      This site prevents embedding in an iframe.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Open it in your system browser to view the page.
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
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
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
            className="flex-shrink-0 border-l-4 border-primary"
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
