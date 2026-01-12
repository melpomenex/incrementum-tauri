import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, X, Star, AlertCircle, CheckCircle, Sparkles, ExternalLink } from "lucide-react";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import { useDocumentStore } from "../stores/documentStore";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { rateDocument } from "../api/algorithm";
import { getUnreadItems, type FeedItem as RSSFeedItem, type Feed as RSSFeed, markItemRead } from "../api/rss";
import { cn } from "../utils";
import type { QueueItem } from "../types";

/**
 * Unified scroll item type for both documents and RSS articles
 */
interface ScrollItem {
  id: string;
  type: "document" | "rss";
  documentId?: string;
  documentTitle: string;
  rssItem?: RSSFeedItem;
  rssFeed?: RSSFeed;
}

/**
 * QueueScrollPage - TikTok-style vertical scrolling through document queue and RSS articles
 *
 * Features:
 * - Full-screen immersive document reading
 * - Mouse wheel scroll navigation (scroll down = next, scroll up = previous)
 * - Smooth transitions between documents
 * - Inline rating controls for documents
 * - RSS article reading with mark as read
 * - Position indicator
 * - FSRS-based queue ordering for documents
 */
export function QueueScrollPage() {
  const { filteredItems: allQueueItems, loadQueue } = useQueueStore();
  const { documents, loadDocuments } = useDocumentStore();
  const { tabs, activeTabId, closeTab } = useTabsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [scrollItems, setScrollItems] = useState<ScrollItem[]>([]);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 500; // ms between scroll actions
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter to only show documents (not learning items or extracts or YouTube videos)
  const documentQueueItems = allQueueItems.filter((item) => {
    if (item.itemType !== "document") return false;

    // Filter out YouTube videos - they don't make sense in scroll mode
    const doc = documents.find(d => d.id === item.documentId);
    if (doc && doc.fileType === "youtube") return false;

    return true;
  });

  // Load queue and documents on mount
  useEffect(() => {
    loadQueue();
    loadDocuments();
  }, [loadQueue, loadDocuments]);

  // Initialize renderedIndex on mount
  useEffect(() => {
    setRenderedIndex(currentIndex);
  }, []);

  // Update scroll items when queue changes
  useEffect(() => {
    const docItems: ScrollItem[] = documentQueueItems.map((item) => ({
      id: item.id,
      type: "document" as const,
      documentId: item.documentId,
      documentTitle: item.documentTitle,
    }));

    // Load RSS unread items
    const rssUnread = getUnreadItems();
    const rssItems: ScrollItem[] = rssUnread.map(({ feed, item }) => ({
      id: `rss-${item.id}`,
      type: "rss",
      documentTitle: item.title,
      rssItem: item,
      rssFeed: feed,
    }));

    setScrollItems([...docItems, ...rssItems]);
  }, [documentQueueItems, documents]);

  // Current item (for display during transition)
  const currentItem = scrollItems[currentIndex];

  // Rendered item (actual document being rendered)
  const renderedItem = scrollItems[renderedIndex];

  // Debug logging
  useEffect(() => {
    if (currentItem) {
      if (currentItem.type === "document") {
        const docInStore = documents.find(d => d.id === currentItem.documentId);
        console.log("QueueScrollPage state:", {
          currentIndex,
          totalItems: scrollItems.length,
          itemType: currentItem.type,
          documentId: currentItem.documentId,
          documentTitle: currentItem.documentTitle,
          documentsCount: documents.length,
          docInStore: docInStore ? {
            id: docInStore.id,
            title: docInStore.title,
            fileType: docInStore.fileType,
            filePath: docInStore.filePath,
            hasContent: !!docInStore.content,
          } : null,
        });
      } else {
        console.log("QueueScrollPage state:", {
          currentIndex,
          totalItems: scrollItems.length,
          itemType: currentItem.type,
          documentTitle: currentItem.documentTitle,
          rssFeedTitle: currentItem.rssFeed?.title,
        });
      }
    }
  }, [currentIndex, currentItem, scrollItems.length, documents]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < scrollItems.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      startTimeRef.current = Date.now();
      // Update renderedIndex after transition completes to avoid premature unmount
      setTimeout(() => {
        setRenderedIndex(nextIndex);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentIndex, scrollItems.length, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      startTimeRef.current = Date.now();
      // Update renderedIndex after transition completes to avoid premature unmount
      setTimeout(() => {
        setRenderedIndex(prevIndex);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentIndex, isTransitioning]);

  // Mouse wheel scroll detection - only navigate when document can't scroll further
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();

      // Debounce scroll events
      if (now - lastScrollTime.current < scrollCooldown) {
        return;
      }

      // Find the scrollable content element
      const target = e.target as HTMLElement;
      const scrollableElement = target.closest('[class*="overflow"]') as HTMLElement || target.closest('.prose') as HTMLElement || document.documentElement;

      if (scrollableElement) {
        const canScrollDown = scrollableElement.scrollTop < (scrollableElement.scrollHeight - scrollableElement.clientHeight - 10);
        const canScrollUp = scrollableElement.scrollTop > 10;

        // If scrolling down and document can still scroll down, let it scroll
        if (e.deltaY > 0 && canScrollDown) {
          return; // Let the document scroll normally
        }
        // If scrolling up and document can still scroll up, let it scroll
        if (e.deltaY < 0 && canScrollUp) {
          return; // Let the document scroll normally
        }
      }

      // Document is at edge, navigate to next/previous
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

  // Keyboard navigation - use modifier keys to avoid conflict with document scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if ((e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      // Navigation requires Alt key to avoid conflict with document scrolling
      const altKey = e.altKey;

      if (altKey && (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ")) {
        e.preventDefault();
        goToNext();
      } else if (altKey && (e.key === "ArrowUp" || e.key === "PageUp")) {
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

  // Handle rating (for documents) or mark as read (for RSS)
  const handleRating = async (rating: number) => {
    if (!currentItem) return;

    try {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      if (currentItem.type === "document") {
        console.log(`Rating document ${currentItem.documentId} as ${rating} (time: ${timeTaken}s)`);
        await rateDocument(currentItem.documentId!, rating, timeTaken);
      } else if (currentItem.type === "rss" && currentItem.rssItem && currentItem.rssFeed) {
        // Mark RSS item as read
        markItemRead(currentItem.rssFeed.id, currentItem.rssItem.id, true);
        console.log(`Marked RSS item ${currentItem.rssItem.id} as read (time: ${timeTaken}s)`);
        // Reload RSS items to update the list
        const rssUnread = getUnreadItems();
        const rssItems: ScrollItem[] = rssUnread.map(({ feed, item }) => ({
          id: `rss-${item.id}`,
          type: "rss",
          documentTitle: item.title,
          rssItem: item,
          rssFeed: feed,
        }));
        const docItems = scrollItems.filter(item => item.type === "document");
        setScrollItems([...docItems, ...rssItems]);
      }

      // Auto-advance to next document after rating
      setTimeout(() => {
        goToNext();
      }, 300);
    } catch (error) {
      console.error("Failed to handle rating:", error);
    }
  };

  // Handle exit
  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  if (!currentItem) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Nothing to Read</h2>
          <p className="text-muted-foreground">
            Add some documents or subscribe to RSS feeds to start your incremental reading journey
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
      {/* Content Viewer - Document or RSS Article */}
      <div
        className={cn(
          "h-full w-full transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        {renderedItem?.type === "document" ? (
          <DocumentViewer
            key={renderedItem.documentId}
            documentId={renderedItem.documentId!}
            disableHoverRating={true}
          />
        ) : renderedItem?.type === "rss" ? (
          <div className="h-full w-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-12">
              {/* RSS Article Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-md text-xs font-medium">
                    RSS
                  </span>
                  <span>{renderedItem.rssFeed?.title}</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-3">
                  {renderedItem.rssItem?.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {renderedItem.rssItem?.pubDate && (
                    <span>{new Date(renderedItem.rssItem.pubDate).toLocaleDateString()}</span>
                  )}
                  {renderedItem.rssItem?.author && <span>• {renderedItem.rssItem.author}</span>}
                  <a
                    href={renderedItem.rssItem?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open original
                  </a>
                </div>
              </div>

              {/* RSS Article Content */}
              <div
                className="prose prose-lg max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: renderedItem.rssItem?.content || renderedItem.rssItem?.description || "" }}
              />
            </div>
          </div>
        ) : (
          // Fallback for no item
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}
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
                {currentIndex + 1} / {scrollItems.length}
              </div>
            </div>

            <div className="text-white text-sm bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
              {currentItem.type === "document" && (
                <span className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-xs">DOC</span>
                  {currentItem.documentTitle}
                </span>
              )}
              {currentItem.type === "rss" && (
                <span className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-orange-500/30 rounded text-xs">RSS</span>
                  {currentItem.documentTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Side Rating Controls */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
          {currentItem.type === "document" ? (
            <>
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
            </>
          ) : (
            <button
              onClick={() => handleRating(3)}
              className="group p-4 rounded-full bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 hover:scale-110 transition-all shadow-lg"
              title="Mark as Read"
            >
              <CheckCircle className="w-7 h-7 text-white" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Mark as Read
              </span>
            </button>
          )}
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
            title="Previous Document (Alt+↑ or scroll to top)"
          >
            <ChevronUp className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex === scrollItems.length - 1}
            className={cn(
              "p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all shadow-lg",
              currentIndex === scrollItems.length - 1 && "opacity-30 cursor-not-allowed"
            )}
            title="Next Document (Alt+↓ or scroll to bottom)"
          >
            <ChevronDown className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 pointer-events-none">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / scrollItems.length) * 100}%`,
            }}
          />
        </div>

        {/* Help Text */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-xs bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg pointer-events-none">
          Scroll to edge to navigate • Alt+Arrows/Space to skip • H to toggle controls • Esc to exit
        </div>
      </div>
    </div>
  );
}
