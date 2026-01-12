import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, X, Star, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { rateDocument } from "../api/algorithm";
import { cn } from "../utils";
import type { QueueItem } from "../types";

/**
 * QueueScrollPage - TikTok-style vertical scrolling through document queue
 *
 * Features:
 * - Full-screen immersive document reading
 * - Mouse wheel scroll navigation (scroll down = next, scroll up = previous)
 * - Smooth transitions between documents
 * - Inline rating controls
 * - Position indicator
 * - FSRS-based queue ordering
 */
export function QueueScrollPage() {
  const { filteredItems: queueItems, loadQueue } = useQueueStore();
  const { tabs, activeTabId, closeTab } = useTabsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 500; // ms between scroll actions
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Current document
  const currentDocument = queueItems[currentIndex];

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < queueItems.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
      startTimeRef.current = Date.now();
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, queueItems.length, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev - 1);
      startTimeRef.current = Date.now();
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  // Mouse wheel scroll detection
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();

      // Debounce scroll events
      if (now - lastScrollTime.current < scrollCooldown) {
        return;
      }

      lastScrollTime.current = now;

      // Scroll down = next document
      if (e.deltaY > 0) {
        goToNext();
      }
      // Scroll up = previous document
      else if (e.deltaY < 0) {
        goToPrevious();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: true });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, [goToNext, goToPrevious]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if ((e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "Escape") {
        // Exit scroll mode
        window.history.back();
      } else if (e.key === "h" || e.key === "?") {
        // Toggle controls
        setShowControls((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Auto-hide controls on mouse idle
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(hideTimeout);
    };
  }, []);

  // Handle rating
  const handleRating = async (rating: number) => {
    if (!currentDocument) return;

    try {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      console.log(`Rating document ${currentDocument.documentId} as ${rating} (time: ${timeTaken}s)`);

      await rateDocument(currentDocument.documentId, rating, timeTaken);

      // Auto-advance to next document after rating
      setTimeout(() => {
        goToNext();
      }, 300);
    } catch (error) {
      console.error("Failed to rate document:", error);
    }
  };

  // Handle exit
  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  if (!currentDocument) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Queue is Empty</h2>
          <p className="text-muted-foreground">
            Add some documents to start your incremental reading journey
          </p>
          <button
            onClick={handleExit}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen overflow-hidden bg-background relative"
    >
      {/* Document Viewer */}
      <div
        className={cn(
          "h-full w-full transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        <DocumentViewer
          documentId={currentDocument.documentId}
          disableHoverRating={true}
        />
      </div>

      {/* Overlay Controls */}
      <div
        className={cn(
          "fixed inset-0 pointer-events-none transition-opacity duration-300 z-50",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top Bar - Position & Exit */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={handleExit}
                className="p-2 rounded-lg bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
                title="Exit Scroll Mode (Esc)"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="text-white font-medium text-sm bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
                {currentIndex + 1} / {queueItems.length}
              </div>
            </div>

            <div className="text-white text-sm bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
              {currentDocument.documentTitle}
            </div>
          </div>
        </div>

        {/* Side Rating Controls */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
          <button
            onClick={() => handleRating(1)}
            className="group p-3 rounded-full bg-red-500/80 backdrop-blur-sm hover:bg-red-500 hover:scale-110 transition-all shadow-lg"
            title="Again - Forgot completely (1)"
          >
            <AlertCircle className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Again (1)
            </span>
          </button>

          <button
            onClick={() => handleRating(2)}
            className="group p-3 rounded-full bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 hover:scale-110 transition-all shadow-lg"
            title="Hard - Difficult recall (2)"
          >
            <Star className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Hard (2)
            </span>
          </button>

          <button
            onClick={() => handleRating(3)}
            className="group p-3 rounded-full bg-blue-500/80 backdrop-blur-sm hover:bg-blue-500 hover:scale-110 transition-all shadow-lg"
            title="Good - Normal recall (3)"
          >
            <CheckCircle className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Good (3)
            </span>
          </button>

          <button
            onClick={() => handleRating(4)}
            className="group p-3 rounded-full bg-green-500/80 backdrop-blur-sm hover:bg-green-500 hover:scale-110 transition-all shadow-lg"
            title="Easy - Perfect recall (4)"
          >
            <Sparkles className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Easy (4)
            </span>
          </button>
        </div>

        {/* Bottom Navigation Arrows */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={cn(
              "p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all shadow-lg",
              currentIndex === 0 && "opacity-30 cursor-not-allowed"
            )}
            title="Previous Document (↑)"
          >
            <ChevronUp className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex === queueItems.length - 1}
            className={cn(
              "p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all shadow-lg",
              currentIndex === queueItems.length - 1 && "opacity-30 cursor-not-allowed"
            )}
            title="Next Document (↓)"
          >
            <ChevronDown className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 pointer-events-none">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / queueItems.length) * 100}%`,
            }}
          />
        </div>

        {/* Help Text */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-xs bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg pointer-events-none">
          Scroll or use arrow keys to navigate • Press H to toggle controls • Press Esc to exit
        </div>
      </div>
    </div>
  );
}
