import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer.mjs";
import { List, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { cn } from "../../utils";
import "./PDFViewer.css";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFViewerProps {
  documentId: string;
  fileData: Uint8Array;
  pageNumber: number;
  scale: number;
  zoomMode?: ZoomMode;
  onPageChange?: (pageNumber: number) => void;
  onLoad?: (numPages: number, outline: any[]) => void;
}

type ZoomMode = "custom" | "fit-width" | "fit-page";

export function PDFViewer({
  documentId: _documentId,
  fileData,
  pageNumber,
  scale,
  zoomMode: externalZoomMode,
  onPageChange,
  onLoad,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textLayerBuilderRef = useRef<TextLayerBuilder | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [showTOC, setShowTOC] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>(externalZoomMode || "custom");

  // Pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Update zoom mode when external prop changes
  useEffect(() => {
    if (externalZoomMode) {
      setZoomMode(externalZoomMode);
    }
  }, [externalZoomMode]);

  useEffect(() => {
    let mounted = true;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({ data: fileData.slice() });
        const pdfDoc = await loadingTask.promise;

        if (!mounted) return;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        onLoad?.(pdfDoc.numPages, []);

        // Get outline (table of contents)
        const outlineData = await pdfDoc.getOutline();
        if (outlineData) {
          setOutline(outlineData);
        }

        // Render the requested page
        await renderPage(pdfDoc, pageNumber);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
    };
  }, [fileData, onLoad]);

  useEffect(() => {
    let mounted = true;

    const renderCurrentPage = async () => {
      if (!pdf) return;

      if (mounted) {
        await renderPage(pdf, pageNumber);
      }
    };

    renderCurrentPage();

    return () => {
      mounted = false;
    };
  }, [pdf, pageNumber, scale, zoomMode]);

  // ResizeObserver to handle container resize (e.g., when assistant panel is resized)
  useEffect(() => {
    if (!pdf || !scrollContainerRef.current) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calls to avoid excessive re-renders
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(async () => {
        if (pdf && (zoomMode === "fit-width" || zoomMode === "fit-page")) {
          console.log("PDFViewer: Container resized, re-rendering page");
          await renderPage(pdf, pageNumber);
        }
      }, 100);
    });

    resizeObserver.observe(scrollContainerRef.current);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [pdf, pageNumber, zoomMode]);

  const renderPage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const container = containerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Calculate scale based on zoom mode
    let actualScale = scale;
    if (zoomMode === "fit-width") {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = (scrollContainer?.clientWidth ?? container.clientWidth) - 32; // padding
      actualScale = containerWidth / viewport.width;
    } else if (zoomMode === "fit-page") {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = (scrollContainer?.clientWidth ?? container.clientWidth) - 32;
      const containerHeight = (scrollContainer?.clientHeight ?? container.clientHeight) - 32;
      const scaleWidth = containerWidth / viewport.width;
      const scaleHeight = containerHeight / viewport.height;
      actualScale = Math.min(scaleWidth, scaleHeight);
    }

    const viewport = page.getViewport({ scale: actualScale });
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Clear and setup text layer
    if (textLayer) {
      textLayer.innerHTML = "";
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;
    }

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    };

    await page.render(renderContext).promise;
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Render text layer for text selection (PDF.js implementation)
    if (textLayer) {
      try {
        textLayerBuilderRef.current?.cancel();
        textLayerBuilderRef.current = null;
        textLayer.innerHTML = "";
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        const textLayerBuilder = new TextLayerBuilder({
          pdfPage: page,
          onAppend: (layer) => {
            textLayer.appendChild(layer);
          },
        });

        textLayerBuilderRef.current = textLayerBuilder;
        await textLayerBuilder.render({ viewport });
      } catch (err) {
        console.warn("Text layer rendering failed:", err);
      }
    }
  };


  const handlePrevPage = () => {
    if (pageNumber > 1) {
      onPageChange?.(pageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) {
      onPageChange?.(pageNumber + 1);
    }
  };

  const handleTocClick = async (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < numPages) {
      onPageChange?.(pageIndex + 1);
    }
  };

  const handleZoomModeChange = (mode: ZoomMode) => {
    setZoomMode(mode);
  };

  const renderOutline = (items: any[], depth = 0): React.ReactElement[] => {
    return items.map((item, index) => (
      <div key={index}>
        <button
          onClick={() => {
            if (item.dest) {
              // Handle destination - could be a page number or array
              if (typeof item.dest === "number") {
                handleTocClick(item.dest);
              } else if (Array.isArray(item.dest) && item.dest[0] !== null) {
                handleTocClick(item.dest[0]);
              }
            }
          }}
          className={cn(
            "block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors",
            depth > 0 && "pl-6"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {item.title}
        </button>
        {item.items && renderOutline(item.items, depth + 1)}
      </div>
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      handlePrevPage();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      handleNextPage();
    }
  };

  // Pan/drag handlers for zoomed content
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable drag when zoomed in and not clicking on links
    if (scale > 1 || zoomMode === "custom") {
      if (textLayerRef.current && textLayerRef.current.contains(e.target as Node)) {
        return;
      }
      setIsDragging(true);
      setDragStart({ x: e.clientX - scrollPosition.x, y: e.clientY - scrollPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = scrollContainerRef.current;
    if (container) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      container.scrollLeft = -newX;
      container.scrollTop = -newY;
      setScrollPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Sync scroll position
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setScrollPosition({ x: -container.scrollLeft, y: -container.scrollTop });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg m-4">
          Failed to load PDF: {error}
        </div>
      )}

      <div className="flex flex-1">
        {/* Table of Contents Sidebar */}
        {showTOC && (
          <div className="w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Table of Contents</h3>
              <button
                onClick={() => setShowTOC(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <nav className="p-2">
              {outline.length > 0 ? (
                renderOutline(outline)
              ) : (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  No table of contents available
                </p>
              )}
            </nav>
          </div>
        )}

        {/* Main Viewer Area */}
        <div className="flex-1 flex flex-col">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-border bg-card">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  showTOC ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Toggle Table of Contents"
              >
                <List className="w-4 h-4" />
              </button>

              <div className="h-6 w-px bg-border mx-2" />

              <button
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Page (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                Page {pageNumber} of {numPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Page (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Zoom Mode Buttons */}
              <button
                onClick={() => handleZoomModeChange("fit-page")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  zoomMode === "fit-page" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Fit to Page"
              >
                <Maximize className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleZoomModeChange("fit-width")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  zoomMode === "fit-width" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Fit to Width"
              >
                <Minimize className="w-4 h-4" />
              </button>

              <div className="h-6 w-px bg-border mx-2" />

              <button
                onClick={() => handleZoomModeChange("custom")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  zoomMode === "custom" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Custom Zoom"
              >
                <span className="text-xs font-medium">
                  {Math.round(scale * 100)}%
                </span>
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 p-4"
          >
            <div
              ref={containerRef}
              className={cn(
                "relative",
                isDragging && "cursor-grabbing",
                !isDragging && (scale > 1 || zoomMode === "custom") && "cursor-grab"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading PDF...</div>
                </div>
              ) : (
                <div className="relative shadow-lg border border-border bg-white transition-transform duration-200">
                  <canvas
                    ref={canvasRef}
                    className="block"
                  />
                  <div
                    ref={textLayerRef}
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{ transformOrigin: "0 0" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Page Navigation Footer */}
          {numPages > 0 && !isLoading && (
            <div className="flex items-center justify-center gap-4 p-3 border-t border-border bg-card text-xs text-muted-foreground">
              <span>Use arrow keys to navigate</span>
              <span>•</span>
              <span>Text selection enabled</span>
              <span>•</span>
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="hover:text-foreground transition-colors"
              >
                Toggle TOC
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
