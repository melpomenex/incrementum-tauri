import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer.mjs";
import { List, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { cn } from "../../utils";
import type { PdfDest, ViewState } from "../../types/readerPosition";
import type { DocumentPosition } from "../../types/position";
import { saveDocumentPosition, getDocumentPosition, pagePosition, scrollPosition as createScrollPosition } from "../../api/position";
import { getDocumentAuto, updateDocumentProgressAuto } from "../../api/documents";
import "./PDFViewer.css";

// Set default worker for web/PWA
// In Tauri, this will be overridden in useEffect before PDF loading
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
  suppressAutoScroll?: boolean;
  onPageChange?: (pageNumber: number) => void;
  onLoad?: (numPages: number, outline: any[]) => void;
  onPagesRendered?: () => void;
  onScrollPositionChange?: (state: {
    pageNumber: number;
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    clientHeight: number;
    scrollPercent: number;
    scale?: number;
    dest?: PdfDest | null;
  }) => void;
  onPdfInfo?: (info: { fingerprint?: string | null }) => void;
  restoreState?: ViewState | null;
  restoreRequestId?: number;
  contextPageWindow?: number;
  onTextWindowChange?: (text: string) => void;
  onSelectionChange?: (text: string) => void;
}

type ZoomMode = "custom" | "fit-width" | "fit-page";

export function PDFViewer({
  documentId,
  fileData,
  pageNumber,
  scale,
  zoomMode: externalZoomMode,
  suppressAutoScroll = false,
  onPageChange,
  onLoad,
  onPagesRendered,
  onScrollPositionChange,
  onPdfInfo,
  restoreState,
  restoreRequestId,
  contextPageWindow = 2,
  onTextWindowChange,
  onSelectionChange,
}: PDFViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const textLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textLayerBuildersRef = useRef<(TextLayerBuilder | null)[]>([]);
  const pageViewportRefs = useRef<(pdfjsLib.PDFPageViewport | null)[]>([]);
  const pageScaleRefs = useRef<(number | null)[]>([]);
  const renderTasksRef = useRef<(any | null)[]>([]);  // Track PDF.js render tasks to cancel
  const renderIdRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const textCacheRef = useRef<Map<number, string>>(new Map());
  const textWindowRef = useRef<{ start: number; end: number }>({ start: 1, end: 1 });
  const skipAutoScrollOnceRef = useRef(false);
  // Track the last restored page to prevent scroll events from resetting backwards
  const restoredPageRef = useRef<number | null>(null);
  const restorationWindowRef = useRef<number>(0);
  // Track initial load to suppress resize during first render
  const initialLoadWindowRef = useRef<number>(Date.now() + 5000); // 5 second initial protection
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [showTOC, setShowTOC] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>(externalZoomMode || "custom");
  // Lazy loading: track which pages should be rendered
  const [renderedPageRange, setRenderedPageRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const renderedPageRangeRef = useRef({ start: 1, end: 1 });

  // Position persistence refs
  const docIdRef = useRef<string>("");
  const lastSavedPositionRef = useRef<DocumentPosition | null>(null);
  const positionSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringPositionRef = useRef(false);

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
        onPdfInfo?.({ fingerprint: (pdfDoc as any).fingerprint ?? null });
        textCacheRef.current.clear();
        setNumPages(pdfDoc.numPages);
        // Clear and initialize rendered pages tracking
        renderedPagesRef.current.clear();
        // Render all pages - no lazy loading
        const initialEnd = pdfDoc.numPages;
        setRenderedPageRange({ start: 1, end: initialEnd });
        renderedPageRangeRef.current = { start: 1, end: initialEnd };
        onLoad?.(pdfDoc.numPages, []);

        // Get outline (table of contents)
        const outlineData = await pdfDoc.getOutline();
        if (outlineData) {
          setOutline(outlineData);
        }

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
    // Note: onLoad is intentionally excluded from deps - it's a callback that
    // shouldn't trigger reloading the PDF, only fileData changes should
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData]);

  // Store documentId in ref for use in callbacks
  useEffect(() => {
    docIdRef.current = documentId;
  }, [documentId]);

  // Save reading position to localStorage and backend
  const saveReadingPosition = useCallback(async (position: DocumentPosition) => {
    const docId = docIdRef.current;
    if (!docId) return;

    // Avoid redundant saves
    const lastSaved = lastSavedPositionRef.current;
    if (lastSaved && JSON.stringify(lastSaved) === JSON.stringify(position)) {
      return;
    }

    console.log("[PDFViewer] Saving reading position:", { docId, position });

    // Save to localStorage as backup
    localStorage.setItem(`pdf-position-${docId}`, JSON.stringify(position));

    // Save to backend
    try {
      await saveDocumentPosition(docId, position);
      
      // Also update document progress if it's a page position
      if (position.type === 'page') {
        await updateDocumentProgressAuto(docId, null, position.page, null);
      }
      
      lastSavedPositionRef.current = position;
    } catch (err) {
      console.warn("[PDFViewer] Failed to save position to backend:", err);
    }
  }, []);

  // Debounced save for scroll events
  const debouncedSavePosition = useCallback((position: DocumentPosition) => {
    if (positionSaveTimeoutRef.current) {
      clearTimeout(positionSaveTimeoutRef.current);
    }
    positionSaveTimeoutRef.current = setTimeout(() => {
      saveReadingPosition(position);
    }, 500);
  }, [saveReadingPosition]);

  // Load reading position from backend or localStorage
  const loadReadingPosition = useCallback(async (): Promise<DocumentPosition | null> => {
    const docId = docIdRef.current;
    if (!docId) return null;

    // Try backend first
    try {
      const remotePosition = await getDocumentPosition(docId);
      if (remotePosition) {
        console.log("[PDFViewer] Loaded position from backend:", remotePosition);
        return remotePosition;
      }
    } catch (err) {
      console.warn("[PDFViewer] Failed to load position from backend:", err);
    }

    // Fall back to localStorage
    const localData = localStorage.getItem(`pdf-position-${docId}`);
    if (localData) {
      try {
        const position = JSON.parse(localData) as DocumentPosition;
        console.log("[PDFViewer] Loaded position from localStorage:", position);
        return position;
      } catch (e) {
        console.warn("[PDFViewer] Failed to parse localStorage position:", e);
      }
    }

    // Try legacy format (just page number stored in document)
    try {
      const doc = await getDocumentAuto(docId);
      if (doc?.current_page && doc.current_page > 1) {
        console.log("[PDFViewer] Using legacy current_page from document:", doc.current_page);
        return pagePosition(doc.current_page);
      }
    } catch (err) {
      console.warn("[PDFViewer] Failed to load document data:", err);
    }

    return null;
  }, []);

  // Restore position when PDF loads (fallback when no explicit restoreState)
  useEffect(() => {
    if (!pdf || numPages === 0) return;
    if (restoreState) return;

    const restorePosition = async () => {
      isRestoringPositionRef.current = true;

      const position = await loadReadingPosition();
      if (!position) {
        isRestoringPositionRef.current = false;
        return;
      }

      console.log("[PDFViewer] Restoring position:", position);

      const attemptRestore = (attempt: number) => {
        const container = scrollContainerRef.current;
        if (!container) {
          isRestoringPositionRef.current = false;
          return;
        }

        let targetPage = 1;
        let targetScrollTop = 0;
        let ready = true;

        if (position.type === 'page') {
          targetPage = Math.max(1, Math.min(position.page, numPages));
          const pageIndex = targetPage - 1;
          const pageEl = pageContainerRefs.current[pageIndex];
          if (!pageEl || pageEl.offsetHeight === 0) {
            ready = false;
          } else if (position.offset !== undefined && position.offset > 0) {
            targetScrollTop = pageEl.offsetTop + (pageEl.offsetHeight * position.offset);
          } else {
            targetScrollTop = Math.max(0, pageEl.offsetTop - 16);
          }
        } else if (position.type === 'scroll') {
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
          if (maxScroll <= 0) {
            ready = false;
          } else {
            targetScrollTop = (position.percent / 100) * maxScroll;
          }

          if (ready) {
            for (let i = 0; i < pageContainerRefs.current.length; i++) {
              const pageEl = pageContainerRefs.current[i];
              if (!pageEl || pageEl.offsetHeight === 0) {
                ready = false;
                break;
              }
              if (pageEl.offsetTop - 24 <= targetScrollTop) {
                targetPage = i + 1;
              } else {
                break;
              }
            }
          }
        }

        if (!ready) {
          if (attempt < 15) {
            setTimeout(() => attemptRestore(attempt + 1), 200);
          } else {
            isRestoringPositionRef.current = false;
          }
          return;
        }

        restoredPageRef.current = targetPage;
        restorationWindowRef.current = Date.now() + 2000;

        if (targetPage !== pageNumber) {
          onPageChange?.(targetPage);
        }

        setTimeout(() => {
          const activeContainer = scrollContainerRef.current;
          if (activeContainer) {
            isProgrammaticScrollRef.current = true;
            activeContainer.scrollTop = targetScrollTop;
            console.log("[PDFViewer] Scrolled to position:", { targetPage, targetScrollTop });

            setTimeout(() => {
              isProgrammaticScrollRef.current = false;
              isRestoringPositionRef.current = false;
            }, 300);
          } else {
            isRestoringPositionRef.current = false;
          }
        }, 100);
      };

      attemptRestore(0);
    };

    const timeout = setTimeout(restorePosition, 500);
    return () => clearTimeout(timeout);
  }, [pdf, numPages, pageNumber, onPageChange, loadReadingPosition, restoreState]);

  // Cleanup position save timeout on unmount
  useEffect(() => {
    return () => {
      if (positionSaveTimeoutRef.current) {
        clearTimeout(positionSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const renderInitialPages = async () => {
      if (!pdf) return;
      const renderId = ++renderIdRef.current;

      console.log("PDFViewer: Rendering all", numPages, "pages");

      for (let i = 1; i <= numPages; i++) {
        if (!mounted || renderId !== renderIdRef.current) {
          return;
        }
        // Mark as rendered before actual render to prevent duplicate renders
        renderedPagesRef.current.add(i);
        await renderPage(pdf, i);
      }

      // Call onPagesRendered after all pages are rendered
      if (mounted && renderId === renderIdRef.current) {
        onPagesRendered?.();
      }
    };

    renderInitialPages();

    return () => {
      mounted = false;
    };
    // Note: onPagesRendered is intentionally excluded from deps as it's a callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, numPages, scale, zoomMode]);

  // Sync renderedPageRangeRef when state changes
  useEffect(() => {
    renderedPageRangeRef.current = renderedPageRange;
  }, [renderedPageRange]);

  useEffect(() => {
    if (!pdf || !onTextWindowChange) return;

    const start = Math.max(1, pageNumber - contextPageWindow);
    const end = Math.min(pdf.numPages, pageNumber + contextPageWindow);
    textWindowRef.current = { start, end };

    const updateWindow = () => {
      const { start: windowStart, end: windowEnd } = textWindowRef.current;
      const chunks: string[] = [];
      for (let page = windowStart; page <= windowEnd; page += 1) {
        const cached = textCacheRef.current.get(page);
        if (cached) {
          chunks.push(cached);
        }
      }
      if (chunks.length > 0) {
        onTextWindowChange(chunks.join("\n\n"));
      }
    };

    const extractPageText = async (pageNum: number) => {
      if (textCacheRef.current.has(pageNum)) return;
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          textCacheRef.current.set(pageNum, text);
          updateWindow();
        }
      } catch (err) {
        console.warn("Failed to extract PDF text for page", pageNum, err);
      }
    };

    updateWindow();
    for (let page = start; page <= end; page += 1) {
      void extractPageText(page);
    }
    // Note: onTextWindowChange is intentionally excluded from deps - callbacks
    // shouldn't trigger effect re-runs, only data changes should
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, pageNumber, contextPageWindow]);

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
        const container = scrollContainerRef.current;
        if (!container) return;

        // Skip resize handling while scroll position restoration is in progress
        // suppressAutoScroll is controlled by DocumentViewer and stays true until restoration completes
        if (suppressAutoScroll) {
          console.log("PDFViewer: Skipping resize - suppressAutoScroll is true");
          return;
        }

        // Also skip during protection windows
        const now = Date.now();
        const isInInitialLoadWindow = now < initialLoadWindowRef.current;
        const isInRestorationWindow = now < restorationWindowRef.current;
        if (isInInitialLoadWindow || isInRestorationWindow) {
          console.log("PDFViewer: Skipping resize during protection window", { isInInitialLoadWindow, isInRestorationWindow });
          return;
        }

        if (pdf && (zoomMode === "fit-width" || zoomMode === "fit-page")) {
          console.log("PDFViewer: Container resized, re-rendering all pages");

          // Save current scroll position before re-render
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

          console.log("PDFViewer: Re-rendering all", numPages, "pages");

          // Re-render all pages
          const renderId = ++renderIdRef.current;
          for (let i = 1; i <= numPages; i++) {
            if (renderId !== renderIdRef.current) {
              return;
            }
            // Mark as rendered and re-render when zoom mode changes
            renderedPagesRef.current.add(i);
            await renderPage(pdf, i);
          }

          // Restore scroll position after re-render (based on percentage)
          if (container.scrollHeight > 0 && scrollPercent > 0) {
            const newScrollTop = scrollPercent * container.scrollHeight;
            container.scrollTop = newScrollTop;
            console.log("PDFViewer: Restored scroll position after resize", { scrollPercent, newScrollTop });
          }
        }
      }, 100);
    });

    resizeObserver.observe(scrollContainerRef.current);
    // Also observe outer container to catch width changes from assistant panel show/hide
    if (outerContainerRef.current) {
      resizeObserver.observe(outerContainerRef.current);
    }

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [pdf, pageNumber, zoomMode, suppressAutoScroll]);

  // Handle text selection changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onSelectionChange) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      onSelectionChange(text);
    };

    container.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onSelectionChange]);

  const renderPage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const pageIndex = pageNum - 1;
    const canvas = canvasRefs.current[pageIndex];
    const textLayer = textLayerRefs.current[pageIndex];
    const pageContainer = pageContainerRefs.current[pageIndex];
    const scrollContainer = scrollContainerRef.current;

    if (!canvas || !textLayer || !pageContainer) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Calculate scale based on zoom mode
    let actualScale = scale;
    if (zoomMode === "fit-width") {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = (scrollContainer?.clientWidth ?? pageContainer.clientWidth) - 32; // padding
      if (containerWidth > 0) {
        actualScale = containerWidth / viewport.width;
      }
    } else if (zoomMode === "fit-page") {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = (scrollContainer?.clientWidth ?? pageContainer.clientWidth) - 32;
      const containerHeight = (scrollContainer?.clientHeight ?? pageContainer.clientHeight) - 32;
      if (containerWidth > 0 && containerHeight > 0) {
        const scaleWidth = containerWidth / viewport.width;
        const scaleHeight = containerHeight / viewport.height;
        actualScale = Math.min(scaleWidth, scaleHeight);
      }
    }

    const viewport = page.getViewport({ scale: actualScale });
    pageViewportRefs.current[pageIndex] = viewport;
    pageScaleRefs.current[pageIndex] = actualScale;
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;

    // Clear and setup text layer
    textLayer.innerHTML = "";
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;

    // Cancel any previous render task for this page
    const previousTask = renderTasksRef.current[pageIndex];
    if (previousTask) {
      try {
        previousTask.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      renderTasksRef.current[pageIndex] = null;
    }

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    };

    const renderTask = page.render(renderContext);
    renderTasksRef.current[pageIndex] = renderTask;

    try {
      await renderTask.promise;
    } catch (err: any) {
      // Ignore cancelled render errors
      if (err?.name === 'RenderingCancelledException') {
        return;
      }
      throw err;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Render text layer for text selection (PDF.js implementation)
    try {
      textLayerBuildersRef.current[pageIndex]?.cancel();
      textLayerBuildersRef.current[pageIndex] = null;
      textLayer.innerHTML = "";
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      const textLayerBuilder = new TextLayerBuilder({
        pdfPage: page,
        onAppend: (layer) => {
          textLayer.appendChild(layer);
        },
      });

      textLayerBuildersRef.current[pageIndex] = textLayerBuilder;
      await textLayerBuilder.render({ viewport });
    } catch (err) {
      console.warn("Text layer rendering failed:", err);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    const pageContainer = pageContainerRefs.current[pageNumber - 1];
    if (!container || !pageContainer) return;

    if (suppressAutoScroll) {
      skipAutoScrollOnceRef.current = true;
      // Track the restored page to prevent scroll events from resetting it backwards
      restoredPageRef.current = pageNumber;
      // Set a protection window - ignore ALL auto-scrolls for 2 seconds after restoration
      restorationWindowRef.current = Date.now() + 2000;
      return;
    }

    // Check if we're still in the restoration protection window
    const now = Date.now();
    const isInRestorationWindow = now < restorationWindowRef.current;

    if (skipAutoScrollOnceRef.current) {
      skipAutoScrollOnceRef.current = false;
      // Don't scroll during restoration window
      if (isInRestorationWindow) {
        console.log("[PDFViewer] Skipping auto-scroll during restoration window", { pageNumber, restoredPage: restoredPageRef.current });
        return;
      }
    }

    // Block any auto-scroll that would take us to a different page during restoration window
    if (isInRestorationWindow && restoredPageRef.current !== null && pageNumber !== restoredPageRef.current) {
      console.log("[PDFViewer] Blocking auto-scroll to different page during restoration:", { pageNumber, restoredPage: restoredPageRef.current });
      return;
    }

    isProgrammaticScrollRef.current = true;
    container.scrollTo({ top: Math.max(0, pageContainer.offsetTop - 16), behavior: "smooth" });

    const timeout = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [pageNumber, numPages, suppressAutoScroll]);

  useEffect(() => {
    if (!restoreState || restoreRequestId === undefined) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const pageIndex = Math.max(0, restoreState.pageNumber - 1);
    const pageEl = pageContainerRefs.current[pageIndex];
    const viewport = pageViewportRefs.current[pageIndex];

    let targetScrollTop: number | null = null;
    let targetScrollLeft: number | null = null;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

    if (restoreState.dest && pageEl && viewport) {
      const left = restoreState.dest.left ?? 0;
      const top = restoreState.dest.top ?? 0;
      const [viewportX, viewportY] = viewport.convertToViewportPoint(left, top);
      targetScrollTop = pageEl.offsetTop + viewportY;
      targetScrollLeft = viewportX;
    } else if (
      typeof restoreState.scrollTop === "number"
      || typeof restoreState.scrollPercent === "number"
    ) {
      const scrollLeft = typeof restoreState.scrollLeft === "number" ? restoreState.scrollLeft : null;
      if (typeof restoreState.scrollPercent === "number" && maxScroll > 0) {
        const percentScrollTop = (restoreState.scrollPercent / 100) * maxScroll;
        if (typeof restoreState.scrollTop === "number") {
          const delta = Math.abs(restoreState.scrollTop - percentScrollTop);
          const threshold = Math.max(200, maxScroll * 0.05);
          targetScrollTop = delta > threshold ? percentScrollTop : restoreState.scrollTop;
        } else {
          targetScrollTop = percentScrollTop;
        }
      } else if (typeof restoreState.scrollTop === "number") {
        targetScrollTop = restoreState.scrollTop;
      } else if (typeof restoreState.scrollPercent === "number") {
        targetScrollTop = (restoreState.scrollPercent / 100) * maxScroll;
      }
      targetScrollLeft = scrollLeft;
    }

    if (targetScrollTop === null) return;
    const clamped = Math.min(Math.max(0, targetScrollTop), maxScroll);

    restoredPageRef.current = restoreState.pageNumber;
    restorationWindowRef.current = Date.now() + 2000;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = clamped;

    // Restore horizontal scroll position if available
    if (targetScrollLeft !== null) {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollLeft = Math.min(Math.max(0, targetScrollLeft), maxScrollLeft);
    }

    const timeout = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [restoreRequestId, restoreState]);


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
      const targetNode = e.target as Node;
      if (textLayerRefs.current.some((layer) => layer?.contains(targetNode))) return;
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

  // Track which pages have been rendered
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // Sync scroll position
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setScrollPosition({ x: -container.scrollLeft, y: -container.scrollTop });
    }

    if (!container || scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (isProgrammaticScrollRef.current) return;

      const scrollTop = container.scrollTop;
      let currentPage = 1;
      for (let i = 0; i < pageContainerRefs.current.length; i += 1) {
        const pageEl = pageContainerRefs.current[i];
        if (!pageEl) continue;
        if (pageEl.offsetTop - 24 <= scrollTop) {
          currentPage = i + 1;
        } else {
          break;
        }
      }

      if (currentPage !== pageNumber && !suppressAutoScroll) {
        // Check if we're in a restoration protection window
        const now = Date.now();
        const isInRestorationWindow = now < restorationWindowRef.current;
        const restoredPage = restoredPageRef.current;

        // Block backward page changes during restoration window to prevent reset to page 1
        if (isInRestorationWindow && restoredPage !== null && currentPage < restoredPage) {
          console.log("[PDFViewer] Blocking backward page change during restoration:", { currentPage, restoredPage });
        } else {
          // Clear restoration tracking if we've moved past the window or forward
          if (!isInRestorationWindow) {
            restoredPageRef.current = null;
          }
          onPageChange?.(currentPage);
        }
      }

      let dest: PdfDest | null = null;
      const pageIndex = currentPage - 1;
      const pageEl = pageContainerRefs.current[pageIndex];
      const viewport = pageViewportRefs.current[pageIndex];
      const pageScale = pageScaleRefs.current[pageIndex] ?? scale;
      if (pageEl && viewport) {
        const relativeTop = Math.max(0, scrollTop - pageEl.offsetTop);
        const relativeLeft = Math.max(0, container.scrollLeft);
        const [pdfX, pdfY] = viewport.convertToPdfPoint(relativeLeft, relativeTop);
        dest = {
          kind: "XYZ",
          left: Number.isFinite(pdfX) ? pdfX : null,
          top: Number.isFinite(pdfY) ? pdfY : null,
          zoom: Number.isFinite(pageScale) ? pageScale : null,
        };
      }

      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      const scrollLeft = container.scrollLeft;
      console.log("[PDFViewer] Scroll position change:", { currentPage, scrollTop, scrollLeft, scrollPercent });
      onScrollPositionChange?.({
        pageNumber: currentPage,
        scrollTop,
        scrollLeft,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        scrollPercent,
        scale: pageScaleRefs.current[pageIndex] ?? scale,
        dest,
      });

      // Save position on scroll (debounced)
      if (!isRestoringPositionRef.current) {
        const pageEl = pageContainerRefs.current[pageIndex];
        let position: DocumentPosition;
        
        if (pageEl && scrollTop >= pageEl.offsetTop) {
          // Calculate offset within current page (0-1)
          const offset = (scrollTop - pageEl.offsetTop) / pageEl.offsetHeight;
          position = pagePosition(currentPage, Math.min(1, Math.max(0, offset)));
        } else {
          // Use scroll percentage as fallback
          position = createScrollPosition(scrollPercent);
        }
        
        debouncedSavePosition(position);
      }
    });
  };

  return (
    <div ref={outerContainerRef} className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg m-4">
          Failed to load PDF: {error}
        </div>
      )}

      <div className="flex flex-1 relative">
        {/* Table of Contents Sidebar - Overlay on mobile, inline on desktop */}
        {showTOC && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowTOC(false)}
            />
            {/* TOC Panel */}
            <div className="fixed md:relative inset-y-0 left-0 md:left-auto w-[280px] md:w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0 z-50">
              <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Table of Contents</h3>
                <button
                  onClick={() => setShowTOC(false)}
                  className="p-2 hover:bg-muted rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
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
          </>
        )}

        {/* Main Viewer Area */}
        <div className="flex-1 flex flex-col">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between p-1 md:p-2 border-b border-border bg-card gap-2 overflow-x-auto">
            <div className="flex items-center gap-0.5 md:gap-1">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className={cn(
                  "p-2 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center",
                  showTOC ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Toggle Table of Contents"
              >
                <List className="w-4 h-4 md:w-4 md:h-4" />
              </button>

              <div className="hidden md:block h-6 w-px bg-border mx-2" />

              <button
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Previous Page (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs md:text-sm text-muted-foreground min-w-[70px] md:min-w-[100px] text-center whitespace-nowrap">
                {pageNumber}/{numPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Next Page (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 md:gap-1">
              {/* Zoom Mode Buttons - Hide some on mobile */}
              <button
                onClick={() => handleZoomModeChange("fit-page")}
                className={cn(
                  "hidden md:flex p-2 rounded-md transition-colors min-w-[36px] min-h-[36px] items-center justify-center",
                  zoomMode === "fit-page" ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"
                )}
                title="Fit to Page"
              >
                <Maximize className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleZoomModeChange("fit-width")}
                className={cn(
                  "p-2 rounded-md transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center",
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
            className={cn(
              "flex-1 overflow-auto bg-muted/30 p-4",
              isDragging && "cursor-grabbing",
              !isDragging && (scale > 1 || zoomMode === "custom") && "cursor-grab"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            data-document-scroll-container
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading PDF...</div>
              </div>
            ) : (
              <div className="mx-auto flex flex-col items-center gap-6">
                {Array.from({ length: numPages }, (_, index) => {
                  const pageNum = index + 1;
                  return (
                    <div
                      key={index}
                      ref={(el) => {
                        pageContainerRefs.current[index] = el;
                      }}
                      data-pdf-page
                      data-page-number={pageNum}
                      className="relative shadow-lg border border-border bg-white transition-transform duration-200"
                    >
                      <canvas
                        ref={(el) => {
                          canvasRefs.current[index] = el;
                        }}
                        className="block"
                      />
                      <div
                        ref={(el) => {
                          textLayerRefs.current[index] = el;
                        }}
                        className="textLayer absolute top-0 left-0 overflow-hidden"
                        style={{ transformOrigin: "0 0", zIndex: 10 }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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
