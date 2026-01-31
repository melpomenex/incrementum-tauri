/**
 * RSS Scroll Mode - TikTok-style vertical scrolling through RSS articles
 * 
 * Features:
 * - Full-screen immersive article reading
 * - Interleaved feed items (variety mixing from different sources)
 * - Mouse wheel scroll navigation
 * - Keyboard navigation (arrow keys, space)
 * - Mark as read on scroll
 * - Smooth transitions between items
 * - Feed source indicator
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Star,
  StarOff,
  CheckCircle2,
  Rss,
  Newspaper,
  Clock,
  ArrowLeft,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  Feed,
  FeedItem,
  getSubscribedFeeds,
  getSubscribedFeedsAuto,
  markItemReadAuto,
  toggleItemFavoriteAuto,
  formatFeedDate,
} from "../../api/rss";
import { cn } from "../../utils";
import { createExtract } from "../../api/extracts";
import { createDocument, updateDocumentContent } from "../../api/documents";
import { useDocumentStore } from "../../stores/documentStore";
import { useToast } from "../common/Toast";
import { CreateExtractDialog } from "../extracts/CreateExtractDialog";
import { useSettingsStore } from "../../stores/settingsStore";
import { summarizeContent } from "../../api/ai";

interface RSSScrollItem {
  feed: Feed;
  item: FeedItem;
  index: number;
}

interface RSSScrollModeProps {
  onExit?: () => void;
  initialFeedId?: string | null;
}

type SummaryMode = "terminal" | "assistant";
type AssistantPosition = "left" | "right";

// Session storage key for position
const RSS_SCROLL_POSITION_KEY = "rss-scroll-position";

/**
 * Interleave RSS items from different feeds for variety
 * Ensures users don't see multiple articles from the same feed back-to-back
 */
function interleaveFeedItems(items: RSSScrollItem[]): RSSScrollItem[] {
  if (items.length <= 2) return items;

  const result: RSSScrollItem[] = [];
  const feedGroups = new Map<string, RSSScrollItem[]>();

  // Group items by feed
  items.forEach((item) => {
    const feedId = item.feed.id;
    if (!feedGroups.has(feedId)) {
      feedGroups.set(feedId, []);
    }
    feedGroups.get(feedId)!.push(item);
  });

  // Sort feeds by number of items (descending) for better distribution
  const sortedFeeds = Array.from(feedGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Round-robin distribution
  let addedCount = 0;
  const totalItems = items.length;

  while (addedCount < totalItems) {
    let addedInRound = 0;

    for (const [, feedItems] of sortedFeeds) {
      if (feedItems.length > 0) {
        const item = feedItems.shift()!;
        result.push(item);
        addedCount++;
        addedInRound++;
      }
    }

    // Break if no items were added in a complete round
    if (addedInRound === 0) break;
  }

  return result;
}

/**
 * Calculate engagement score for an item
 * Based on recency, unread status, and feed priority
 */
function calculateEngagementScore(item: RSSScrollItem): number {
  const pubDate = new Date(item.item.pubDate);
  const now = new Date();
  const ageHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);

  // Recency score: newer is better (max 10 points, decays over 72 hours)
  const recencyScore = Math.max(0, 10 - (ageHours / 72) * 10);

  // Unread bonus (5 points)
  const unreadBonus = item.item.read ? 0 : 5;

  // Favorite bonus (3 points)
  const favoriteBonus = item.item.favorite ? 3 : 0;

  // Random component for variety (0-2 points)
  const varietyBonus = Math.random() * 2;

  return recencyScore + unreadBonus + favoriteBonus + varietyBonus;
}

export function RSSScrollMode({ onExit, initialFeedId }: RSSScrollModeProps) {
  const { documents, addDocument, updateDocument } = useDocumentStore();
  const { settings } = useSettingsStore();
  const toast = useToast();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [scrollItems, setScrollItems] = useState<RSSScrollItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [selectedText, setSelectedText] = useState("");
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [extractDocumentId, setExtractDocumentId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 500; // ms between scroll actions
  const startTimeRef = useRef(Date.now());

  // Summary state
  const [summaryMode, setSummaryMode] = useState<SummaryMode>(() => {
    const saved = localStorage.getItem("rss-summary-mode");
    return (saved as SummaryMode) || "terminal";
  });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [displayedSummary, setDisplayedSummary] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  // Assistant panel state
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem("rss-assistant-position");
    return (saved as AssistantPosition) || "right";
  });
  const [isAssistantVisible, setIsAssistantVisible] = useState(() => {
    const saved = localStorage.getItem("rss-assistant-visible");
    return saved !== "false";
  });
  const [assistantContext, setAssistantContext] = useState<string>("");

  // Load feeds and prepare scroll items
  useEffect(() => {
    const loadFeeds = async () => {
      const loadedFeeds = await getSubscribedFeedsAuto();
      setFeeds(loadedFeeds);

      // Get all unread items from all feeds
      let allItems: RSSScrollItem[] = [];
      loadedFeeds.forEach((feed) => {
        feed.items.forEach((item, idx) => {
          allItems.push({
            feed,
            item,
            index: idx,
          });
        });
      });

      // If initialFeedId is specified, prioritize items from that feed
      if (initialFeedId) {
        const fromInitialFeed = allItems.filter((i) => i.feed.id === initialFeedId);
        const fromOtherFeeds = allItems.filter((i) => i.feed.id !== initialFeedId);
        allItems = [...fromInitialFeed, ...fromOtherFeeds];
      }

      // Sort by engagement score
      allItems.sort((a, b) => calculateEngagementScore(b) - calculateEngagementScore(a));

      // Apply variety mixing (interleave different feeds)
      const interleaved = interleaveFeedItems(allItems);

      setScrollItems(interleaved);

      // Restore position if available
      const savedPosition = sessionStorage.getItem(RSS_SCROLL_POSITION_KEY);
      if (savedPosition) {
        const pos = parseInt(savedPosition, 10);
        if (pos < interleaved.length) {
          setCurrentIndex(pos);
          setRenderedIndex(pos);
        }
      }
    };

    loadFeeds();
  }, [initialFeedId]);

  // Save position when changing items
  useEffect(() => {
    sessionStorage.setItem(RSS_SCROLL_POSITION_KEY, String(currentIndex));
  }, [currentIndex]);

  // Mark current item as read when viewed
  useEffect(() => {
    const currentItem = scrollItems[currentIndex];
    if (!currentItem) return;

    const itemKey = `${currentItem.feed.id}-${currentItem.item.id}`;
    if (!readItems.has(itemKey) && !currentItem.item.read) {
      // Mark as read after viewing for 3 seconds
      const timer = setTimeout(async () => {
        try {
          await markItemReadAuto(currentItem.feed.id, currentItem.item.id, true);
        } catch (error) {
          // Silently fail - the item will still be marked as read in local state
          console.warn("Failed to mark item as read:", error);
        }
        // Always update local state regardless of API success
        setReadItems((prev) => new Set(prev).add(itemKey));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, scrollItems, readItems]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < scrollItems.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      startTimeRef.current = Date.now();

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

      setTimeout(() => {
        setRenderedIndex(prevIndex);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentIndex, isTransitioning]);

  // Mouse wheel scroll detection
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < scrollCooldown) {
        return;
      }

      // Find scrollable content within current item
      const target = e.target as HTMLElement;
      const scrollableContent = target.closest('.rss-article-content') as HTMLElement | null;

      if (scrollableContent) {
        const canScrollDown = scrollableContent.scrollTop < (scrollableContent.scrollHeight - scrollableContent.clientHeight - 10);
        const canScrollUp = scrollableContent.scrollTop > 10;

        // If content can still scroll, let it scroll
        if (e.deltaY > 0 && canScrollDown) return;
        if (e.deltaY < 0 && canScrollUp) return;
      }

      lastScrollTime.current = now;

      if (e.deltaY > 0) {
        goToNext();
      } else if (e.deltaY < 0) {
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

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToPrevious();
          break;
        case "Escape":
          onExit?.();
          break;
        case "h":
        case "?":
          setShowControls((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, onExit]);

  // Auto-hide controls
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

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async (feedId: string, itemId: string) => {
    try {
      await toggleItemFavoriteAuto(feedId, itemId);
    } catch (error) {
      console.warn("Failed to toggle favorite:", error);
    }
    // Always update local state regardless of API success
    setScrollItems((prev) =>
      prev.map((si) =>
        si.feed.id === feedId && si.item.id === itemId
          ? { ...si, item: { ...si.item, favorite: !si.item.favorite } }
          : si
      )
    );
  }, []);

  // Handle mark as read
  const handleMarkRead = useCallback(async (feedId: string, itemId: string) => {
    try {
      await markItemReadAuto(feedId, itemId, true);
    } catch (error) {
      console.warn("Failed to mark as read:", error);
    }
    // Always update local state regardless of API success
    const itemKey = `${feedId}-${itemId}`;
    setReadItems((prev) => new Set(prev).add(itemKey));
  }, []);

  // Handle text selection
  const updateSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) {
      setSelectedText("");
      return;
    }

    // Check if selection is within our content
    const container = contentRef.current;
    const anchorNode = selection?.anchorNode ?? null;
    const focusNode = selection?.focusNode ?? null;
    const selectionInContainer = !!container
      && ((anchorNode && container.contains(anchorNode)) || (focusNode && container.contains(focusNode)));
    if (!selectionInContainer) {
      setSelectedText("");
      return;
    }

    if (text.length > 10000) {
      setSelectedText("");
      selectedTextRef.current = "";
      return;
    }

    setSelectedText(text);
    selectedTextRef.current = text;
  }, []);

  // Set up selection listeners
  useEffect(() => {
    const handleSelection = () => updateSelection();
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [updateSelection]);

  // Clear selection when changing items
  useEffect(() => {
    setSelectedText("");
    selectedTextRef.current = "";
    window.getSelection()?.removeAllRanges();
  }, [renderedIndex]);

  // Handle prepare extract - creates document and opens dialog
  const handlePrepareExtract = useCallback(async () => {
    const currentItem = scrollItems[renderedIndex];
    // Use ref to get text in case selection was cleared
    const textToExtract = selectedTextRef.current || selectedText;
    if (!currentItem || !textToExtract) return;

    const rssItem = currentItem.item;
    const rssContent = rssItem.content || rssItem.description || "";
    const rssLink = rssItem.link || `rss:${rssItem.id}`;
    const existingDoc = documents.find((doc) => doc.filePath === rssLink);
    let documentId = existingDoc?.id;

    try {
      // Create document if it doesn't exist
      if (!documentId) {
        const created = await createDocument(
          rssItem.title || currentItem.feed.title,
          rssLink,
          "html"
        );
        addDocument(created);
        documentId = created.id;
      }

      // Update document content
      if (rssContent && documentId) {
        await updateDocumentContent(documentId, rssContent);
        updateDocument(documentId, {
          content: rssContent,
          title: rssItem.title || currentItem.feed.title,
          filePath: rssLink,
          fileType: "html",
        });
      }

      // Store document ID and open dialog
      setExtractDocumentId(documentId);
      setIsExtractDialogOpen(true);
    } catch (error) {
      console.error("Failed to prepare extract:", error);
      toast.error(
        "Failed to prepare extract",
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  }, [scrollItems, renderedIndex, selectedText, documents, addDocument, updateDocument, toast]);

  // Handle extract created
  const handleExtractCreated = useCallback(() => {
    setSelectedText("");
    selectedTextRef.current = "";
    window.getSelection()?.removeAllRanges();
    toast.success("Extract created", "Saved from RSS article.");
  }, [toast]);

  // Save summary mode preference
  useEffect(() => {
    localStorage.setItem("rss-summary-mode", summaryMode);
  }, [summaryMode]);

  // Save assistant visibility
  useEffect(() => {
    localStorage.setItem("rss-assistant-visible", String(isAssistantVisible));
  }, [isAssistantVisible]);

  // Save assistant position
  useEffect(() => {
    localStorage.setItem("rss-assistant-position", assistantPosition);
  }, [assistantPosition]);

  // Typewriter effect for summary
  useEffect(() => {
    if (!showSummary || summaryMode !== "terminal") return;

    let currentIndex = 0;
    const text = summaryText;
    setDisplayedSummary("");

    const typeChar = () => {
      if (currentIndex < text.length) {
        const char = text[currentIndex];
        setDisplayedSummary(prev => prev + char);
        currentIndex++;
        // Random typing speed for realistic effect
        const delay = Math.random() * 15 + 5;
        setTimeout(typeChar, delay);
      }
    };

    const timeoutId = setTimeout(typeChar, 100);
    return () => clearTimeout(timeoutId);
  }, [showSummary, summaryText, summaryMode]);

  // Handle summarize
  const handleSummarize = useCallback(async () => {
    const currentItem = scrollItems[renderedIndex];
    if (!currentItem || isSummarizing) return;

    const content = currentItem.item.content || currentItem.item.description || "";
    if (!content.trim()) {
      toast.error("No content to summarize");
      return;
    }

    setIsSummarizing(true);
    setSummaryText("");
    setDisplayedSummary("");
    setShowSummary(true);
    setAssistantContext(content);

    try {
      // Use the summarizeContent function
      const summary = await summarizeContent(content, 200);
      
      if (summaryMode === "terminal") {
        setSummaryText(summary);
      } else {
        // For assistant mode, just set the text directly
        setSummaryText(summary);
        setDisplayedSummary(summary);
      }
    } catch (error) {
      console.error("Failed to summarize:", error);
      toast.error("Failed to generate summary", error instanceof Error ? error.message : "Unknown error");
      setShowSummary(false);
    } finally {
      setIsSummarizing(false);
    }
  }, [scrollItems, renderedIndex, isSummarizing, summaryMode, toast]);

  // Toggle assistant visibility
  const toggleAssistant = useCallback(() => {
    setIsAssistantVisible(prev => !prev);
  }, []);

  // Close summary
  const closeSummary = useCallback(() => {
    setShowSummary(false);
    setSummaryText("");
    setDisplayedSummary("");
  }, []);

  // Switch assistant position
  const toggleAssistantPosition = useCallback(() => {
    setAssistantPosition(prev => prev === "left" ? "right" : "left");
  }, []);

  const currentItem = scrollItems[currentIndex];
  const renderedItem = scrollItems[renderedIndex];

  const progress = scrollItems.length > 0
    ? ((currentIndex + 1) / scrollItems.length) * 100
    : 0;

  if (scrollItems.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <Newspaper className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg mb-2">No articles to read</p>
        <p className="text-sm mb-4">Add RSS feeds to get started</p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Back to RSS Reader
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background overflow-hidden relative"
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header controls */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-background/90 to-transparent pb-8 pt-4 px-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Back to RSS Reader (Esc)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-foreground">
                {currentIndex + 1} / {scrollItems.length}
              </span>
            </div>
          </div>

          {currentItem && (
            <div className="flex items-center gap-2">
              {/* Summarize button */}
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isSummarizing
                    ? "text-primary animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title="Summarize article with AI"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleMarkRead(currentItem.feed.id, currentItem.item.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  currentItem.item.read || readItems.has(`${currentItem.feed.id}-${currentItem.item.id}`)
                    ? "text-green-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title="Mark as read"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToggleFavorite(currentItem.feed.id, currentItem.item.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  currentItem.item.favorite
                    ? "text-yellow-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={currentItem.item.favorite ? "Remove favorite" : "Add to favorites"}
              >
                {currentItem.item.favorite ? (
                  <Star className="w-5 h-5 fill-yellow-500" />
                ) : (
                  <StarOff className="w-5 h-5" />
                )}
              </button>
              <a
                href={currentItem.item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Open original"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="h-full w-full flex items-center justify-center">
        {/* Navigation buttons */}
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0 || isTransitioning}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-background/80 hover:bg-background shadow-lg transition-all",
            currentIndex === 0 && "opacity-0 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        <button
          onClick={goToNext}
          disabled={currentIndex >= scrollItems.length - 1 || isTransitioning}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-background/80 hover:bg-background shadow-lg transition-all",
            currentIndex >= scrollItems.length - 1 && "opacity-0 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Article content */}
        {renderedItem && (
          <article
            className={cn(
              "h-full w-full max-w-4xl mx-auto overflow-hidden transition-all duration-300",
              isTransitioning ? "opacity-50 scale-[0.98]" : "opacity-100 scale-100"
            )}
          >
            <div className="h-full flex flex-col pt-12 pb-20 px-6">
              {/* Article header */}
              <header className="flex-shrink-0 mb-6">
                {/* Feed source indicator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                    {renderedItem.feed.imageUrl ? (
                      <img
                        src={renderedItem.feed.imageUrl}
                        alt=""
                        className="w-4 h-4 rounded object-cover"
                      />
                    ) : (
                      <Rss className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {renderedItem.feed.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatFeedDate(renderedItem.item.pubDate)}
                  </div>
                  {renderedItem.item.author && (
                    <span className="text-sm text-muted-foreground">
                      by {renderedItem.item.author}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  {renderedItem.item.title}
                </h1>

                {/* Categories */}
                {renderedItem.item.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {renderedItem.item.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              {/* Article content */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto rss-article-content prose prose-lg max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: renderedItem.item.content || renderedItem.item.description || "",
                }}
              />

              {/* Article footer */}
              <footer className="flex-shrink-0 mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleFavorite(renderedItem.feed.id, renderedItem.item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                      renderedItem.item.favorite
                        ? "bg-yellow-500/10 text-yellow-600"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {renderedItem.item.favorite ? (
                      <Star className="w-4 h-4 fill-yellow-500" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {renderedItem.item.favorite ? "Favorited" : "Favorite"}
                    </span>
                  </button>

                  <a
                    href={renderedItem.item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">Read Original</span>
                  </a>
                </div>

                {/* Next article preview */}
                {currentIndex < scrollItems.length - 1 && (
                  <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>Up next: {scrollItems[currentIndex + 1]?.item.title.substring(0, 50)}
                      {scrollItems[currentIndex + 1]?.item.title.length > 50 ? "..." : ""}
                    </span>
                  </div>
                )}
              </footer>
            </div>
          </article>
        )}
      </div>

      {/* Terminal-style Summary Overlay */}
      {showSummary && summaryMode === "terminal" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-[#1a1a1a] rounded-lg border-2 border-[#ffb000] shadow-2xl overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-[#ffb000]/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-[#ffb000] font-mono text-sm">AI_SUMMARY.exe</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSummaryMode("assistant")}
                  className="px-2 py-1 text-xs text-[#ffb000]/70 hover:text-[#ffb000] font-mono transition-colors"
                  title="Switch to assistant mode"
                >
                  [SWITCH_MODE]
                </button>
                <button
                  onClick={closeSummary}
                  className="px-2 py-1 text-xs text-[#ffb000]/70 hover:text-[#ffb000] font-mono transition-colors"
                >
                  [X]
                </button>
              </div>
            </div>

            {/* Terminal content */}
            <div className="p-6 font-mono text-[#ffb000] min-h-[200px] max-h-[70vh] overflow-y-auto">
              {isSummarizing && displayedSummary === "" && (
                <div className="animate-pulse">Initializing neural network...</div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {displayedSummary}
                {isSummarizing && <span className="animate-pulse">▋</span>}
              </div>
            </div>

            {/* Terminal footer */}
            <div className="px-4 py-2 bg-[#2a2a2a] border-t border-[#ffb000]/30 text-[#ffb000]/50 text-xs font-mono">
              Model: {settings.ai.model} | Provider: {settings.ai.provider} | Tokens: {settings.ai.maxTokens}
            </div>
          </div>
        </div>
      )}

      {/* Assistant Panel */}
      {isAssistantVisible && summaryMode === "assistant" && showSummary && (
        <div
          className={cn(
            "fixed top-16 bottom-4 w-80 z-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col",
            assistantPosition === "left" ? "left-4" : "right-4"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Summary
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleAssistantPosition}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
                title="Move panel"
              >
                ↔
              </button>
              <button
                onClick={closeSummary}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                ×
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert">
            {isSummarizing && displayedSummary === "" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Generating summary...
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{displayedSummary}</div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
            {settings.ai.model} • {settings.ai.provider}
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div
        className={cn(
          "absolute bottom-4 left-4 z-30 flex items-center gap-2 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Assistant toggle */}
        <button
          onClick={toggleAssistant}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
            isAssistantVisible
              ? "bg-primary text-primary-foreground"
              : "bg-black/70 text-white hover:bg-black/80"
          )}
          title={isAssistantVisible ? "Hide assistant" : "Show assistant"}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAssistantVisible ? "Hide AI" : "Show AI"}</span>
        </button>

        {/* Summary mode toggle */}
        <button
          onClick={() => setSummaryMode(prev => prev === "terminal" ? "assistant" : "terminal")}
          className="px-3 py-2 bg-black/70 text-white hover:bg-black/80 rounded-lg transition-colors text-sm"
          title="Toggle summary mode"
        >
          {summaryMode === "terminal" ? "🖥️ Terminal" : "📋 Panel"}
        </button>
      </div>

      {/* Help text */}
      <div
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-xs text-muted-foreground bg-background/80 px-4 py-2 rounded-full transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        Scroll or use ↑↓ arrows to navigate • Press ? for help
      </div>

      {/* Floating Extract Button */}
      {(selectedText || selectedTextRef.current) && (
        <div className="fixed bottom-20 right-6 z-50 pointer-events-auto">
          <button
            onMouseDown={(e) => {
              // Prevent mousedown from clearing selection
              e.preventDefault();
            }}
            onClick={handlePrepareExtract}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity"
            title="Create extract from selection"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium">Extract</span>
          </button>
        </div>
      )}

      {/* Extract Dialog */}
      {extractDocumentId && (
        <CreateExtractDialog
          documentId={extractDocumentId}
          selectedText={selectedTextRef.current || selectedText}
          isOpen={isExtractDialogOpen}
          onClose={() => {
            setIsExtractDialogOpen(false);
            setSelectedText("");
            selectedTextRef.current = "";
            window.getSelection()?.removeAllRanges();
          }}
          onCreate={handleExtractCreated}
        />
      )}
    </div>
  );
}
