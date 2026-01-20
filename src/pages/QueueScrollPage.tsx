import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ChevronUp, ChevronDown, X, Star, AlertCircle, CheckCircle, Sparkles, ExternalLink, Info, Settings2 } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import { useDocumentStore } from "../stores/documentStore";
import { useSettingsStore } from "../stores/settingsStore";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { FlashcardScrollItem } from "../components/review/FlashcardScrollItem";
import { ScrollModeArticleEditor } from "../components/review/ScrollModeArticleEditor";
import { rateDocument } from "../api/algorithm";
import { getDueItems, type LearningItem } from "../api/learning-items";
import { getDueExtracts, submitExtractReview } from "../api/extract-review";
import type { Extract } from "../api/extracts";
import { ExtractScrollItem } from "../components/review/ExtractScrollItem";
import { ClozeCreatorPopup } from "../components/extracts/ClozeCreatorPopup";
import { QACreatorPopup } from "../components/extracts/QACreatorPopup";
import { submitReview } from "../api/review";
import { getUnreadItems, type FeedItem as RSSFeedItem, type Feed as RSSFeed, markItemRead } from "../api/rss";
import { cn } from "../utils";
import type { QueueItem } from "../types";
import { ItemDetailsPopover, type ItemDetailsTarget } from "../components/common/ItemDetailsPopover";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../components/assistant/AssistantPanel";
import { getDeviceInfo } from "../lib/pwa";

/**
 * Unified scroll item type for documents, RSS articles, and flashcards
 */
interface ScrollItem {
  id: string;
  type: "document" | "rss" | "flashcard" | "extract";
  documentId?: string;
  documentTitle: string;
  isImportedWebArticle?: boolean;
  rssItem?: RSSFeedItem;
  rssFeed?: RSSFeed;
  learningItem?: LearningItem;
  extract?: Extract;
}

/**
 * QueueScrollPage - TikTok-style vertical scrolling through document queue, flashcards, and RSS articles
 *
 * Features:
 * - Full-screen immersive document reading and flashcard review
 * - Mouse wheel scroll navigation (scroll down = next, scroll up = previous)
 * - Smooth transitions between items
 * - Inline rating controls for documents and flashcards
 * - RSS article reading with mark as read
 * - Position indicator
 * - FSRS-based queue ordering for all items
 */
export function QueueScrollPage() {
  const { filteredItems: allQueueItems, loadQueue } = useQueueStore();
  const { documents, loadDocuments } = useDocumentStore();
  const { tabs, activeTabId, closeTab, updateTab } = useTabsStore();
  const { settings, updateSettingsCategory } = useSettingsStore();

  // Restore currentIndex from tab data on mount
  const getInitialIndex = useCallback(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab?.data?.currentIndex !== undefined) {
      const index = activeTab.data.currentIndex as number;
      // Ensure index is valid (not negative and within scroll items range)
      if (typeof index === 'number' && index >= 0) {
        return index;
      }
    }
    return 0;
  }, [tabs, activeTabId]);

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [renderedIndex, setRenderedIndex] = useState(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab?.data?.renderedIndex !== undefined) {
      const index = activeTab.data.renderedIndex as number;
      if (typeof index === 'number' && index >= 0) {
        return index;
      }
    }
    return 0;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollItems, setScrollItems] = useState<ScrollItem[]>([]);
  const [dueFlashcards, setDueFlashcards] = useState<LearningItem[]>([]);
  const [dueExtracts, setDueExtracts] = useState<Extract[]>([]);
  const [isRating, setIsRating] = useState(false);
  const [, setAssistantInputActive] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem("assistant-panel-position");
    return saved === "left" ? "left" : "right";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;

  // Popup state
  const [activeExtractForCloze, setActiveExtractForCloze] = useState<{ id: string, text: string, range: [number, number] } | null>(null);
  const [activeExtractForQA, setActiveExtractForQA] = useState<string | null>(null);

  const lastScrollTime = useRef(0);
  const scrollCooldown = 500; // ms between scroll actions
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExtractUpdate = useCallback((extractId: string, updates: { content: string; notes?: string }) => {
    setScrollItems(prev => prev.map((item) => (
      item.type === "extract" && item.extract?.id === extractId
        ? { ...item, extract: { ...item.extract, content: updates.content, notes: updates.notes } }
        : item
    )));
  }, []);

  // Filter documents (exclude YouTube videos - they crash in scroll mode)
  // Memoize to prevent infinite loop since this is a dependency of the useEffect below
  const documentQueueItems = useMemo(() => allQueueItems.filter((item) => {
    if (item.itemType !== "document") return false;

    const doc = documents.find(d => d.id === item.documentId);

    // Skip if document not loaded yet (shouldn't happen after loadDocuments() awaits)
    if (!doc) return false;

    // Exclude YouTube videos - they don't make sense in scroll mode and can crash
    if (doc.fileType === "youtube") return false;
    if (doc.filePath && (doc.filePath.includes("youtube.com") || doc.filePath.includes("youtu.be"))) {
      return false;
    }

    return true;
  }), [allQueueItems, documents]);

  // Load queue, documents, and due flashcards/extracts on mount
  // IMPORTANT: Await loadDocuments() to prevent race condition in YouTube filter
  useEffect(() => {
    const loadAllData = async () => {
      // Load documents first and wait for completion
      // This ensures the YouTube filter has all documents loaded before computing
      await loadDocuments();
      loadQueue();

      // Load due learning items and extracts
      try {
        const [dueItems, extracts] = await Promise.all([
          getDueItems(),
          getDueExtracts()
        ]);
        setDueFlashcards(dueItems);
        setDueExtracts(extracts);
        console.log("QueueScrollPage: Loaded", dueItems.length, "flashcards,", extracts.length, "extracts");
      } catch (error) {
        console.error("Failed to load review items:", error);
      }
    };
    loadAllData();
  }, [loadQueue, loadDocuments]);

  // Initialize renderedIndex on mount
  useEffect(() => {
    setRenderedIndex(currentIndex);
  }, []);

  // Save current position to tab data for restoration when user returns
  useEffect(() => {
    if (activeTabId && (currentIndex > 0 || renderedIndex > 0)) {
      updateTab(activeTabId, {
        data: {
          currentIndex,
          renderedIndex,
        },
      });
    }
  }, [currentIndex, renderedIndex, activeTabId, updateTab]);

  // Update scroll items when queue or flashcards change
  // Interleave: Due flashcards first, then documents, then RSS
  // Skip during rating to prevent race conditions
  useEffect(() => {
    if (isRating) return;
    // Create flashcard items from due learning items
    const flashcardItems: ScrollItem[] = dueFlashcards.map((item) => ({
      id: `flashcard-${item.id}`,
      type: "flashcard" as const,
      documentTitle: item.question.substring(0, 50) + (item.question.length > 50 ? "..." : ""),
      learningItem: item,
    }));

    // Create document items
    const docItems: ScrollItem[] = documentQueueItems.map((item) => {
      const doc = documents.find(d => d.id === item.documentId);
      const isImportedWebArticle = !!doc?.filePath && /^https?:\/\//.test(doc.filePath);
      return {
        id: item.id,
        type: "document" as const,
        documentId: item.documentId,
        documentTitle: item.documentTitle,
        isImportedWebArticle,
      };
    });

    // Load RSS unread items
    const rssUnread = getUnreadItems();
    const rssItems: ScrollItem[] = rssUnread.map(({ feed, item }) => ({
      id: `rss-${item.id}`,
      type: "rss",
      documentTitle: item.title,
      rssItem: item,
      rssFeed: feed,
    }));

    // Create extract items
    const extractItems: ScrollItem[] = dueExtracts.map((extract) => {
      // Find document title
      const doc = documents.find(d => d.id === extract.document_id);
      const title = doc ? doc.title : "Unknown Document";

      return {
        id: `extract-${extract.id}`,
        type: "extract" as const,
        documentTitle: title,
        extract: extract,
      };
    });

    // Distribute flashcards and extracts evenly throughout the queue based on percentage setting
    const flashcardPercentage = settings.scrollQueue.flashcardPercentage;
    const extractsCountAsFlashcards = settings.scrollQueue.extractsCountAsFlashcards;

    // Combine flashcards and extracts for distribution
    const reviewItems = [...flashcardItems, ...extractItems].sort(() => Math.random() - 0.5);

    // Calculate how many review items to include based on percentage
    // If percentage is 30%, then for every 100 items, 30 should be review items
    const nonReviewItems = [...docItems, ...rssItems];
    const totalNonReview = nonReviewItems.length;

    // Calculate target number of review items based on percentage
    // formula: review_items / (review_items + non_review_items) = percentage / 100
    // So: review_items = (percentage * non_review_items) / (100 - percentage)
    let targetReviewCount = 0;
    if (flashcardPercentage < 100) {
      targetReviewCount = Math.round((flashcardPercentage * totalNonReview) / (100 - flashcardPercentage));
    }

    // Limit review items to the target count
    const limitedReviewItems = reviewItems.slice(0, targetReviewCount);

    // Distribute review items evenly throughout the queue
    // This creates a more balanced experience instead of all review items at the start
    const distributedItems: ScrollItem[] = [];
    if (limitedReviewItems.length > 0 && nonReviewItems.length > 0) {
      // Calculate the interval for inserting review items
      const interval = Math.max(1, Math.round(nonReviewItems.length / limitedReviewItems.length));

      let reviewIndex = 0;
      for (let i = 0; i < nonReviewItems.length; i++) {
        distributedItems.push(nonReviewItems[i]);

        // Insert a review item after every 'interval' non-review items
        if (reviewIndex < limitedReviewItems.length && (i + 1) % interval === 0) {
          distributedItems.push(limitedReviewItems[reviewIndex]);
          reviewIndex++;
        }
      }

      // Add any remaining review items at the end
      while (reviewIndex < limitedReviewItems.length) {
        distributedItems.push(limitedReviewItems[reviewIndex]);
        reviewIndex++;
      }
    } else if (limitedReviewItems.length > 0) {
      // Only review items, use them all
      distributedItems.push(...limitedReviewItems);
    } else {
      // Only non-review items
      distributedItems.push(...nonReviewItems);
    }

    setScrollItems(distributedItems);
  }, [documentQueueItems, documents, dueFlashcards, dueExtracts, isRating, settings.scrollQueue]);

  // Current item (for display during transition)
  const currentItem = scrollItems[currentIndex];

  // Rendered item (actual document being rendered)
  const renderedItem = scrollItems[renderedIndex];

  const detailsTarget = useMemo<ItemDetailsTarget | null>(() => {
    if (!currentItem) return null;

    if (currentItem.type === "document" && currentItem.documentId) {
      const doc = documents.find(d => d.id === currentItem.documentId);
      return {
        type: "document",
        id: currentItem.documentId,
        title: currentItem.documentTitle,
        tags: doc?.tags,
        category: doc?.category,
      };
    }

    if (currentItem.type === "flashcard" && currentItem.learningItem) {
      return {
        type: "learning-item",
        id: currentItem.learningItem.id,
        title: currentItem.documentTitle,
        tags: currentItem.learningItem.tags,
      };
    }

    if (currentItem.type === "extract" && currentItem.extract) {
      return {
        type: "extract",
        id: currentItem.extract.id,
        title: currentItem.documentTitle,
        tags: currentItem.extract.tags,
        category: currentItem.extract.category,
      };
    }

    if (currentItem.type === "rss") {
      return {
        type: "rss",
        title: currentItem.documentTitle,
        source: currentItem.rssFeed?.title,
        link: currentItem.rssItem?.link,
      };
    }

    return null;
  }, [currentItem, documents]);

  const assistantContext = useMemo<AssistantContext | undefined>(() => {
    const assistantItem = renderedItem ?? currentItem;
    if (!assistantItem) return undefined;

    if (assistantItem.type === "document" && assistantItem.documentId) {
      const doc = documents.find(d => d.id === assistantItem.documentId);
      const title = doc?.title || assistantItem.documentTitle;
      const content = [title ? `Title: ${title}` : null, doc?.content]
        .filter(Boolean)
        .join("\n\n");
      return {
        type: "document",
        documentId: assistantItem.documentId,
        content: content || undefined,
      };
    }

    if (assistantItem.type === "extract" && assistantItem.extract) {
      const extractContent = [assistantItem.extract.content, assistantItem.extract.notes]
        .filter(Boolean)
        .join("\n\n");
      const title = assistantItem.documentTitle ? `Title: ${assistantItem.documentTitle}` : null;
      const content = [title, extractContent].filter(Boolean).join("\n\n");
      return {
        type: "document",
        documentId: `extract:${assistantItem.extract.id}`,
        content: content || undefined,
      };
    }

    if (assistantItem.type === "rss") {
      const title = assistantItem.rssItem?.title ? `Title: ${assistantItem.rssItem?.title}` : null;
      const rssContent = assistantItem.rssItem?.content || assistantItem.rssItem?.description;
      const content = [title, rssContent].filter(Boolean).join("\n\n");
      return {
        type: "web",
        url: assistantItem.rssItem?.link || `rss:${assistantItem.rssItem?.id}`,
        content: content || undefined,
      };
    }

    return undefined;
  }, [currentItem, renderedItem, documents]);

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
    if (currentIndex < scrollItems.length - 1 && !isTransitioning && !isRating) {
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
  }, [currentIndex, scrollItems.length, isTransitioning, isRating]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning && !isRating) {
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
  }, [currentIndex, isTransitioning, isRating]);

  const advanceAfterRemoval = useCallback((removedItemId: string) => {
    setScrollItems((prev) => {
      const updated = prev.filter((item) => item.id !== removedItemId);
      if (updated.length === 0) {
        setCurrentIndex(0);
        setRenderedIndex(0);
        return updated;
      }

      const nextIndex = Math.min(currentIndex, updated.length - 1);
      setIsTransitioning(true);
      setCurrentIndex(nextIndex);
      startTimeRef.current = Date.now();
      setTimeout(() => {
        setRenderedIndex(nextIndex);
        setIsTransitioning(false);
      }, 300);
      return updated;
    });
  }, [currentIndex]);

  // Mouse wheel scroll detection - only navigate when document can't scroll further
  // For EPUB documents, disable auto-advance to allow user to read through the entire book
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();

      // Debounce scroll events
      if (now - lastScrollTime.current < scrollCooldown) {
        return;
      }

      // Check if current item is an EPUB or PDF document
      // EPUBs and PDFs can be lengthy documents, so we don't want to auto-advance when user reaches the end
      // User should be able to scroll through the entire document freely
      let isScrollableDocument = false;
      if (currentItem?.type === "document" && currentItem.documentId) {
        const doc = documents.find(d => d.id === currentItem.documentId);
        if (doc) {
          const fileType = doc.fileType || doc.filePath?.split('.').pop()?.toLowerCase();
          isScrollableDocument = fileType === "epub" || fileType === "pdf";
        }
      }

      // For EPUB and PDF documents, don't auto-advance on scroll boundary
      // User must explicitly rate or use keyboard navigation to move to next item
      if (isScrollableDocument) {
        return; // Let the document scroll normally, no auto-advance
      }

      // Find the scrollable content element
      const target = e.target as HTMLElement;
      if (target.closest(".assistant-panel")) {
        return;
      }
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
  }, [goToNext, goToPrevious, currentItem, documents]);

  const toggleFullscreen = useCallback(async () => {
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
  }, [isFullscreen]);

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
      } else if (e.key === "F11") {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleFullscreen();
      } else if (e.key === "Escape") {
        e.stopImmediatePropagation();
        if (isFullscreen) {
          toggleFullscreen();
          return;
        }
        // Exit scroll mode
        window.history.back();
      } else if (e.key === "h" || e.key === "?") {
        // Toggle controls
        setShowControls((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [goToNext, goToPrevious, isFullscreen, toggleFullscreen]);

  // Auto-hide controls on mouse idle
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;

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

  // Handle rating (for documents, flashcards, or mark as read for RSS)
  const handleRating = async (rating: number) => {
    if (!currentItem || isRating) return;

    setIsRating(true);
    const ratedItemId = currentItem.id;

    try {
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      if (currentItem.type === "document") {
        console.log(`Rating document ${currentItem.documentId} as ${rating} (time: ${timeTaken}s)`);
        await rateDocument(currentItem.documentId!, rating, timeTaken);
        advanceAfterRemoval(ratedItemId);
        void loadQueue();
      } else if (currentItem.type === "flashcard" && currentItem.learningItem) {
        // Rate flashcard using FSRS
        console.log(`Rating flashcard ${currentItem.learningItem.id} as ${rating} (time: ${timeTaken}s)`);
        await submitReview(currentItem.learningItem.id, rating, timeTaken);

        // Remove the rated flashcard from both dueFlashcards and scrollItems
        setDueFlashcards(prev => prev.filter(item => item.id !== currentItem.learningItem!.id));
        setScrollItems(prev => prev.filter(item => item.id !== ratedItemId));
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
        const flashcardItems = scrollItems.filter(item => item.type === "flashcard");
        const extractItems = scrollItems.filter(item => item.type === "extract");
        setScrollItems([...flashcardItems, ...extractItems, ...docItems, ...rssItems]);
      } else if (currentItem.type === "extract" && currentItem.extract) {
        // Rate extract
        console.log(`Rating extract ${currentItem.extract.id} as ${rating} (time: ${timeTaken}s)`);
        await submitExtractReview(currentItem.extract.id, rating, timeTaken);

        // Remove from both dueExtracts and scrollItems
        setDueExtracts(prev => prev.filter(e => e.id !== currentItem.extract!.id));
        setScrollItems(prev => prev.filter(item => item.id !== ratedItemId));
      }

      // Auto-advance to next item after rating
      if (currentItem.type !== "document") {
        setTimeout(() => {
          goToNext();
          // Small delay to allow transition to complete before allowing new ratings
          setTimeout(() => setIsRating(false), 200);
        }, 300);
      } else {
        setTimeout(() => setIsRating(false), 300);
      }
    } catch (error) {
      console.error("Failed to handle rating:", error);
      setIsRating(false);
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
      {/* Content Viewer - Document, Flashcard, or RSS Article */}
      <div className="flex h-full w-full">
        {!isMobile && renderedItem && renderedItem.type !== "flashcard" && assistantPosition === "left" && (
          <AssistantPanel
            context={assistantContext}
            className="assistant-panel flex-shrink-0"
            onInputHoverChange={setAssistantInputActive}
            position={assistantPosition}
            onPositionChange={(newPosition) => {
              setAssistantPosition(newPosition);
              localStorage.setItem("assistant-panel-position", newPosition);
            }}
          />
        )}
        <div
          className={cn(
            "h-full flex-1 min-w-0 transition-opacity duration-300",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          {renderedItem?.type === "document" ? (() => {
            // Safety check: skip YouTube videos in scroll mode (they can crash)
            const doc = documents.find(d => d.id === renderedItem.documentId);
            if (doc?.fileType === "youtube" || doc?.filePath?.includes("youtube.com") || doc?.filePath?.includes("youtu.be")) {
              return (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-4">📺</div>
                    <p>YouTube videos are not supported in scroll mode</p>
                    <p className="text-sm mt-2">Please view this video from the Documents page</p>
                  </div>
                </div>
              );
            }
            if (renderedItem.isImportedWebArticle && doc) {
              return (
                <ScrollModeArticleEditor
                  key={renderedItem.documentId}
                  document={doc}
                />
              );
            }
            return (
              <DocumentViewer
                key={renderedItem.documentId}
                documentId={renderedItem.documentId!}
                disableHoverRating={true}
              />
            );
          })() : renderedItem?.type === "flashcard" && renderedItem.learningItem ? (
            <FlashcardScrollItem
              key={renderedItem.learningItem.id}
              learningItem={renderedItem.learningItem}
              onRate={handleRating}
            />
          ) : renderedItem?.type === "rss" ? (
            <div className="h-full w-full overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-12 mobile-reading-surface">
                {/* RSS Article Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 mobile-reading-meta">
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-md text-xs font-medium">
                      RSS
                    </span>
                    <span>{renderedItem.rssFeed?.title}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-3 mobile-reading-title">
                    {renderedItem.rssItem?.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mobile-reading-meta">
                    {renderedItem.rssItem?.pubDate && (
                      <span>{new Date(renderedItem.rssItem.pubDate).toLocaleDateString()}</span>
                    )}
                    {renderedItem.rssItem?.author && <span>• {renderedItem.rssItem.author}</span>}
                    <a
                      href={renderedItem.rssItem?.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors mobile-density-tap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open original
                    </a>
                  </div>
                </div>

                {/* RSS Article Content */}
                <div
                  className="prose prose-lg max-w-none text-foreground mobile-reading-prose"
                  dangerouslySetInnerHTML={{ __html: renderedItem.rssItem?.content || renderedItem.rssItem?.description || "" }}
                />
              </div>
            </div>
          ) : renderedItem?.type === "extract" && renderedItem.extract ? (
            <ExtractScrollItem
              key={renderedItem.extract.id}
              extract={renderedItem.extract}
              documentTitle={renderedItem.documentTitle}
              onRate={handleRating}
              onCreateCloze={(text, range) => setActiveExtractForCloze({ id: renderedItem.extract!.id, text, range })}
              onCreateQA={() => setActiveExtractForQA(renderedItem.extract!.id)}
              onUpdate={(updates) => handleExtractUpdate(renderedItem.extract!.id, updates)}
            />
          ) : (
            // Fallback for no item
            <div className="h-full flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          )}
        </div>
        {!isMobile && renderedItem && renderedItem.type !== "flashcard" && assistantPosition === "right" && (
          <AssistantPanel
            context={assistantContext}
            className="assistant-panel flex-shrink-0"
            onInputHoverChange={setAssistantInputActive}
            position={assistantPosition}
            onPositionChange={(newPosition) => {
              setAssistantPosition(newPosition);
              localStorage.setItem("assistant-panel-position", newPosition);
            }}
          />
        )}
      </div>

      {/* Popups */}
      {activeExtractForCloze && (
        <ClozeCreatorPopup
          extractId={activeExtractForCloze.id}
          selectedText={activeExtractForCloze.text}
          selectionRange={activeExtractForCloze.range}
          onCreated={(item) => {
            setActiveExtractForCloze(null);
            setDueFlashcards(prev => [item, ...prev]);
          }}
          onCancel={() => setActiveExtractForCloze(null)}
        />
      )}

      {activeExtractForQA && (
        <QACreatorPopup
          extractId={activeExtractForQA}
          onCreated={(item) => {
            setActiveExtractForQA(null);
            setDueFlashcards(prev => [item, ...prev]);
          }}
          onCancel={() => setActiveExtractForQA(null)}
        />
      )}

      {/* Scroll Queue Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm pointer-events-auto">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Queue Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Close settings"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Flashcard Percentage Setting */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">
                    Flashcard Percentage
                  </label>
                  <span className="text-sm font-mono text-primary">
                    {settings.scrollQueue.flashcardPercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.scrollQueue.flashcardPercentage}
                  onChange={(e) => {
                    updateSettingsCategory('scrollQueue', {
                      flashcardPercentage: parseInt(e.target.value)
                    });
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of the queue that should be flashcards and extracts.
                </p>
              </div>

              {/* Extracts Count as Flashcards Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Extracts count as flashcards
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Include extracts in the flashcard percentage calculation
                  </p>
                </div>
                <button
                  onClick={() => {
                    updateSettingsCategory('scrollQueue', {
                      extractsCountAsFlashcards: !settings.scrollQueue.extractsCountAsFlashcards
                    });
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.scrollQueue.extractsCountAsFlashcards ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.scrollQueue.extractsCountAsFlashcards ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="flex items-center gap-3">
              {detailsTarget && (
                <ItemDetailsPopover
                  target={detailsTarget}
                  renderTrigger={({ onClick, isOpen }) => (
                    <button
                      onClick={onClick}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm text-white text-sm transition-colors hover:bg-black/60",
                        isOpen && "bg-black/60"
                      )}
                      title="Item details"
                    >
                      <Info className="w-4 h-4" />
                      Details
                    </button>
                  )}
                />
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm text-white text-sm transition-colors hover:bg-black/60"
                title="Queue settings"
              >
                <Settings2 className="w-4 h-4" />
                Settings
              </button>
              <div className="text-white text-sm bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
                {currentItem.type === "document" && (
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-xs">DOC</span>
                    {currentItem.documentTitle}
                  </span>
                )}
                {currentItem.type === "flashcard" && (
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-purple-500/30 rounded text-xs">CARD</span>
                    {currentItem.documentTitle}
                  </span>
                )}
                {currentItem.type === "rss" && (
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-orange-500/30 rounded text-xs">RSS</span>
                    {currentItem.documentTitle}
                  </span>
                )}
                {currentItem.type === "extract" && (
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-500/30 rounded text-xs">EXTRACT</span>
                    {currentItem.documentTitle}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Rating Controls - Only for documents and RSS (flashcards have inline rating) */}
        {currentItem.type !== "flashcard" && (
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
        )}

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
          {currentItem?.type === "document" && (() => {
            const doc = documents.find(d => d.id === currentItem.documentId);
            const fileType = doc?.fileType || doc?.filePath?.split('.').pop()?.toLowerCase();
            return fileType === "epub" || fileType === "pdf"
              ? "Rate or use Alt+Arrows to navigate • H to toggle controls • Esc to exit"
              : "Scroll to edge to navigate • Alt+Arrows/Space to skip • H to toggle controls • Esc to exit";
          })()}
          {currentItem?.type !== "document" && "Scroll to edge to navigate • Alt+Arrows/Space to skip • H to toggle controls • Esc to exit"}
        </div>
      </div>
    </div>
  );
}
