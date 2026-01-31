import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText, List, Brain, Lightbulb, Search, X, Maximize, Minimize, Share2, FileCode, Loader2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDocumentStore, useTabsStore, useQueueStore } from "../../stores";
import { isTauri, isPWA } from "../../lib/tauri";
import { useSettingsStore } from "../../stores/settingsStore";
import { PDFViewer } from "./PDFViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { EPUBViewer } from "./EPUBViewer";
import { YouTubeViewer } from "./YouTubeViewer";
import { LocalVideoPlayer } from "./LocalVideoPlayer";
import { ExtractsList } from "../extracts/ExtractsList";
import { LearningCardsList } from "../learning/LearningCardsList";
import { useToast } from "../common/Toast";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";
import type { PdfSelectionContext } from "../../types/selection";
import type { Extract } from "../../api/extracts";
import { QueueNavigationControls } from "../queue/QueueNavigationControls";
import { HoverRatingControls } from "../review/HoverRatingControls";
import { useQueueNavigation } from "../../hooks/useQueueNavigation";
import { cn } from "../../utils";
import * as documentsApi from "../../api/documents";
import { updateDocumentProgressAuto, convertDocumentPdfToHtml } from "../../api/documents";
import { rateDocument } from "../../api/algorithm";
import type { ReviewRating } from "../../api/review";
import { autoExtractWithCache, isAutoExtractEnabled } from "../../utils/documentAutoExtract";
import { generateShareUrl, copyShareLink, DocumentState, parseStateFromUrl, updateUrlHash } from "../../lib/shareLink";
import { usePdfUrlState } from "../../hooks/usePdfUrlState";
import { getViewState, getViewStateKey, parseViewState, setViewState } from "../../lib/readerPosition";
import type { ViewState } from "../../types/readerPosition";
import { saveDocumentPosition, pagePosition, scrollPosition, cfiPosition, timePosition } from "../../api/position";
import type { DocumentPosition } from "../../types/position";

// Helper to format seconds as MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type ViewMode = "document" | "extracts" | "cards";

type DocumentType = "pdf" | "epub" | "markdown" | "html" | "youtube" | "video" | "audio";

const DOCUMENT_TYPES: DocumentType[] = ["pdf", "epub", "markdown", "html", "youtube", "video", "audio"];
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac", "opus"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi", "m4v"]);

const normalizeDocumentType = (value?: string): DocumentType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (DOCUMENT_TYPES.includes(normalized as DocumentType)) {
    return normalized as DocumentType;
  }
  if (normalized === "md" || normalized === "markdown") return "markdown";
  if (normalized === "htm" || normalized === "html") return "html";
  if (AUDIO_EXTENSIONS.has(normalized)) return "audio";
  if (VIDEO_EXTENSIONS.has(normalized)) return "video";
  return undefined;
};

/**
 * Helper to convert scroll state to unified DocumentPosition
 */
function getUnifiedPositionForDocument(
  docType: DocumentType | undefined,
  state: {
    pageNumber: number;
    scrollPercent: number;
    scrollTop: number;
  }
): DocumentPosition | null {
  switch (docType) {
    case "pdf":
      return pagePosition(state.pageNumber);
    case "epub":
      // EPUB uses CFI which is not available in basic scroll state
      // Fall back to scroll percent
      return scrollPosition(state.scrollPercent);
    case "markdown":
    case "html":
      return scrollPosition(state.scrollPercent);
    case "youtube":
      // YouTube uses time-based position (handled separately)
      return null;
    default:
      return scrollPosition(state.scrollPercent);
  }
}

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
  onExtractCreated?: (extract: Extract) => void;
  onVideoContextChange?: (context: { 
    videoId: string; 
    title?: string; 
    transcript?: string; 
    currentTime?: number;
    duration?: number;
  } | null) => void;
}

export function DocumentViewer({
  documentId,
  disableHoverRating = false,
  onSelectionChange,
  onScrollPositionChange,
  initialViewMode,
  onPdfContextTextChange,
  contextPageWindow,
  onExtractCreated,
  onVideoContextChange,
}: DocumentViewerProps) {
  const toast = useToast();
  const { documents, setCurrentDocument, currentDocument: globalCurrentDocument } = useDocumentStore();
  
  // Use local document lookup by documentId prop instead of global currentDocument
  // This allows multiple DocumentViewers to show different documents in split panes
  const localDocument = documents.find((d) => d.id === documentId);
  const currentDocument = localDocument || globalCurrentDocument;
  const { closeTab, tabs, updateTab } = useTabsStore();
  const { items: queueItems, loadQueue } = useQueueStore();
  const { settings } = useSettingsStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-width" | "fit-page">("fit-width");
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const mediaSrcRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagesRendered, setPagesRendered] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode ?? "document");
  const [videoContext, setVideoContext] = useState<{
    videoId: string;
    title?: string;
    transcript?: string;
    currentTime?: number;
    duration?: number;
  } | null>(null);

  // Notify parent of video context changes
  useEffect(() => {
    onVideoContextChange?.(videoContext);
  }, [videoContext, onVideoContextChange]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ocrContextText, setOcrContextText] = useState<string | null>(null);
  const [restoreRequestId, setRestoreRequestId] = useState(0);
  const [restoreState, setRestoreState] = useState<ViewState | null>(null);
  // Start with auto-scroll suppressed until restoration completes (or we confirm there's no saved position)
  const [suppressPdfAutoScroll, setSuppressPdfAutoScroll] = useState(true);
  const restoreScrollAttemptsRef = useRef(0);
  const restoreScrollTimeoutRef = useRef<number | null>(null);
  const restoreScrollDoneRef = useRef(false);
  const restorationInProgressRef = useRef(false);
  const scrollSaveTimeoutRef = useRef<number | null>(null);
  const restoreRequestIdRef = useRef(0);
  const restoreAttemptRef = useRef(0);
  const restoreReadyAttemptsRef = useRef(0);
  const pendingViewStateRef = useRef<ViewState | null>(null);
  const lastViewStateRef = useRef<ViewState | null>(null);
  const pdfFingerprintRef = useRef<string | null>(null);
  const lastScrollStateRef = useRef<{
    pageNumber: number;
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    clientHeight: number;
    scrollPercent: number;
    scale?: number;
  } | null>(null);
  const lastScrollMetaRef = useRef<{ storageKey?: string; documentId?: string | null } | null>(null);
  const skipStoredScrollRef = useRef(false);
  // Track current page number for cleanup to use
  const currentPageRef = useRef(pageNumber);
  const scaleRef = useRef(scale);
  const zoomModeRef = useRef(zoomMode);
  const viewModeRef = useRef(viewMode);

  const scrollStorageKey = currentDocument?.id
    ? `document-scroll-position:${currentDocument.id}`
    : undefined;

  // Listen for fullscreen changes (for PWA/browser environment)
  useEffect(() => {
    if (isTauri()) return;

    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const resolveViewStateKey = useCallback(
    (docId?: string | null) =>
      getViewStateKey({
        documentId: docId ?? currentDocument?.id ?? null,
        contentHash: currentDocument?.contentHash ?? null,
        pdfFingerprint: pdfFingerprintRef.current,
      }),
    [currentDocument?.contentHash, currentDocument?.id]
  );

  // Infer fileType from filePath if it's missing (legacy data or import issue)
  const inferFileType = (doc?: typeof currentDocument): DocumentType => {
    if (!doc) return "other";
    if (doc.fileType && doc.fileType !== "other") {
      const normalized = normalizeDocumentType(doc.fileType);
      if (normalized) return normalized;
    }
    // Fallback: infer from file extension
    const ext = doc.filePath?.split(".").pop()?.toLowerCase();
    const inferred = normalizeDocumentType(ext);
    if (inferred) return inferred;
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

  const getVideoMimeType = (path?: string) => {
    const ext = path?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "webm":
        return "video/webm";
      case "mov":
        return "video/quicktime";
      case "mkv":
        return "video/x-matroska";
      case "avi":
        return "video/x-msvideo";
      case "m4v":
        return "video/x-m4v";
      case "mp4":
      default:
        return "video/mp4";
    }
  };

  const getAudioMimeType = (path?: string) => {
    const ext = path?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "wav":
        return "audio/wav";
      case "m4a":
        return "audio/mp4";
      case "aac":
        return "audio/aac";
      case "ogg":
        return "audio/ogg";
      case "flac":
        return "audio/flac";
      case "opus":
        return "audio/opus";
      case "mp3":
      default:
        return "audio/mpeg";
    }
  };

  const docType = inferFileType(currentDocument);

  // Handle URL hash state changes (back/forward navigation)
  const handleUrlHashChange = useCallback((state: {
    pageNumber?: number;
    scale?: number;
    zoomMode?: "custom" | "fit-width" | "fit-page";
    scrollPercent?: number;
  }) => {
    if (state.pageNumber !== undefined) {
      setPageNumber(state.pageNumber);
    }
    if (state.scale !== undefined) {
      setScale(state.scale);
    }
    if (state.zoomMode !== undefined) {
      setZoomMode(state.zoomMode);
    }
    // Scroll percent will be handled by the restoration logic
    if (state.scrollPercent !== undefined) {
      // Trigger a restore with the scroll percent
      const container = document.querySelector("[data-document-scroll-container]") as HTMLElement | null;
      if (container) {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = (state.scrollPercent / 100) * maxScroll;
      }
    }
  }, []);

  const enablePdfUrlSync = false;

  // URL hash state synchronization for PDF back/forward navigation
  const { pushState: pushUrlState, getInitialState: getUrlInitialState } = usePdfUrlState(
    {
      pageNumber,
      scale,
      zoomMode,
      scrollPercent: lastScrollStateRef.current?.scrollPercent,
    },
    {
      enabled: enablePdfUrlSync && viewMode === "document" && docType === "pdf",
      debounceMs: 800,
      onHashChange: handleUrlHashChange,
    }
  );
  const hasDocumentHistory =
    (currentDocument?.reps ?? currentDocument?.readingCount ?? 0) > 0
    || !!currentDocument?.dateLastReviewed;

  useEffect(() => {
    lastScrollMetaRef.current = { storageKey: scrollStorageKey, documentId: currentDocument?.id ?? null };
  }, [scrollStorageKey, currentDocument?.id]);

  // Keep currentPageRef in sync with pageNumber state
  useEffect(() => {
    currentPageRef.current = pageNumber;
  }, [pageNumber]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    zoomModeRef.current = zoomMode;
  }, [zoomMode]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Track the last page user viewed, independent of scroll suppression
  // This ensures we save the correct page even if scroll handler was suppressed
  const lastViewedPageRef = useRef(pageNumber);
  useEffect(() => {
    lastViewedPageRef.current = pageNumber;
  }, [pageNumber]);

  // Extract creation state
  const [selectedText, setSelectedText] = useState("");
  const [selectionContext, setSelectionContext] = useState<PdfSelectionContext | null>(null);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [isConvertingToHtml, setIsConvertingToHtml] = useState(false);
  const lastSelectionRef = useRef("");
  const lastDocumentIdRef = useRef<string | null>(null);
  const lastLoadedDocumentIdRef = useRef<string | null>(null); // Track successfully loaded documents

  const MAX_SELECTION_CHARS = 10000;
  const updateSelection = useCallback((rawText: string | null | undefined, context?: PdfSelectionContext | null) => {
    const text = rawText?.trim() ?? "";
    if (text && text.length > 0 && text.length <= MAX_SELECTION_CHARS) {
      setSelectedText(text);
      lastSelectionRef.current = text;
      if (context) {
        setSelectionContext(context);
      } else if (context === undefined) {
        setSelectionContext(null);
      }
    } else {
      setSelectedText("");
      if (context === null || context === undefined) {
        setSelectionContext(null);
      }
      // Don't clear lastSelectionRef on empty selection - preserve it for the toolbar button
      // The floating action button is controlled by selectedText state, so it will hide appropriately
    }
  }, [MAX_SELECTION_CHARS]);

  const clearTextSelection = useCallback(() => {
    setSelectedText("");
    lastSelectionRef.current = "";
    setSelectionContext(null);
    // Clear the browser's text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  const persistScrollState = useCallback(
    (
      state: {
        pageNumber: number;
        scrollTop: number;
        scrollLeft: number;
        scrollHeight: number;
        clientHeight: number;
        scrollPercent: number;
        scale?: number;
      },
      override?: { storageKey?: string; documentId?: string | null; updatedAt?: number },
      viewStateOverride?: ViewState | null
    ) => {
      const storageKey = override?.storageKey ?? scrollStorageKey;
      if (!storageKey) return;
      const docId = override?.documentId ?? currentDocument?.id;
      const docType = currentDocument?.fileType as DocumentType;
      const updatedAt = override?.updatedAt ?? Date.now();
      const payload = {
        pageNumber: state.pageNumber,
        scrollPercent: state.scrollPercent,
        scrollTop: state.scrollTop,
        scrollLeft: state.scrollLeft,
        scrollHeight: state.scrollHeight,
        clientHeight: state.clientHeight,
        updatedAt,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));

      // Also sync to PDFViewer's legacy key if it's a PDF
      if (docId && docType === "pdf") {
        const legacyPayload = {
          type: "page", // Unified format often uses 'type'
          page: state.pageNumber,
          scrollTop: state.scrollTop,
          percent: state.scrollPercent,
          updatedAt
        };
        localStorage.setItem(`pdf-position-${docId}`, JSON.stringify(legacyPayload));
      }

      const viewStateKey = docId ? resolveViewStateKey(docId) : null;
      const viewState =
        viewStateOverride ??
        (docId
          ? {
            docId,
            pageNumber: state.pageNumber,
            scale: state.scale ?? scale,
            zoomMode,
            rotation: 0,
            viewMode,
            dest: lastViewStateRef.current?.dest ?? null,
            scrollTop: state.scrollTop,
            scrollLeft: state.scrollLeft,
            scrollPercent: state.scrollPercent,
            updatedAt,
            version: 1,
          }
          : null);

      if (viewStateKey && viewState) {
        setViewState(viewStateKey, viewState);
        lastViewStateRef.current = viewState;
      }

      if (docId) {
        // Get unified position first - this is the primary position storage
        const unifiedPosition = getUnifiedPositionForDocument(docType, state);
        
        // Save using the legacy method (includes positionJson via viewState)
        updateDocumentProgressAuto(docId, state.pageNumber, state.scrollPercent, null, viewState ?? undefined)
          .catch((error) => console.warn("Failed to save document progress:", error));

        // Also save unified position via the position API (primary source)
        if (unifiedPosition) {
          saveDocumentPosition(docId, unifiedPosition)
            .catch((error) => console.warn("Failed to save unified position:", error));
        }
      }
    },
    [currentDocument?.id, currentDocument?.fileType, resolveViewStateKey, scale, scrollStorageKey, viewMode, zoomMode]
  );

  const handleScrollPositionChange = useCallback(
    (state: {
      pageNumber: number;
      scrollTop: number;
      scrollLeft: number;
      scrollHeight: number;
      clientHeight: number;
      scrollPercent: number;
      scale?: number;
      dest?: ViewState["dest"];
    }) => {
      // Don't save scroll state during restoration to prevent overwriting saved position with "Page 1"
      if (restorationInProgressRef.current || suppressPdfAutoScroll) {
        console.log("[DocumentViewer] Ignoring scroll update during restoration/suppression");
        return;
      }

      lastScrollStateRef.current = state;
      onScrollPositionChange?.({
        pageNumber: state.pageNumber,
        scrollPercent: state.scrollPercent,
      });

      const docId = currentDocument?.id;
      const viewStateKey = docId ? resolveViewStateKey(docId) : null;
      if (docId && viewStateKey) {
        const updatedAt = Date.now();
        const viewState: ViewState = {
          docId,
          pageNumber: state.pageNumber,
          scale: state.scale ?? scale,
          zoomMode,
          rotation: 0,
          viewMode,
          dest: state.dest ?? null,
          scrollTop: state.scrollTop,
          scrollLeft: state.scrollLeft,
          scrollPercent: state.scrollPercent,
          updatedAt,
          version: 1,
        };
        lastViewStateRef.current = viewState;
        setViewState(viewStateKey, viewState);
      }

      if (!scrollStorageKey) return;
      if (scrollSaveTimeoutRef.current !== null) return;

      scrollSaveTimeoutRef.current = window.setTimeout(() => {
        scrollSaveTimeoutRef.current = null;
        persistScrollState(state);
      }, 500);
    },
    [currentDocument?.id, onScrollPositionChange, persistScrollState, resolveViewStateKey, scale, scrollStorageKey, viewMode, zoomMode]
  );

  const captureScrollState = useCallback(() => {
    const container = document.querySelector(
      "[data-document-scroll-container]"
    ) as HTMLElement | null;
    if (!container) return null;
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    return {
      pageNumber,
      scrollTop,
      scrollLeft,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      scrollPercent,
      scale,
    };
  }, [pageNumber, scale]);

  const savePdfProgress = useCallback((reason: string) => {
    if (docType !== "pdf" || viewMode !== "document") return;
    if (!scrollStorageKey) return;
    const state = lastScrollStateRef.current ?? captureScrollState();
    if (!state) return;
    const viewState = lastViewStateRef.current
      ? { ...lastViewStateRef.current, updatedAt: Date.now() }
      : null;
    console.log("[DocumentViewer] Saving PDF progress:", reason, state);
    persistScrollState(state, undefined, viewState);
  }, [captureScrollState, docType, persistScrollState, scrollStorageKey, viewMode]);

  // Timer for tracking reading time
  const startTimeRef = useRef(Date.now());

  // Queue navigation
  const queueNav = useQueueNavigation();

  const loadDocumentData = useCallback(async (doc: typeof currentDocument) => {
    if (!doc) return;

    setIsLoading(true);

    // Infer fileType from filePath if missing (handles empty string or undefined)
    const ext = doc.filePath?.split('.').pop()?.toLowerCase();
    const inferredType = normalizeDocumentType(doc.fileType) ?? normalizeDocumentType(ext) ?? "";
    const needsFileData = inferredType === "pdf" || inferredType === "epub";

    console.log("[DocumentViewer] loadDocumentData:", {
      fileType: doc.fileType,
      filePath: doc.filePath,
      ext,
      inferredType,
      needsFileData,
    });

    if (mediaSrcRef.current) {
      URL.revokeObjectURL(mediaSrcRef.current);
      mediaSrcRef.current = null;
    }
    setMediaSrc(null);

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
    } else if (inferredType === "video" || inferredType === "audio") {
      try {
        const base64Data = await documentsApi.readDocumentFile(doc.filePath);
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const mimeType = inferredType === "audio"
          ? getAudioMimeType(doc.filePath)
          : getVideoMimeType(doc.filePath);
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        mediaSrcRef.current = blobUrl;
        setMediaSrc(blobUrl);
      } catch (error) {
        console.error("Failed to load video file:", error);
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

    // Save scroll position BEFORE switching to a new document
    const prevDocId = lastDocumentIdRef.current;
    if (prevDocId && prevDocId !== documentId) {
      // Capture and save scroll position for the previous document
      const container = document.querySelector("[data-document-scroll-container]") as HTMLElement | null;
      if (container) {
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        const state = {
          pageNumber: currentPageRef.current,
          scrollTop,
          scrollLeft,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          scrollPercent,
        };
        const storageKey = `document-scroll-position:${prevDocId}`;
        const payload = {
          pageNumber: state.pageNumber,
          scrollPercent: state.scrollPercent,
          scrollTop: state.scrollTop,
          scrollLeft: state.scrollLeft,
          scrollHeight: state.scrollHeight,
          clientHeight: state.clientHeight,
          updatedAt: Date.now(),
        };
        console.log("[DocumentViewer] Saving before document switch:", storageKey, payload);
        localStorage.setItem(storageKey, JSON.stringify(payload));
        const viewState = lastViewStateRef.current
          ? { ...lastViewStateRef.current, updatedAt: Date.now() }
          : null;
        updateDocumentProgressAuto(prevDocId, state.pageNumber, state.scrollPercent, null, viewState ?? undefined)
          .catch((error) => console.warn("Failed to save document progress before switch:", error));
      }
    }

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

  useEffect(() => {
    if (docType !== "pdf") return;
    setPagesRendered(false);
  }, [docType, scale, zoomMode, currentDocument?.id]);

  // Save PDF progress when switching away from document view (e.g., to extracts or cards)
  const prevViewModeRef = useRef<ViewMode | null>(null);
  useEffect(() => {
    if (prevViewModeRef.current === "document" && viewMode !== "document") {
      savePdfProgress("viewMode change");
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, savePdfProgress]);

  // Parse URL fragment and restore state after document is loaded
  useEffect(() => {
    if (!currentDocument || !documentId || !enablePdfUrlSync) return;

    skipStoredScrollRef.current = false;
    const state = parseStateFromUrl();
    const hasUrlState = state.scroll !== undefined || state.pos !== undefined || state.zoom !== undefined;
    skipStoredScrollRef.current = hasUrlState;

    // Restore page number from fragment
    if (state.pos !== undefined) {
      setPageNumber(state.pos);
      // If URL provides position, allow auto-scroll to navigate there
      if (hasUrlState) {
        setSuppressPdfAutoScroll(false);
        restoreScrollDoneRef.current = true;
        restorationInProgressRef.current = false;
      }
    }

    // Restore zoom/scale from fragment
    if (state.zoom !== undefined) {
      if (typeof state.zoom === 'number') {
        setScale(state.zoom);
        setZoomMode('custom');
      } else if (state.zoom === 'page-width' || state.zoom === 'fit-width') {
        setZoomMode('fit-width');
      } else if (state.zoom === 'fit-page') {
        setZoomMode('fit-page');
      }
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
    // Only reset restoration state when document ID changes, not on viewMode change
    // to avoid race conditions with pending restoration
    if (restorationInProgressRef.current) {
      console.log("[DocumentViewer] Skipping state reset - restoration in progress");
      return;
    }
    restoreScrollDoneRef.current = false;
    restoreScrollAttemptsRef.current = 0;
    restoreAttemptRef.current = 0;
    restoreRequestIdRef.current = 0;
    setRestoreRequestId(0);
    setPagesRendered(false);
    pendingViewStateRef.current = null;
    lastViewStateRef.current = null;
    lastScrollStateRef.current = null;
    setRestoreState(null);
    if (restoreScrollTimeoutRef.current !== null) {
      clearTimeout(restoreScrollTimeoutRef.current);
      restoreScrollTimeoutRef.current = null;
    }
  }, [currentDocument?.id]);

  useEffect(() => {
    console.log("[DocumentViewer] Restoration effect running:", {
      viewMode,
      viewModeRef: viewModeRef.current,
      docType,
      isLoading,
      docId: currentDocument?.id,
      restoreScrollDone: restoreScrollDoneRef.current,
      skipStoredScroll: skipStoredScrollRef.current,
      restorationInProgress: restorationInProgressRef.current,
    });
    if (viewModeRef.current !== "document") return;
    if (docType !== "pdf") return;
    if (isLoading) return;
    if (!currentDocument?.id) return;
    if (restoreScrollDoneRef.current) return;
    if (skipStoredScrollRef.current) {
      setSuppressPdfAutoScroll(false);
      restoreScrollDoneRef.current = true;
      restorationInProgressRef.current = false;
      return;
    }

    // Mark restoration as in progress to prevent reset effect from clearing state
    restorationInProgressRef.current = true;

    const docId = currentDocument.id;
    const viewStateKey = resolveViewStateKey(docId);
    const localViewState = viewStateKey ? getViewState(viewStateKey) : null;
    const remoteRaw = (currentDocument as any)?.currentViewState ?? (currentDocument as any)?.current_view_state;
    let remoteViewState: ViewState | null = null;
    if (typeof remoteRaw === "string") {
      remoteViewState = parseViewState(remoteRaw);
    } else if (remoteRaw && typeof remoteRaw === "object" && typeof (remoteRaw as ViewState).updatedAt === "number") {
      remoteViewState = remoteRaw as ViewState;
    }

    let selectedViewState = localViewState;
    if (remoteViewState && (!selectedViewState || remoteViewState.updatedAt > selectedViewState.updatedAt)) {
      selectedViewState = {
        ...remoteViewState,
        docId: remoteViewState.docId || docId,
      };
    }

    if (!selectedViewState) {
      let legacyParsed: { scrollPercent?: number; scrollTop?: number; pageNumber?: number; updatedAt?: number } | null = null;
      // Check DocumentViewer's specific key
      const stored = scrollStorageKey ? localStorage.getItem(scrollStorageKey) : null;
      // Also check PDFViewer's legacy key as fallback
      const legacyStored = docId ? localStorage.getItem(`pdf-position-${docId}`) : null;

      if (stored) {
        try {
          legacyParsed = JSON.parse(stored);
        } catch {
          legacyParsed = null;
        }
      }
      
      // If no DocumentViewer state, or if PDFViewer state is newer, use PDFViewer state
      if (legacyStored) {
        try {
          const legacyState = JSON.parse(legacyStored);
          // If we don't have stored state, or legacy state has a timestamp and it's newer
          // Note: legacy state might not have updatedAt, so we prioritize 'stored' if it exists unless we're sure
          if (!legacyParsed || (legacyState.updatedAt && (!legacyParsed.updatedAt || legacyState.updatedAt > legacyParsed.updatedAt))) {
             // Adapt legacy state format to our needs
             const adapted = {
               pageNumber: legacyState.page ?? legacyState.pageNumber ?? 1,
               scrollTop: legacyState.scrollTop,
               scrollPercent: legacyState.percent ?? legacyState.scrollPercent,
               updatedAt: legacyState.updatedAt
             };
             legacyParsed = adapted;
          }
        } catch {
          // Ignore parse errors
        }
      }
      const remoteUpdatedAt = currentDocument?.dateModified
        ? new Date(currentDocument.dateModified).getTime()
        : 0;
      const localUpdatedAt = legacyParsed?.updatedAt ?? 0;
      
      // Check for positionJson (unified position storage) first
      const positionJson = (currentDocument as any)?.positionJson ?? (currentDocument as any)?.position_json;
      let parsedPosition: { type: string; page?: number; percent?: number; cfi?: string; offset?: number } | null = null;
      if (positionJson) {
        try {
          parsedPosition = typeof positionJson === 'string' ? JSON.parse(positionJson) : positionJson;
        } catch {
          parsedPosition = null;
        }
      }
      
      const hasRemoteProgress = typeof currentDocument?.currentScrollPercent === "number" || parsedPosition !== null;

      if ((hasRemoteProgress && remoteUpdatedAt > localUpdatedAt) || !legacyParsed) {
        // Use positionJson if available, otherwise fall back to legacy fields
        if (parsedPosition) {
          let pageNumber = 1;
          let scrollPercent: number | null = null;
          
          switch (parsedPosition.type) {
            case 'page':
              pageNumber = parsedPosition.page ?? 1;
              // Estimate scroll percent from page number if total pages is known
              if (currentDocument?.totalPages && currentDocument.totalPages > 0) {
                scrollPercent = ((pageNumber - 1) / currentDocument.totalPages) * 100;
              }
              break;
            case 'scroll':
              scrollPercent = parsedPosition.percent ?? 0;
              break;
            case 'cfi':
              // For EPUB CFI, we can't easily convert to page number
              // Keep scrollPercent from legacy fields if available
              scrollPercent = currentDocument?.currentScrollPercent ?? 0;
              break;
          }
          
          legacyParsed = {
            scrollPercent: scrollPercent ?? undefined,
            pageNumber: pageNumber,
            updatedAt: remoteUpdatedAt || Date.now(),
          };
        } else {
          legacyParsed = hasRemoteProgress
            ? {
              scrollPercent: currentDocument.currentScrollPercent,
              pageNumber: currentDocument.currentPage ?? undefined,
              updatedAt: remoteUpdatedAt || Date.now(),
            }
            : null;
        }
      }

      if (legacyParsed) {
        // Use refs for scale/zoomMode/viewMode to avoid dependency issues
        selectedViewState = {
          docId,
          pageNumber: legacyParsed.pageNumber ?? 1,
          scale: scaleRef.current,
          zoomMode: zoomModeRef.current,
          rotation: 0,
          viewMode: viewModeRef.current,
          dest: null,
          scrollTop: legacyParsed.scrollTop ?? null,
          scrollPercent: legacyParsed.scrollPercent ?? null,
          updatedAt: legacyParsed.updatedAt ?? Date.now(),
          version: 1,
        };
      }
    }

    if (!selectedViewState) {
      setSuppressPdfAutoScroll(false);
      restoreScrollDoneRef.current = true;
      restorationInProgressRef.current = false;
      return;
    }

    pendingViewStateRef.current = selectedViewState;
    lastViewStateRef.current = selectedViewState;
    currentPageRef.current = selectedViewState.pageNumber;
    setRestoreState(selectedViewState);
    setSuppressPdfAutoScroll(true);

    if (selectedViewState.zoomMode) {
      setZoomMode(selectedViewState.zoomMode);
    }
    if (typeof selectedViewState.scale === "number") {
      setScale(selectedViewState.scale);
    }
    if (typeof selectedViewState.pageNumber === "number" && selectedViewState.pageNumber > 0) {
      setPageNumber(selectedViewState.pageNumber);
    }
    // Note: restorationInProgressRef will be cleared by the verification effect after restoration completes
  }, [currentDocument, docType, isLoading, resolveViewStateKey, scrollStorageKey]);

  useEffect(() => {
    if (viewMode !== "document") return;
    if (docType !== "pdf") return;
    if (isLoading) return;
    if (!pagesRendered) return;
    if (restoreScrollDoneRef.current) return;

    const state = restoreState ?? pendingViewStateRef.current;
    if (!state) {
      setSuppressPdfAutoScroll(false);
      restoreScrollDoneRef.current = true;
      restorationInProgressRef.current = false;
      return;
    }

    restoreRequestIdRef.current += 1;
    setRestoreRequestId(restoreRequestIdRef.current);
    restoreAttemptRef.current = 0;
    restoreReadyAttemptsRef.current = 0;

    const maxReadyAttempts = 100;
    const maxVerifyAttempts = 3;

    const getRestoreContainer = () =>
      document.querySelector("[data-document-scroll-container]") as HTMLElement | null;

    const getRestoreReadiness = () => {
      const container = getRestoreContainer();
      if (!container) return { ready: false, container: null };
      const pageEl = container.querySelector<HTMLElement>(
        `[data-pdf-page][data-page-number="${state.pageNumber}"]`
      );
      if (!pageEl) return { ready: false, container };
      const hasLayout = pageEl.offsetHeight > 0 || container.scrollHeight > 0;
      return { ready: hasLayout, container };
    };

    const verifyRestore = (container: HTMLElement) => {

      const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      let currentPage = 1;
      for (const pageEl of pages) {
        const pageNum = Number(pageEl.dataset.pageNumber);
        if (!Number.isNaN(pageNum) && pageEl.offsetTop - 24 <= container.scrollTop) {
          currentPage = pageNum;
        }
      }

      const withinPage = Math.abs(currentPage - state.pageNumber) <= 1;
      if (!withinPage) return false;

      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const expectedScroll = typeof state.scrollTop === "number"
        ? Math.min(Math.max(0, state.scrollTop), maxScroll)
        : typeof state.scrollPercent === "number"
          ? (state.scrollPercent / 100) * maxScroll
          : null;
      if (expectedScroll !== null) {
        return Math.abs(container.scrollTop - expectedScroll) <= 200;
      }
      return true;
    };

    const attemptVerify = () => {
      const readiness = getRestoreReadiness();
      if (!readiness.container || !readiness.ready) {
        restoreReadyAttemptsRef.current += 1;
        if (restoreReadyAttemptsRef.current <= maxReadyAttempts) {
          restoreScrollTimeoutRef.current = window.setTimeout(attemptVerify, 200);
          return;
        }
      }

      const container = readiness.container ?? getRestoreContainer();
      const ok = container ? verifyRestore(container) : false;
      if (ok) {
        if (state.pageNumber !== pageNumber) {
          setPageNumber(state.pageNumber);
        }
        restoreScrollDoneRef.current = true;
        restorationInProgressRef.current = false;
        setTimeout(() => setSuppressPdfAutoScroll(false), 500);
        return;
      }

      if (restoreAttemptRef.current < maxVerifyAttempts - 1) {
        restoreAttemptRef.current += 1;
        restoreRequestIdRef.current += 1;
        setRestoreRequestId(restoreRequestIdRef.current);
        restoreScrollTimeoutRef.current = window.setTimeout(attemptVerify, 200);
        return;
      }

      restoreScrollDoneRef.current = true;
      restorationInProgressRef.current = false;
      setSuppressPdfAutoScroll(false);
    };

    restoreScrollTimeoutRef.current = window.setTimeout(attemptVerify, 200);
  }, [docType, isLoading, pagesRendered, restoreState, viewMode]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        savePdfProgress("visibilitychange");
      }
    };
    const handlePageHide = () => {
      savePdfProgress("pagehide");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [savePdfProgress]);


  useEffect(() => {
    return () => {
      if (restoreScrollTimeoutRef.current !== null) {
        clearTimeout(restoreScrollTimeoutRef.current);
      }
      if (scrollSaveTimeoutRef.current !== null) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }

      const storageKey = lastScrollMetaRef.current?.storageKey;
      const documentId = lastScrollMetaRef.current?.documentId;

      if (!storageKey || !documentId) {
        console.log("[DocumentViewer] Cleanup - missing metadata:", { storageKey, documentId });
        return;
      }

      // Try to capture current scroll state from DOM (PDF might still be mounted)
      let stateToSave = lastScrollStateRef.current;

      if (!stateToSave) {
        // Fallback: try reading from DOM, then use current page number
        const container = document.querySelector("[data-document-scroll-container]") as HTMLElement | null;
        if (container) {
          const scrollTop = container.scrollTop;
          const scrollLeft = container.scrollLeft;
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
          const scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
          stateToSave = {
            pageNumber: currentPageRef.current,
            scrollTop,
            scrollLeft,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            scrollPercent,
          };
          console.log("[DocumentViewer] Cleanup - captured from DOM:", stateToSave);
        } else {
          const fallbackViewState = lastViewStateRef.current;
          if (fallbackViewState) {
            stateToSave = {
              pageNumber: fallbackViewState.pageNumber ?? currentPageRef.current,
              scrollTop: fallbackViewState.scrollTop ?? 0,
              scrollLeft: fallbackViewState.scrollLeft ?? 0,
              scrollHeight: 0,
              clientHeight: 0,
              scrollPercent: fallbackViewState.scrollPercent ?? 0,
            };
            console.log("[DocumentViewer] Cleanup - captured from last view state:", stateToSave);
          } else {
            console.log("[DocumentViewer] Cleanup - no scroll state available, skipping save");
            return;
          }
        }
      }

      console.log("[DocumentViewer] Cleanup - saving position:", stateToSave);

      const payload = {
        pageNumber: stateToSave.pageNumber,
        scrollPercent: stateToSave.scrollPercent,
        scrollTop: stateToSave.scrollTop,
        scrollLeft: stateToSave.scrollLeft,
        scrollHeight: stateToSave.scrollHeight,
        clientHeight: stateToSave.clientHeight,
        updatedAt: Date.now(),
      };

      console.log("[DocumentViewer] Saving to localStorage:", storageKey, payload);
      localStorage.setItem(storageKey, JSON.stringify(payload));
      
      // Also sync to PDFViewer's legacy key
      if (documentId) {
        // We can't easily check docType here without ref, but we can assume safe to write if we have data
        const legacyPayload = {
          type: "page",
          page: stateToSave.pageNumber,
          scrollTop: stateToSave.scrollTop,
          percent: stateToSave.scrollPercent,
          updatedAt: Date.now()
        };
        localStorage.setItem(`pdf-position-${documentId}`, JSON.stringify(legacyPayload));
      }

      const viewStateKey = getViewStateKey({ documentId });
      const viewState = lastViewStateRef.current
        ? { ...lastViewStateRef.current, updatedAt: Date.now() }
        : {
          docId: documentId,
          pageNumber: stateToSave.pageNumber,
          scale: scaleRef.current,
          zoomMode: zoomModeRef.current,
          rotation: 0,
          viewMode: viewModeRef.current,
          dest: null,
          scrollTop: stateToSave.scrollTop,
          scrollLeft: stateToSave.scrollLeft,
          scrollPercent: stateToSave.scrollPercent,
          updatedAt: Date.now(),
          version: 1,
        };

      if (viewStateKey) {
        setViewState(viewStateKey, viewState);
      }

      updateDocumentProgressAuto(documentId, stateToSave.pageNumber, stateToSave.scrollPercent, null, viewState)
        .catch((error) => console.warn("Failed to save document progress on cleanup:", error));
    };
  }, []);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection) return;
      const anchorElement = selection.anchorNode instanceof Element
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;
      const focusElement = selection.focusNode instanceof Element
        ? selection.focusNode
        : selection.focusNode?.parentElement;
      if (anchorElement?.closest(".textLayer") || focusElement?.closest(".textLayer")) {
        return;
      }
      updateSelection(selection.toString(), undefined);
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [updateSelection]);

  // Clear text selection when clicking outside the document content
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't clear if clicking on the floating button, dialog, or within the document content
      if (
        target.closest('[data-extract-button="true"]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[data-document-content="true"]')
      ) {
        return;
      }
      // Clear selection when clicking on empty areas
      if (selectedText && !window.getSelection()?.toString()) {
        clearTextSelection();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedText, clearTextSelection]);

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

      // Escape to close dialogs, clear selection, or exit fullscreen
      if (e.key === "Escape") {
        if (showSearch) setShowSearch(false);
        if (isExtractDialogOpen) {
          setIsExtractDialogOpen(false);
          clearTextSelection();
        } else if (selectedText) {
          // If no dialog is open but text is selected, clear the selection
          clearTextSelection();
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
      const newPage = Math.max(1, pageNumber - 1);
      setPageNumber(newPage);
      // Push to history for back/forward navigation
      if (docType === "pdf") {
        pushUrlState({ pageNumber: newPage, scale, zoomMode, scrollPercent: lastScrollStateRef.current?.scrollPercent });
      }
    }
  };

  const handleNextPage = () => {
    if (currentDocument && currentDocument.totalPages) {
      const newPage = Math.min(currentDocument.totalPages!, pageNumber + 1);
      setPageNumber(newPage);
      // Push to history for back/forward navigation
      if (docType === "pdf") {
        pushUrlState({ pageNumber: newPage, scale, zoomMode, scrollPercent: lastScrollStateRef.current?.scrollPercent });
      }
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
    // Push to history for significant page jumps (e.g., TOC navigation)
    if (docType === "pdf" && Math.abs(newPageNumber - pageNumber) > 1) {
      pushUrlState({ pageNumber: newPageNumber, scale, zoomMode, scrollPercent: undefined });
    }
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

  const handlePdfInfo = useCallback((info: { fingerprint?: string | null }) => {
    pdfFingerprintRef.current = info.fingerprint ?? null;
  }, []);

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
  const handleExtractCreated = (extract: Extract) => {
    // Navigate to extracts tab to show the new extract
    setViewMode("extracts");
    onExtractCreated?.(extract);
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
      // PWA/Browser environment - use standard Fullscreen API
      if (!isTauri()) {
        if (isFullscreen) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        } else {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if ((docEl as any).webkitRequestFullscreen) {
            await (docEl as any).webkitRequestFullscreen();
          } else if ((docEl as any).msRequestFullscreen) {
            await (docEl as any).msRequestFullscreen();
          }
        }
        return;
      }

      // Tauri desktop environment
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

    // Add zoom/scale for PDFs
    if (docType === 'pdf') {
      if (zoomMode === 'custom' && scale !== 1.0) {
        state.zoom = scale;
      } else if (zoomMode !== 'custom') {
        state.zoom = zoomMode === 'fit-width' ? 'page-width' : zoomMode;
      }

      // Add scroll position if meaningful
      const scrollPercent = lastScrollStateRef.current?.scrollPercent;
      if (scrollPercent !== undefined && scrollPercent > 0) {
        state.scroll = Math.round(scrollPercent);
      }
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

  // Convert PDF to HTML for better text selection
  const handleConvertToHtml = async () => {
    if (!currentDocument || docType !== 'pdf') return;

    setIsConvertingToHtml(true);
    try {
      const result = await convertDocumentPdfToHtml(currentDocument.id, true);

      if (!result) {
        throw new Error('Conversion returned no result. This feature may not be available in browser mode.');
      }

      if (result.saved_path) {
        toast.success(
          "PDF converted to HTML",
          `Saved to: ${result.saved_path}. The HTML file allows better text selection and extraction.`
        );
      } else if (result.html_content) {
        // Open in new window/tab as fallback
        const blob = new Blob([result.html_content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success(
          "PDF converted to HTML",
          "Opened in a new tab. You can now select and copy text more easily."
        );
      } else {
        throw new Error('Conversion returned no HTML content');
      }
    } catch (error) {
      console.error("Failed to convert PDF to HTML:", error);
      toast.error(
        "Conversion failed",
        error instanceof Error ? error.message : "Failed to convert PDF to HTML"
      );
    } finally {
      setIsConvertingToHtml(false);
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
          {/* Compact progress indicator */}
          {currentDocument.progressPercent !== undefined && currentDocument.progressPercent > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${currentDocument.progressPercent}%` }}
                />
              </div>
              {Math.round(currentDocument.progressPercent)}%
            </span>
          )}
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

          {/* Convert to HTML Button (PDF only) */}
          {docType === "pdf" && (
            <button
              onClick={handleConvertToHtml}
              disabled={isConvertingToHtml}
              className={cn(
                "p-2 rounded-md transition-colors relative",
                isConvertingToHtml
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="Convert to HTML for better text selection"
            >
              {isConvertingToHtml ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCode className="w-4 h-4" />
              )}
            </button>
          )}

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
      <div className="flex-1 overflow-auto bg-muted/30 relative">
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
          <PDFViewer
            documentId={currentDocument.id}
            fileData={fileData}
            pageNumber={pageNumber}
            scale={scale}
            zoomMode={zoomMode}
            suppressAutoScroll={suppressPdfAutoScroll}
            onPageChange={handlePageChange}
            onLoad={handleDocumentLoad}
            onPdfInfo={handlePdfInfo}
            onPagesRendered={() => setPagesRendered(true)}
            onScrollPositionChange={handleScrollPositionChange}
            restoreState={restoreState}
            restoreRequestId={restoreRequestId}
            contextPageWindow={contextPageWindow}
            onTextWindowChange={handlePdfContextTextChange}
            onSelectionChange={updateSelection}
          />
        ) : docType === "epub" && fileData ? (
          <EPUBViewer
            fileData={fileData}
            fileName={currentDocument.title}
            documentId={currentDocument.id}
            onLoad={handleDocumentLoad}
            onSelectionChange={updateSelection}
            onContextTextChange={onPdfContextTextChange}
          />
        ) : (docType === "video" || docType === "audio") && mediaSrc ? (
          <div className={cn("h-full w-full", docType === "audio" ? "bg-background" : "bg-black")}>
            <LocalVideoPlayer
              src={mediaSrc}
              documentId={currentDocument.id}
              title={currentDocument.title}
              className="h-full w-full"
              mediaType={docType === "audio" ? "audio" : "video"}
            />
          </div>
        ) : docType === "markdown" ? (
          <div className="reading-surface min-h-full">
            <MarkdownViewer document={currentDocument} content={currentDocument.content} />
          </div>
        ) : docType === "html" ? (
          <div className="reading-surface min-h-[500px]">
            <h1 className="reading-title">{currentDocument.title}</h1>
            <div
              className="prose prose-sm max-w-none dark:prose-invert reading-prose"
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
              onTranscriptLoad={(segments) => {
                const transcriptText = segments.map(s => `[${formatTime(s.start)}] ${s.text}`).join("\n");
                setVideoContext(prev => ({
                  ...prev,
                  videoId: extractYouTubeId(currentDocument.filePath),
                  title: currentDocument.title,
                  transcript: transcriptText,
                }));
              }}
              onTimeUpdate={(time) => {
                setVideoContext(prev => prev ? { ...prev, currentTime: time } : null);
              }}
              onSelectionChange={(text) => {
                onSelectionChange?.(text);
              }}
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

        {/* Hover Rating Controls - for quick document rating */}
        {viewMode === "document" && !disableHoverRating && docType !== "youtube" && hasDocumentHistory && (
          <HoverRatingControls
            context="document"
            documentId={documentId}
            onRatingSubmitted={handleRating}
            position="absolute"
            disableBackdropBlur={docType === "epub"}
          />
        )}
      </div>

      {/* Floating Action Button for Extract Creation */}
      {selectedText && viewMode === "document" && (
        <div 
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[70] pointer-events-auto animate-in slide-in-from-bottom-4 duration-200"
          data-extract-button="true"
        >
          <button
            onClick={openExtractDialog}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all min-h-[48px] text-sm font-medium"
            title="Create extract from selection"
            aria-label={`Create extract from selected text (${selectedText.length} characters)`}
          >
            <Lightbulb className="w-5 h-5" aria-hidden="true" />
            <span>Create Extract</span>
            <span className="text-xs opacity-75 ml-1">({selectedText.length})</span>
          </button>
        </div>
      )}

      {/* Create Extract Dialog */}
      <CreateExtractDialog
        documentId={currentDocument.id}
        selectedText={selectedText}
        pageNumber={selectionContext?.pages[0]?.pageNumber ?? pageNumber}
        selectionContext={selectionContext}
        isOpen={isExtractDialogOpen}
        onClose={() => {
          setIsExtractDialogOpen(false);
          clearTextSelection();
        }}
        onCreate={handleExtractCreated}
      />

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

      {/* Mobile Floating Fullscreen Button (when not in fullscreen) */}
      {!isFullscreen && !isTauri() && (
        <button
          onClick={toggleFullscreen}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden"
          title="Enter Fullscreen"
          aria-label="Enter fullscreen mode"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg hover:bg-card active:scale-95 transition-all">
            <Maximize className="w-5 h-5 text-foreground" />
          </div>
        </button>
      )}
    </div>
  );
}
