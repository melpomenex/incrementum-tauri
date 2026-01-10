import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText, List, Brain, Lightbulb, Search, X, Maximize, Minimize } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDocumentStore, useTabsStore, useSettingsStore } from "../../stores";
import { PDFViewer } from "./PDFViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { EPUBViewer } from "./EPUBViewer";
import { YouTubeViewer } from "./YouTubeViewer";
import { ExtractsList } from "../extracts/ExtractsList";
import { LearningCardsList } from "../learning/LearningCardsList";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";
import { QueueNavigationControls } from "../queue/QueueNavigationControls";
import { HoverRatingControls } from "../review/HoverRatingControls";
import { useQueueNavigation } from "../../hooks/useQueueNavigation";
import { cn } from "../../utils";
import * as documentsApi from "../../api/documents";
import { rateDocument } from "../../api/algorithm";
import type { ReviewRating } from "../../api/review";
import { autoExtractWithCache, isAutoExtractEnabled } from "../../utils/documentAutoExtract";

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
}

export function DocumentViewer({
  documentId,
  disableHoverRating = false,
  onSelectionChange,
}: DocumentViewerProps) {
  const { documents, setCurrentDocument, currentDocument } = useDocumentStore();
  const { closeTab, tabs } = useTabsStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-width" | "fit-page">("custom");
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("document");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract creation state
  const [selectedText, setSelectedText] = useState("");
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const lastSelectionRef = useRef("");

  const updateSelection = useCallback((rawText: string | null | undefined) => {
    const text = rawText?.trim() ?? "";
    if (text && text.length > 0 && text.length < 1000) {
      setSelectedText(text);
      lastSelectionRef.current = text;
    } else {
      setSelectedText("");
    }
  }, []);

  // Timer for tracking reading time
  const startTimeRef = useRef(Date.now());

  // Queue navigation
  const queueNav = useQueueNavigation();

  useEffect(() => {
    if (documentId) {
      // Reset timer when document changes
      startTimeRef.current = Date.now();
      
      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        setCurrentDocument(doc);
        loadDocumentData(doc);
      }
    }
  }, [documentId, documents, setCurrentDocument]);

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

  const loadDocumentData = async (doc: typeof currentDocument) => {
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
      try {
        // Read file through Tauri backend instead of fetch
        const base64Data = await documentsApi.readDocumentFile(doc.filePath);

        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        console.log("[DocumentViewer] File data loaded successfully, size:", arrayBuffer.byteLength);
        setFileData(arrayBuffer);
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
      } catch (error) {
        console.error("[DocumentViewer] Auto-extract failed:", error);
      }
    }
  };

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
  const handleDocumentLoad = (numPages: number, outline: any[] = []) => {
    // Update document with page count if needed
    console.log("Document loaded:", numPages, "pages", outline.length, "outline items");
  };

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
      
      // Navigate to next document
      if (queueNav.canGoToNextDocument) {
        queueNav.goToNextDocument();
      } else {
        // Optional: show toast "Queue finished"
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

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Document not found</div>
      </div>
    );
  }

  // Infer fileType from filePath if it's missing (legacy data or import issue)
  const inferFileType = (): DocumentType => {
    if (currentDocument.fileType) {
      return currentDocument.fileType as DocumentType;
    }
    // Fallback: infer from file extension
    const ext = currentDocument.filePath?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'epub') return 'epub';
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (ext === 'html' || ext === 'htm') return 'html';
    // Check if filePath is a YouTube URL or ID
    if (currentDocument.filePath?.includes('youtube.com') ||
        currentDocument.filePath?.includes('youtu.be') ||
        currentDocument.fileType === 'youtube') {
      return 'youtube';
    }
    return 'other';
  };

  const docType = inferFileType();
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
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Back to Documents"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-border" />
          <h2 className="font-semibold text-foreground line-clamp-1 max-w-md">
            {currentDocument.title}
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
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
                className="px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-1 hover:bg-background rounded-md transition-colors"
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
              onPageChange={handlePageChange}
              onLoad={handleDocumentLoad}
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
          <div className="p-8 bg-background min-h-full">
            <MarkdownViewer document={currentDocument} content={currentDocument.content} />
          </div>
        ) : docType === "html" ? (
          <div className="p-8 bg-background min-h-[500px]">
            <h1 className="text-2xl font-bold mb-4">{currentDocument.title}</h1>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
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
        <div className="fixed bottom-6 right-6 z-10">
          <button
            onClick={openExtractDialog}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity"
            title="Create extract from selection"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium">Create Extract</span>
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
      {viewMode === "document" && !disableHoverRating && (
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
