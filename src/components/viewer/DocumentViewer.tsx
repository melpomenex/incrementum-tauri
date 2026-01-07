import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText, List, Brain, Lightbulb, Search, X } from "lucide-react";
import { useDocumentStore } from "../../stores";
import { PDFViewer } from "./PDFViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { EPUBViewer } from "./EPUBViewer";
import { ExtractsList } from "../extracts/ExtractsList";
import { LearningCardsList } from "../learning/LearningCardsList";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";
import { cn } from "../../utils";

type ViewMode = "document" | "extracts" | "cards";

type DocumentType = "pdf" | "epub" | "markdown" | "html";

export function DocumentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, setCurrentDocument, currentDocument } = useDocumentStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-width" | "fit-page">("custom");
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("document");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract creation state
  const [selectedText, setSelectedText] = useState("");
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        setCurrentDocument(doc);
        loadDocumentData(doc);
      } else {
        navigate("/documents");
      }
    }
  }, [id, documents, setCurrentDocument, navigate]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0 && text.length < 1000) {
        setSelectedText(text);
      } else {
        setSelectedText("");
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if ((e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
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

      // Escape to close dialogs
      if (e.key === "Escape") {
        if (showSearch) setShowSearch(false);
        if (isExtractDialogOpen) {
          setIsExtractDialogOpen(false);
          setSelectedText("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, showSearch, isExtractDialogOpen]);

  const loadDocumentData = async (doc: typeof currentDocument) => {
    if (!doc) return;

    setIsLoading(true);

    if (doc.fileType === "pdf" || doc.fileType === "epub") {
      try {
        const response = await fetch(`file://${doc.filePath}`);
        const arrayBuffer = await response.arrayBuffer();
        setFileData(arrayBuffer);
      } catch (error) {
        console.error(`Failed to load ${doc.fileType}:`, error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
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
    setIsExtractDialogOpen(true);
  };

  // Handle search
  const handleSearch = () => {
    // TODO: Implement actual document search
    console.log("Searching for:", searchQuery);
  };

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Document not found</div>
      </div>
    );
  }

  const docType = currentDocument.fileType as DocumentType;
  const hasPageNavigation = docType === "pdf" || docType === "epub";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/documents")}
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
              onPageChange={handlePageChange}
              onLoad={handleDocumentLoad}
            />
          </div>
        ) : docType === "epub" && fileData ? (
          <div className="h-full">
            <EPUBViewer
              fileData={fileData}
              fileName={currentDocument.title}
              onLoad={handleDocumentLoad}
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Preview not available
              </h3>
              <p className="text-muted-foreground">
                Document type '{currentDocument.fileType}' preview is coming soon
              </p>
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
    </div>
  );
}
