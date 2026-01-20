import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText, List, Brain, Lightbulb, Search, X, Maximize, Minimize, Share2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDocumentStore, useTabsStore, useQueueStore } from "../../stores";
import { useSettingsStore } from "../../stores/settingsStore";
import { PDFViewer } from "./PDFViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { EPUBViewer } from "./EPUBViewer";
import { YouTubeViewer } from "./YouTubeViewer";
import { ExtractsList } from "../extracts/ExtractsList";
import { LearningCardsList } from "../learning/LearningCardsList";
import { useToast } from "../common/Toast";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";
import { QueueNavigationControls } from "../queue/QueueNavigationControls";
import { HoverRatingControls } from "../review/HoverRatingControls";
import { useQueueNavigation } from "../../hooks/useQueueNavigation";
import { cn } from "../../utils";
import * as documentsApi from "../../api/documents";
import { updateDocumentProgressAuto } from "../../api/documents";
import { rateDocument } from "../../api/algorithm";
import type { ReviewRating } from "../../api/review";
import { autoExtractWithCache, isAutoExtractEnabled } from "../../utils/documentAutoExtract";
import { generateShareUrl, copyShareLink, DocumentState, parseStateFromUrl } from "../../lib/shareLink";

type ViewMode = "document" | "extracts" | "cards";

type DocumentType = "pdf" | "epub" | "markdown" | "html" | "youtube";

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";

  // If it's already just an ID (11 chars), return as is
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Extract from various URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }

  return urlOrId; // Return as-is if no pattern matches
}

interface DocumentViewerProps {
  documentId: string;
  disableHoverRating?: boolean;
  onSelectionChange?: (selection: string) => void;
  onScrollPositionChange?: (state: { pageNumber: number; scrollPercent: number }) => void;
  initialViewMode?: ViewMode;
  onPdfContextTextChange?: (text: string) => void;
  contextPageWindow?: number;
}

export function DocumentViewer({
  documentId,
  disableHoverRating = false,
  onSelectionChange,
  onScrollPositionChange,
  initialViewMode,
  onPdfContextTextChange,
  contextPageWindow,
}: DocumentViewerProps) {
  const toast = useToast();
  const { documents, setCurrentDocument, currentDocument } = useDocumentStore();
  const { closeTab, tabs, updateTab } = useTabsStore();
  const { items: queueItems, loadQueue } = useQueueStore();
  const { settings } = useSettingsStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-width" | "fit-page">("fit-width");
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagesRendered, setPagesRendered] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode ?? "document");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ocrContextText, setOcrContextText] = useState<string | null>(null);
  const [suppressPdfAutoScroll, setSuppressPdfAutoScroll] = useState(false);
  const restoreScrollAttemptsRef = useRef(0);
  const restoreScrollTimeoutRef = useRef<number | null>(null);
  const restoreScrollDoneRef = useRef(false);
  const scrollSaveTimeoutRef = useRef<number | null>(null);
  const lastScrollStateRef = useRef<{
    pageNumber: number;
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    scrollPercent: number;
  } | null>(null);
  const lastScrollMetaRef = useRef<{ storageKey?: string; documentId?: string | null } | null>(null);
  const skipStoredScrollRef = useRef(false);

  const scrollStorageKey = currentDocument?.id
    ? `document-scroll-position:${currentDocument.id}`
    : undefined;

  // Infer fileType from filePath if it's missing (legacy data or import issue)
  const inferFileType = (doc?: typeof currentDocument): DocumentType => {
    if (!doc) return "other";
    if (doc.fileType && doc.fileType !== "other") {
      return doc.fileType as DocumentType;
    }
    // Fallback: infer from file extension
    const ext = doc.filePath?.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "epub") return "epub";
    if (ext === "md" || ext === "markdown") return "markdown";
    if (ext === "html" || ext === "htm") return "html";
    // Check if filePath is a YouTube URL or ID
    if (doc.filePath?.includes("youtube.com") ||
      doc.filePath?.includes("youtu.be") ||
      doc.fileType === "youtube") {
      return "youtube";
    }
    // If document has content, treat as markdown
    if (doc.content) {
      return "markdown";
    }
    return "other";
  };

  const docType = inferFileType(currentDocument);

  useEffect(() => {
    lastScrollMetaRef.current = { storageKey: scrollStorageKey, documentId: currentDocument?.id ?? null };
  }, [scrollStorageKey, currentDocument?.id]);

  // Extract creation state
  const [selectedText, setSelectedText] = useState("");
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const lastSelectionRef = useRef("");
  const lastDocumentIdRef = useRef<string | null>(null);
  const lastLoadedDocumentIdRef = useRef<string | null>(null); // Track successfully loaded documents

  const updateSelection = useCallback((rawText: string | null | undefined) => {
    const text = rawText?.trim() ?? "";
    if (text && text.length > 0 && text.length < 1000) {
      setSelectedText(text);
      lastSelectionRef.current = text;
    } else {
      setSelectedText("");
    }
  }, []);

  const persistScrollState = useCallback(
    (
      state: {
        pageNumber: number;
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
        scrollPercent: number;
      },
      override?: { storageKey?: string; documentId?: string | null; updatedAt?: number }
    ) => {
      const storageKey = override?.storageKey ?? scrollStorageKey;
      if (!storageKey) return;
      const payload = {
        pageNumber: state.pageNumber,
        scrollPercent: state.scrollPercent,
        scrollTop: state.scrollTop,
        scrollHeight: state.scrollHeight,
        clientHeight: state.clientHeight,
        updatedAt: override?.updatedAt ?? Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      const docId = override?.documentId ?? currentDocument?.id;
      if (docId) {
        updateDocumentProgressAuto(docId, state.pageNumber, state.scrollPercent, null)
          .catch((error) => console.warn("Failed to save document progress:", error));
      }
    },
    [scrollStorageKey, currentDocument?.id]
  );

  const handleScrollPositionChange = useCallback(
    (state: {
      pageNumber: number;
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
      scrollPercent: number;
    }) => {
      lastScrollStateRef.current = state;
      onScrollPositionChange?.({
        pageNumber: state.pageNumber,
        scrollPercent: state.scrollPercent,
      });

      if (!scrollStorageKey) return;
      if (scrollSaveTimeoutRef.current !== null) return;

      scrollSaveTimeoutRef.current = window.setTimeout(() => {
        scrollSaveTimeoutRef.current = null;
        persistScrollState(state);
      }, 500);
    },
    [onScrollPositionChange, scrollStorageKey, persistScrollState]
  );

  // Timer for tracking reading time
  const startTimeRef = useRef(Date.now());

  // Queue navigation
  const queueNav = useQueueNavigation();

  const loadDocumentData = useCallback(async (doc: typeof currentDocument) => {
    if (!doc) return;

    setIsLoading(true);

    // Infer fileType from filePath if missing (handles empty string or undefined)
    const ext = doc.filePath?.split('.').pop()?.toLowerCase();
    const inferredType = doc.fileType || ext || "";
    const needsFileData = inferredType === "pdf" || inferredType === "epub";

    console.log("[DocumentViewer] loadDocumentData:", {
      fileType: doc.fileType,
      filePath: doc.filePath,
      ext,
      inferredType,
      needsFileData,
    });

    if (needsFileData) {
      setFileData(null);
      try {
        // Read file through Tauri backend instead of fetch
        const base64Data = await documentsApi.readDocumentFile(doc.filePath);

        // Convert base64 to bytes for viewer consumption
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log("[DocumentViewer] File data loaded successfully, size:", bytes.byteLength);
        setFileData(bytes);
      } catch (error) {
        console.error(`Failed to load ${inferredType}:`, error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    // Auto-extract content if enabled
    if (isAutoExtractEnabled() && doc.filePath) {
      try {
        console.log("[DocumentViewer] Auto-extracting content...");
        const extractionResult = await autoExtractWithCache(
          doc.id,
          doc.filePath,
          inferredType
        );

        // Store extraction result for use in the UI
        if (extractionResult.text || extractionResult.keyPhrases.length > 0) {
          console.log("[DocumentViewer] Extraction result:", {
            textLength: extractionResult.text.length,
            keyPhrases: extractionResult.keyPhrases.length,
            mathExpressions: extractionResult.mathExpressions.length,
            ocrUsed: extractionResult.ocrUsed,
          });
        }
        if (extractionResult.ocrUsed && extractionResult.text) {
          setOcrContextText(extractionResult.text);
        }
      } catch (error) {
        console.error("[DocumentViewer] Auto-extract failed:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!documentId) return;

    setOcrContextText(null);

    // Only reload if documentId actually changed, OR if we haven't successfully loaded this document yet
    const shouldLoad = documentId !== lastDocumentIdRef.current ||
      documentId !== lastLoadedDocumentIdRef.current;

    if (shouldLoad) {
      lastDocumentIdRef.current = documentId;

      // Reset timer when document changes
      startTimeRef.current = Date.now();

      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        setCurrentDocument(doc);
        loadDocumentData(doc);
        lastLoadedDocumentIdRef.current = documentId; // Mark as successfully loaded
      } else {
        documentsApi.getDocument(documentId)
          .then((fetched) => {
            if (!fetched) return;
            setCurrentDocument(fetched);
            loadDocumentData(fetched);
            lastLoadedDocumentIdRef.current = documentId;
          })
          .catch((error) => {
            console.error("Failed to load document by id:", error);
          });
      }
    }
  }, [documentId, documents, setCurrentDocument, loadDocumentData]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
      return;
    }
    setViewMode("document");
  }, [documentId, initialViewMode]);

  // Parse URL fragment and restore state after document is loaded
  useEffect(() => {
    if (!currentDocument || !documentId) return;

    skipStoredScrollRef.current = false;
    const state = parseStateFromUrl();
    skipStoredScrollRef.current = state.scroll !== undefined;

    // Restore page number from fragment
    if (state.pos !== undefined) {
      setPageNumber(state.pos);
    }

    // Restore scroll position from fragment
    if (state.scroll !== undefined) {
      // Scroll to percentage position
      setTimeout(() => {
        const scrollableElement = document.querySelector('[data-document-scroll-container]');
        if (scrollableElement) {
          const scrollHeight = scrollableElement.scrollHeight - scrollableElement.clientHeight;
          const targetScroll = (state.scroll / 100) * scrollHeight;
          scrollableElement.scrollTop = targetScroll;
        } else {
          // Fallback to window scroll
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          const targetScroll = (state.scroll / 100) * scrollHeight;
          window.scrollTo(0, targetScroll);
        }
      }, 100);
    }

    // TODO: Restore highlights and extracts from fragment IDs
    // This would require loading the specific highlights/extracts and displaying them
    // For now, we just parse the state but don't restore highlights/extracts
    if (state.highlights || state.extracts) {
      console.log('[DocumentViewer] Shared state contains highlights/extracts:', state);
    }
  }, [currentDocument, documentId]);

  // Restore scroll position for this document
  useEffect(() => {
    restoreScrollDoneRef.current = false;
    restoreScrollAttemptsRef.current = 0;
    setPagesRendered(false);
    if (restoreScrollTimeoutRef.current !== null) {
      clearTimeout(restoreScrollTimeoutRef.current);
      restoreScrollTimeoutRef.current = null;
    }
  }, [currentDocument?.id, viewMode]);

  useEffect(() => {
    if (viewMode !== "document") return;
    if (isLoading) return;
    if (!pagesRendered) return;
    if (!scrollStorageKey) return;
    if (restoreScrollDoneRef.current) return;
    if (skipStoredScrollRef.current) return;

    const stored = localStorage.getItem(scrollStorageKey);
    if (!stored && typeof currentDocument?.currentScrollPercent !== "number") {
      return;
    }

    let parsed: { scrollPercent?: number; pageNumber?: number; updatedAt?: number } | null = null;
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = null;
      }
    }
    const remoteUpdatedAt = currentDocument?.dateModified
      ? new Date(currentDocument.dateModified).getTime()
      : 0;
    const localUpdatedAt = parsed?.updatedAt ?? 0;
    const hasRemoteProgress = typeof currentDocument?.currentScrollPercent === "number";

    if ((hasRemoteProgress && remoteUpdatedAt > localUpdatedAt) || !parsed) {
      parsed = hasRemoteProgress
        ? {
          scrollPercent: currentDocument.currentScrollPercent,
          pageNumber: currentDocument.currentPage ?? undefined,
          updatedAt: remoteUpdatedAt || Date.now(),
        }
        : null;
    }
    if (!parsed) return;

    if (docType === "pdf") {
      setSuppressPdfAutoScroll(true);
    }

    if (typeof parsed.pageNumber === "number" && parsed.pageNumber > 0) {
      setPageNumber(parsed.pageNumber);
    }

    const tryRestore = () => {
      const container = document.querySelector(
        "[data-document-scroll-container]"
      ) as HTMLElement | null;
      if (!container) {
        restoreScrollAttemptsRef.current += 1;
      } else {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        let targetScroll: number | null = null;
        if (typeof parsed?.scrollTop === "number") {
          targetScroll = Math.min(Math.max(0, parsed.scrollTop), maxScroll);
        } else if (maxScroll > 0 && typeof parsed?.scrollPercent === "number") {
          targetScroll = (parsed.scrollPercent / 100) * maxScroll;
        }
        if (targetScroll !== null) {
          container.scrollTop = targetScroll;
          restoreScrollDoneRef.current = true;
          if (docType === "pdf") {
            setSuppressPdfAutoScroll(false);
          }
          return;
        }
        restoreScrollAttemptsRef.current += 1;
      }

      if (restoreScrollAttemptsRef.current < 6) {
        restoreScrollTimeoutRef.current = window.setTimeout(tryRestore, 200);
      } else if (docType === "pdf") {
        setSuppressPdfAutoScroll(false);
      }
    };

    tryRestore();
  }, [isLoading, pagesRendered, scrollStorageKey, viewMode, currentDocument?.currentScrollPercent, currentDocument?.currentPage, docType]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    return () => {
      if (restoreScrollTimeoutRef.current !== null) {
        clearTimeout(restoreScrollTimeoutRef.current);
      }
      if (scrollSaveTimeoutRef.current !== null) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
      const lastState = lastScrollStateRef.current;
      const lastMeta = lastScrollMetaRef.current;
      if (lastState && lastMeta?.storageKey) {
        // Save directly using refs to avoid stale closure issues on unmount
        // The persistScrollState callback may reference old document IDs
        const payload = {
          pageNumber: lastState.pageNumber,
          scrollPercent: lastState.scrollPercent,
          scrollTop: lastState.scrollTop,
          scrollHeight: lastState.scrollHeight,
          clientHeight: lastState.clientHeight,
          updatedAt: Date.now(),
        };
        localStorage.setItem(lastMeta.storageKey, JSON.stringify(payload));
        if (lastMeta.documentId) {
          updateDocumentProgressAuto(lastMeta.documentId, lastState.pageNumber, lastState.scrollPercent, null)
            .catch((error) => console.warn("Failed to save document progress on cleanup:", error));
        }
      }
    };
  }, []);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      updateSelection(selection?.toString());
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [updateSelection]);

  useEffect(() => {
    onSelectionChange?.(selectedText);
  }, [selectedText, onSelectionChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if ((e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      // F11 for fullscreen toggle
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }

      // Ctrl/Cmd + F for search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(!showSearch);
      }

      // Arrow keys for navigation when in document mode
      if (viewMode === "document") {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          handlePrevPage();
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          handleNextPage();
        }
      }

      // Escape to close dialogs or exit fullscreen
      if (e.key === "Escape") {
        if (showSearch) setShowSearch(false);
        if (isExtractDialogOpen) {
          setIsExtractDialogOpen(false);
          setSelectedText("");
        }
        if (isFullscreen) {
          toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, showSearch, isExtractDialogOpen, isFullscreen]);

  const handlePrevPage = () => {
    if (currentDocument && currentDocument.totalPages) {
      setPageNumber((prev) => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (currentDocument && currentDocument.totalPages) {
      setPageNumber((prev) => Math.min(currentDocument.totalPages!, prev + 1));
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handleZoomIn = () => {
    setZoomMode("custom");
    setScale((prev) => Math.min(3.0, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomMode("custom");
    setScale((prev) => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = () => {
    setZoomMode("custom");
    setScale(1.0);
  };

  const handleZoomModeChange = (mode: "custom" | "fit-width" | "fit-page") => {
    setZoomMode(mode);
  };

  // Handle PDF/EPUB load
  const handleDocumentLoad = useCallback((numPages: number, outline: any[] = []) => {
    // Update document with page count if needed
    console.log("Document loaded:", numPages, "pages", outline.length, "outline items");
  }, []);

  const handlePdfContextTextChange = useCallback(
    (text: string) => {
      if (!onPdfContextTextChange) return;
      const preferOcr = settings.documents.ocr.autoOCR || settings.documents.ocr.autoExtractOnLoad;
      if (preferOcr && ocrContextText) {
        onPdfContextTextChange(ocrContextText);
        return;
      }
      onPdfContextTextChange(text);
    },
    [onPdfContextTextChange, ocrContextText, settings.documents.ocr.autoOCR, settings.documents.ocr.autoExtractOnLoad]
  );

  // Handle extract creation
  const handleExtractCreated = () => {
    // Navigate to extracts tab to show the new extract
    setViewMode("extracts");
  };

  const openExtractDialog = () => {
    const selection = window.getSelection()?.toString().trim();
    const selectionText = selection || lastSelectionRef.current;
    if (selectionText) {
      setSelectedText(selectionText);
    }
    setIsExtractDialogOpen(true);
  };

  // Handle search
  const handleSearch = () => {
    // TODO: Implement actual document search
    console.log("Searching for:", searchQuery);
  };

  const toggleFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      if (isFullscreen) {
        await appWindow.setFullscreen(false);
        setIsFullscreen(false);
      } else {
        await appWindow.setFullscreen(true);
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  // Handle rating from keyboard shortcuts
  const handleRating = async (rating: ReviewRating) => {
    try {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      console.log(`DocumentViewer: Rating document ${documentId} as ${rating} (time: ${timeTaken}s)`);

      await rateDocument(documentId, rating, timeTaken);

      // Reset timer
      startTimeRef.current = Date.now();

      const documentQueueItems = queueItems.filter((item) => item.itemType === "document");
      const currentIndex = documentQueueItems.findIndex((item) => item.documentId === documentId);
      const nextItem = currentIndex >= 0 ? documentQueueItems[currentIndex + 1] : undefined;

      if (nextItem) {
        const nextDoc = documents.find((doc) => doc.id === nextItem.documentId);
        const currentTab = tabs.find((tab) => tab.data?.documentId === documentId);

        if (currentTab && nextDoc) {
          updateTab(currentTab.id, {
            title: nextItem.documentTitle,
            icon:
              nextDoc.fileType === "pdf"
                ? "📕"
                : nextDoc.fileType === "epub"
                  ? "📖"
                  : nextDoc.fileType === "youtube"
                    ? "📺"
                    : "📄",
            data: { ...currentTab.data, documentId: nextItem.documentId },
          });
        }
      } else {
        console.log("No next document in queue.");
      }
    } catch (error) {
      console.error("Failed to rate document:", error);
    }
  };

  // Handle back button - close the current tab
  const handleBack = () => {
    const currentTab = tabs.find(t => t.data?.documentId === documentId);
    if (currentTab) {
      closeTab(currentTab.id);
    }
  };

  // Share document with current reading position
  const handleShare = async () => {
    if (!currentDocument) return;

    // Build the document state with current position
    const state: DocumentState = {};

    // Add page position for documents
    if (pageNumber && docType !== 'youtube') {
      state.pos = pageNumber;
    }

    // Add timestamp for YouTube videos
    if (docType === 'youtube') {
      // YouTube videos store position differently - would need to get from player
      // For now, we'll skip this as YouTubeViewer has its own share button
    }

    // Generate share URL
    const baseUrl = window.location.origin;
    const shareUrl = generateShareUrl(baseUrl, documentId, state);

    // Copy to clipboard with toast notification
    const success = await copyShareLink(shareUrl);
    if (success) {
      toast.success("Link copied!", "The document link has been copied to your clipboard.");
    } else {
      toast.error("Failed to copy", "Could not copy the link to clipboard.");
    }
  };

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Document not found</div>
      </div>
    );
  }

  const hasPageNavigation = docType === "pdf" || docType === "epub";

  console.log("[DocumentViewer] Render:", {
    docType,
    fileType: currentDocument.fileType,
    filePath: currentDocument.filePath,
    hasFileData: !!fileData,
    fileDataLength: fileData?.byteLength,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 rounded-md hover:bg-muted transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Back to Documents"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:block h-6 w-px bg-border" />
          <h2 className="font-semibold text-foreground line-clamp-1 max-w-[120px] sm:max-w-[200px] md:max-w-md text-sm md:text-base">
            {currentDocument.title}
          </h2>
          <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {docType.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-2 bg-muted rounded-md p-1">
              <input
                type="text"
                placeholder="Search in document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  } else if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
                className="flex-1 md:flex-none px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary md:w-64 min-h-[36px]"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-2 hover:bg-background rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              title="Search in document (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Create Extract Button (manual) */}
          <button
            onClick={openExtractDialog}
            className="p-2 rounded-md hover:bg-muted transition-colors text-primary"
            title="Create Extract"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-md hover:bg-muted transition-colors relative"
            title="Share document link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-md p-1 mr-2">
            <button
              onClick={() => setViewMode("document")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "document"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="View Document"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("extracts")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "extracts"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="View Extracts"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="View Learning Cards"
            >
              <Brain className="w-4 h-4" />
            </button>
          </div>

          {/* Queue Navigation Controls */}
          {viewMode === "document" && queueNav.totalDocuments > 0 && (
            <QueueNavigationControls
              currentDocumentIndex={queueNav.currentDocumentIndex}
              totalDocuments={queueNav.totalDocuments}
              hasMoreChunks={queueNav.canGoToNextChunk}
              onPreviousDocument={queueNav.goToPreviousDocument}
              onNextDocument={queueNav.goToNextDocument}
              onNextChunk={queueNav.goToNextChunk}
            />
          )}

          {/* Page Navigation and Zoom */}
          {hasPageNavigation && viewMode === "document" && (
            <>
              {docType === "pdf" && (
                <>
                  <button
                    onClick={handlePrevPage}
                    disabled={pageNumber <= 1}
                    className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    {currentDocument.totalPages
                      ? `Page ${pageNumber} of ${currentDocument.totalPages}`
                      : `Page ${pageNumber}`}
                  </span>

                  <button
                    onClick={handleNextPage}
                    disabled={
                      !currentDocument.totalPages || pageNumber >= (currentDocument.totalPages || 0)
                    }
                    className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              <div className="h-6 w-px bg-border mx-2" />

              {docType === "pdf" && (
                <>
                  {/* Zoom Mode Buttons */}
                  <button
                    onClick={() => handleZoomModeChange("fit-page")}
                    className={cn(
                      "p-2 rounded-md transition-colors text-xs",
                      zoomMode === "fit-page" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                    title="Fit to Page"
                  >
                    Fit Page
                  </button>

                  <button
                    onClick={() => handleZoomModeChange("fit-width")}
                    className={cn(
                      "p-2 rounded-md transition-colors text-xs",
                      zoomMode === "fit-width" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                    title="Fit to Width"
                  >
                    Fit Width
                  </button>

                  <div className="h-6 w-px bg-border mx-2" />
                </>
              )}

              <button
                onClick={handleZoomOut}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetZoom}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Reset View"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="h-6 w-px bg-border mx-2" />

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  isFullscreen
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
                title={isFullscreen ? "Exit Fullscreen (F11 or Esc)" : "Enter Fullscreen (F11)"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-muted/30">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading document...</div>
          </div>
        ) : viewMode === "extracts" ? (
          <div className="p-6 bg-background h-full overflow-auto">
            <ExtractsList documentId={currentDocument.id} />
          </div>
        ) : viewMode === "cards" ? (
          <div className="p-6 bg-background h-full overflow-auto">
            <LearningCardsList documentId={currentDocument.id} />
          </div>
        ) : docType === "pdf" && fileData ? (
          <div className="h-full">
            <PDFViewer
              documentId={currentDocument.id}
              fileData={fileData}
              pageNumber={pageNumber}
              scale={scale}
              zoomMode={zoomMode}
              suppressAutoScroll={suppressPdfAutoScroll}
              onPageChange={handlePageChange}
              onLoad={handleDocumentLoad}
              onPagesRendered={() => setPagesRendered(true)}
              onScrollPositionChange={handleScrollPositionChange}
              contextPageWindow={contextPageWindow}
              onTextWindowChange={handlePdfContextTextChange}
            />
          </div>
        ) : docType === "epub" && fileData ? (
          <div className="h-full">
            <EPUBViewer
              fileData={fileData}
              fileName={currentDocument.title}
              documentId={currentDocument.id}
              onLoad={handleDocumentLoad}
              onSelectionChange={updateSelection}
            />
          </div>
        ) : docType === "markdown" ? (
          <div className="p-8 bg-background min-h-full mobile-reading-surface">
            <MarkdownViewer document={currentDocument} content={currentDocument.content} />
          </div>
        ) : docType === "html" ? (
          <div className="p-8 bg-background min-h-[500px] mobile-reading-surface">
            <h1 className="text-2xl font-bold mb-4 mobile-reading-title">{currentDocument.title}</h1>
            <div
              className="prose prose-sm max-w-none dark:prose-invert mobile-reading-prose"
              dangerouslySetInnerHTML={{ __html: currentDocument.content || "" }}
            />
          </div>
        ) : docType === "youtube" ? (
          <div className="h-full">
            <YouTubeViewer
              videoId={extractYouTubeId(currentDocument.filePath)}
              documentId={currentDocument.id}
              title={currentDocument.title}
              onLoad={handleDocumentLoad}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Preview not available
              </h3>
              <p className="text-muted-foreground">
                Document type '{docType}' preview is coming soon
                {docType !== "epub" && currentDocument.filePath?.endsWith(".epub") && " (fileType was empty, inferred from extension)"}
              </p>
              {docType === "epub" && !fileData && (
                <p className="text-sm text-orange-500 mt-2">
                  EPUB detected but fileData not loaded. Check console for errors.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for Extract Creation */}
      {selectedText && viewMode === "document" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-10">
          <button
            onClick={openExtractDialog}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity min-h-[44px] text-sm md:text-base"
            title="Create extract from selection"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Create Extract</span>
            <span className="font-medium sm:hidden">Extract</span>
          </button>
        </div>
      )}

      {/* Create Extract Dialog */}
      <CreateExtractDialog
        documentId={currentDocument.id}
        selectedText={selectedText}
        pageNumber={pageNumber}
        isOpen={isExtractDialogOpen}
        onClose={() => {
          setIsExtractDialogOpen(false);
          setSelectedText("");
        }}
        onCreate={handleExtractCreated}
      />

      {/* Hover Rating Controls - for quick document rating */}
      {viewMode === "document" && !disableHoverRating && docType !== "youtube" && (
        <HoverRatingControls
          context="document"
          documentId={documentId}
          onRatingSubmitted={handleRating}
        />
      )}

      {/* Floating Fullscreen Control Bar (visible on hover in fullscreen mode) */}
      {isFullscreen && (
        <div className="fixed top-0 left-0 right-0 z-50 group">
          {/* Semi-transparent trigger area */}
          <div className="h-8 bg-transparent hover:bg-black/20 transition-colors">
            {/* Control bar that appears on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center py-2">
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg hover:bg-background transition-colors"
                title="Exit Fullscreen (F11 or Esc)"
              >
                <Minimize className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">Exit Fullscreen</span>
                <span className="text-xs text-muted-foreground ml-2">(Press F11 or Esc)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
