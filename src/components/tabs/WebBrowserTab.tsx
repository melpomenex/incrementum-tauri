import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
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

interface WebExtract {
  content: string;
  url: string;
  pageTitle: string;
  timestamp: number;
}

interface ExtractDialogProps {
  extract: WebExtract;
  onSave: (data: { content: string; note: string; tags: string[] }) => void;
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
    onSave({ content: extract.content, note, tags });
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
            </label>
            <div className="p-3 bg-muted rounded-lg text-sm text-foreground max-h-40 overflow-y-auto">
              {extract.content}
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
                  className={`w-8 h-8 rounded-full ${c.bg} ${
                    color === c.name ? "ring-2 ring-primary ring-offset-2" : ""
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

export function WebBrowserTab() {
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
  const [showAssistant, setShowAssistant] = useState(true);

  const assistantContext = useMemo<AssistantContext>(() => {
    return currentUrl ? { type: "web", url: currentUrl } : { type: "web" };
  }, [currentUrl]);

  const webviewRef = useRef<Webview | null>(null);
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
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setUrl(url);
    }
  };

  const handleRefresh = () => {
    if (currentUrl) {
      setRefreshToken((token) => token + 1);
    }
  };

  const handleOpenInBrowser = async () => {
    if (currentUrl) {
      try {
        await openUrl(currentUrl);
      } catch (error) {
        console.error("Error opening URL:", error);
      }
    }
  };

  const handleAddBookmark = () => {
    if (currentUrl && !bookmarks.includes(currentUrl)) {
      setBookmarks([...bookmarks, currentUrl]);
    }
  };

  const handleCreateExtract = useCallback(() => {
    // For webview, we need to get selected text through JavaScript injection
    // This is a placeholder - actual implementation depends on Tauri webview APIs
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      setExtractDialog({
        content: selectedText,
        url: currentUrl,
        pageTitle: pageTitle,
        timestamp: Date.now(),
      });
    }
  }, [currentUrl, pageTitle]);

  const handleSaveExtract = async (data: { content: string; note: string; tags: string[] }) => {
    try {
      // First, create a document for this web page if it doesn't exist
      const docId = `web-${Date.now()}`;

      // Create the extract
      const extractInput: CreateExtractInput = {
        document_id: docId,
        content: data.content,
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
          url: extractDialog?.url || currentUrl,
          pageTitle: extractDialog?.pageTitle || pageTitle,
          timestamp: Date.now(),
        },
      ]);

      // Show success notification
      console.log("Extract saved successfully!");
    } catch (error) {
      console.error("Error saving extract:", error);
    }
  };

  const updateWebviewBounds = useCallback(async () => {
    if (!webviewRef.current || !webviewContainerRef.current) return;

    const rect = webviewContainerRef.current.getBoundingClientRect();
    const width = Math.max(0, Math.floor(rect.width));
    const height = Math.max(0, Math.floor(rect.height));
    const x = Math.floor(rect.left);
    const y = Math.floor(rect.top);

    await webviewRef.current.setPosition(new LogicalPosition(x, y));
    await webviewRef.current.setSize(new LogicalSize(width, height));

    console.log("Webview bounds update:", { 
      x, y, width, height, 
      windowHeight: window.innerHeight,
      rectTop: rect.top,
      rectHeight: rect.height
    });
  }, []);

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

      const existing = await Webview.getByLabel("web-browser");
      if (existing) {
        await existing.close().catch(() => undefined);
      }

      if (!webviewContainerRef.current || !isMountedRef.current || isCancelled) {
        setIsLoading(false);
        return;
      }

      try {
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

        const rect = webviewContainerRef.current.getBoundingClientRect();
        const width = Math.max(0, Math.floor(rect.width));
        const height = Math.max(0, Math.floor(rect.height));
        const x = Math.floor(rect.left);
        const y = Math.floor(rect.top);

        console.log("Creating webview with bounds:", {
          url: currentUrl,
          x,
          y,
          width,
          height,
        });

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
        void webview.once("tauri://created", async () => {
          if (!isCancelled) {
            void updateWebviewBounds();
            setIsLoading(false);
          }
        });

        void webview.once("tauri://error", (event: any) => {
          if (!isCancelled) {
            console.error("Webview creation failed:", event);
            setIsLoading(false);
            const errorMessage = event.payload?.message || event?.error?.message || String(event);
            setWebviewError(`Failed to load the page in the native webview: ${errorMessage}`);
          }
        });
      } catch (error) {
        console.error("Exception creating webview:", error);
        if (!isCancelled) {
          setIsLoading(false);
          setWebviewError(`Exception: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    // Small delay to ensure container is ready
    const timeoutId = setTimeout(() => {
      void createWebview();
    }, 100);

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

  useEffect(() => {
    return () => {
      if (webviewRef.current) {
        void webviewRef.current.close();
        webviewRef.current = null;
      }

      void Webview.getByLabel("web-browser")
        .then((existing) => existing?.close())
        .catch(() => undefined);
    };
  }, []);

  // Load bookmarks from localStorage on mount
  useState(() => {
    const saved = localStorage.getItem("web-browser-bookmarks");
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }

    const savedExtractsData = localStorage.getItem("web-browser-extracts");
    if (savedExtractsData) {
      setSavedExtracts(JSON.parse(savedExtractsData));
    }
  });

  // Save bookmarks to localStorage when they change
  useState(() => {
    localStorage.setItem("web-browser-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

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
            onClick={() => setShowAssistant((prev) => !prev)}
            className="p-2 rounded hover:bg-muted transition-colors"
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
              title="Create extract from selected text"
            >
              <HighlighterIcon className="w-4 h-4" />
              Create Extract
            </button>
            <span className="text-xs text-muted-foreground">
              Select text on the page, then click to create an extract or flashcard
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

        {/* Browser Content */}
        <div className="flex-1 relative overflow-hidden">
          {!currentUrl ? (
            <div className="h-full flex items-center justify-center">
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
              <div ref={webviewContainerRef} className="absolute inset-0" />
            </>
          )}
        </div>

        {/* Assistant Panel */}
        {showAssistant && (
          <AssistantPanel
            context={assistantContext}
            className="flex-shrink-0"
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
