import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { TabPane } from "../stores/tabsStore";
import { ChevronUp, ChevronDown, X, Star, AlertCircle, CheckCircle, Sparkles, ExternalLink, Info, Settings2, Lightbulb, MessageSquare, Code, Rss } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useQueueStore } from "../stores/queueStore";
import { useTabsStore } from "../stores/tabsStore";
import { useDocumentStore } from "../stores/documentStore";
import { defaultSettings, useSettingsStore } from "../stores/settingsStore";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { FlashcardScrollItem } from "../components/review/FlashcardScrollItem";
import { ScrollModeArticleEditor } from "../components/review/ScrollModeArticleEditor";
import { rateDocumentEngaging, getSmartStartPosition } from "../api/algorithm";
import { getDueItems, type LearningItem } from "../api/learning-items";
import { getDueExtracts, submitExtractReview } from "../api/extract-review";
import { createExtract, type Extract } from "../api/extracts";
import { ExtractScrollItem } from "../components/review/ExtractScrollItem";
import { ClozeCreatorPopup } from "../components/extracts/ClozeCreatorPopup";
import { QACreatorPopup } from "../components/extracts/QACreatorPopup";
import { submitReview } from "../api/review";
import { getUnreadItemsAuto, getSubscribedFeedsAuto, type FeedItem as RSSFeedItem, type Feed as RSSFeed, markItemReadAuto } from "../api/rss";
import { cn } from "../utils";
import type { QueueItem } from "../types";
import { ItemDetailsPopover, type ItemDetailsTarget } from "../components/common/ItemDetailsPopover";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../components/assistant/AssistantPanel";
import { useToast } from "../components/common/Toast";
import { getDeviceInfo } from "../lib/pwa";
import { RSSQueueSettingsModal } from "../components/settings/RSSQueueSettings";
import { createDocument, updateDocumentContent } from "../api/documents";
import { trimToTokenWindow } from "../utils/tokenizer";
import { fetchYouTubeTranscript } from "../api/youtube";

const buildTranscriptText = (segments: Array<{ text: string }>): string =>
  segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const extractYouTubeId = (urlOrId: string): string => {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;

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

  return urlOrId;
};

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
  /** Topic/category for variety mixing */
  category?: string;
  /** Estimated reading time in minutes */
  estimatedTime?: number;
  /** Priority for engagement ordering */
  engagementScore?: number;
}

// Session storage keys for smart resume
const SESSION_KEYS = {
  LAST_POSITION: "scroll-mode-last-position",
  SESSION_TIMESTAMP: "scroll-mode-session-time",
  ITEMS_REVIEWED: "scroll-mode-items-reviewed",
  RATED_IDS: "scroll-mode-rated-ids",
} as const;

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
 * - FSRS-6 Engaging algorithm with variety mixing
 * - Smart start position (resumes or varies start for engagement)
 */
export function QueueScrollPage() {
  const { filteredItems: allQueueItems, loadQueue } = useQueueStore();
  const { documents, loadDocuments, addDocument, updateDocument } = useDocumentStore();
  const { tabs, rootPane, closeTab, updateTab } = useTabsStore();
  const { settings, updateSettingsCategory } = useSettingsStore();
  
  // Get active tab ID from the first tab pane
  const activeTabId = useMemo(() => {
    const findFirstTabPane = (pane: typeof rootPane): TabPane | null => {
      if (pane.type === "tabs") return pane;
      if (pane.type === "split") {
        for (const child of pane.children) {
          const found = findFirstTabPane(child);
          if (found) return found;
        }
      }
      return null;
    };
    const firstPane = findFirstTabPane(rootPane);
    return firstPane?.activeTabId ?? null;
  }, [rootPane]);
  const toast = useToast();
  const contextWindowTokens = settings.ai.maxTokens;
  const aiModel = settings.ai.model;

  // Use smart start position instead of always starting at 0
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [smartStartInfo, setSmartStartInfo] = useState<{ isResuming: boolean; reason: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showRssSettings, setShowRssSettings] = useState(false);
  const [scrollItems, setScrollItems] = useState<ScrollItem[]>([]);
  const [dueFlashcards, setDueFlashcards] = useState<LearningItem[]>([]);
  const [dueExtracts, setDueExtracts] = useState<Extract[]>([]);
  const [isRating, setIsRating] = useState(false);
  const [ratedDocumentIds, setRatedDocumentIds] = useState<Set<string>>(new Set());
  const [itemsReviewedThisSession, setItemsReviewedThisSession] = useState(0);
  const [, setAssistantInputActive] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem("assistant-panel-position");
    return saved === "left" ? "left" : "right";
  });
  const transcriptCacheRef = useRef<Map<string, string>>(new Map());
  const transcriptFetchInFlightRef = useRef<Set<string>>(new Set());
  const ASSISTANT_VISIBILITY_KEY = "scroll-mode-assistant-visible";
  const [isAssistantVisible, setIsAssistantVisible] = useState(() => {
    const stored = localStorage.getItem(ASSISTANT_VISIBILITY_KEY);
    return stored !== "false";
  });
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "ollama" | "openrouter">(() => {
    const stored = localStorage.getItem("assistant-llm-provider");
    if (stored === "openai" || stored === "anthropic" || stored === "ollama" || stored === "openrouter") {
      return stored;
    }
    return "openai";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;
  const [rssSelectedText, setRssSelectedText] = useState("");
  const MAX_SELECTION_CHARS = 10000;
  const toggleAssistantVisibility = useCallback(() => {
    setIsAssistantVisible(prev => {
      const next = !prev;
      localStorage.setItem(ASSISTANT_VISIBILITY_KEY, String(next));
      return next;
    });
  }, []);

  // Persist provider selection
  useEffect(() => {
    localStorage.setItem("assistant-llm-provider", selectedProvider);
  }, [selectedProvider]);

  const providers = [
    { id: "openai", name: "OpenAI", icon: Sparkles, color: "text-green-500" },
    { id: "anthropic", name: "Anthropic", icon: MessageSquare, color: "text-orange-500" },
    { id: "ollama", name: "Ollama", icon: Code, color: "text-blue-500" },
    { id: "openrouter", name: "OpenRouter", icon: Settings2, color: "text-purple-500" },
  ] as const;

  // Popup state
  const [activeExtractForCloze, setActiveExtractForCloze] = useState<{ id: string, text: string, range: [number, number] } | null>(null);
  const [activeExtractForQA, setActiveExtractForQA] = useState<string | null>(null);

  const lastScrollTime = useRef(0);
  const scrollCooldown = 500; // ms between scroll actions
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const rssContentRef = useRef<HTMLDivElement>(null);

  // Load session state on mount
  useEffect(() => {
    const savedRatedIds = sessionStorage.getItem(SESSION_KEYS.RATED_IDS);
    if (savedRatedIds) {
      try {
        setRatedDocumentIds(new Set(JSON.parse(savedRatedIds)));
      } catch {
        // ignore parse errors
      }
    }
    
    const savedItemsReviewed = sessionStorage.getItem(SESSION_KEYS.ITEMS_REVIEWED);
    if (savedItemsReviewed) {
      setItemsReviewedThisSession(parseInt(savedItemsReviewed, 10) || 0);
    }
  }, []);

  // Save session state when it changes
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEYS.RATED_IDS, JSON.stringify(Array.from(ratedDocumentIds)));
  }, [ratedDocumentIds]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEYS.ITEMS_REVIEWED, String(itemsReviewedThisSession));
  }, [itemsReviewedThisSession]);

  const handleExtractUpdate = useCallback((extractId: string, updates: { content: string; notes?: string }) => {
    setScrollItems(prev => prev.map((item) => (
      item.type === "extract" && item.extract?.id === extractId
        ? { ...item, extract: { ...item.extract, content: updates.content, notes: updates.notes } }
        : item
    )));
  }, []);

  const updateRssSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) {
      setRssSelectedText("");
      return;
    }

    const container = rssContentRef.current;
    const anchorNode = selection?.anchorNode ?? null;
    const focusNode = selection?.focusNode ?? null;
    const selectionInContainer = !!container
      && ((anchorNode && container.contains(anchorNode)) || (focusNode && container.contains(focusNode)));
    if (!selectionInContainer) {
      setRssSelectedText("");
      return;
    }

    if (text.length > MAX_SELECTION_CHARS) {
      setRssSelectedText("");
      return;
    }

    setRssSelectedText(text);
  }, [MAX_SELECTION_CHARS]);

  // Filter documents
  // Memoize to prevent infinite loop since this is a dependency of the useEffect below
  const documentQueueItems = useMemo(() => allQueueItems.filter((item) => {
    if (item.itemType !== "document") return false;

    // Skip recently rated documents to prevent them from reappearing immediately
    if (ratedDocumentIds.has(item.documentId)) return false;

    const doc = documents.find(d => d.id === item.documentId);

    // Skip if document not loaded yet (shouldn't happen after loadDocuments() awaits)
    if (!doc) return false;

    return true;
  }), [allQueueItems, documents, ratedDocumentIds]);

  // Smart start position calculation
  const calculateSmartStart = useCallback(async (totalItems: number) => {
    if (totalItems === 0) return 0;
    
    const lastPositionStr = sessionStorage.getItem(SESSION_KEYS.LAST_POSITION);
    const lastPosition = lastPositionStr ? parseInt(lastPositionStr, 10) : undefined;
    
    try {
      const response = await getSmartStartPosition({
        total_items: totalItems,
        last_session_position: lastPosition,
        items_reviewed_this_session: itemsReviewedThisSession,
        // Use timestamp as seed for reproducible variety
        seed: Date.now(),
      });
      
      setSmartStartInfo({
        isResuming: response.is_resuming,
        reason: response.reason,
      });
      
      // Show toast for resuming
      if (response.is_resuming && lastPosition && lastPosition > 0) {
        toast.info("Resuming where you left off", `Position ${lastPosition + 1} of ${totalItems}`);
      }
      
      return response.start_position;
    } catch (error) {
      console.error("Failed to get smart start position:", error);
      return 0;
    }
  }, [itemsReviewedThisSession, toast]);

  // Load queue, documents, and due flashcards/extracts on mount
  // IMPORTANT: Await loadDocuments() to prevent race condition in YouTube filter
  // Now uses smart start position for variety
  useEffect(() => {
    const loadAllData = async () => {
      startTimeRef.current = Date.now();

      // Load documents first and wait for completion
      // This ensures the YouTube filter has all documents loaded before computing
      await loadDocuments();

      // Load queue fresh - this will fetch current due items only
      await loadQueue();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Apply smart start position once items are loaded
  useEffect(() => {
    if (scrollItems.length > 0 && currentIndex === 0 && !smartStartInfo) {
      calculateSmartStart(scrollItems.length).then(startPos => {
        if (startPos > 0) {
          setCurrentIndex(startPos);
          setRenderedIndex(startPos);
          
          // Update tab data
          if (activeTabId) {
            updateTab(activeTabId, {
              data: {
                currentIndex: startPos,
                renderedIndex: startPos,
                sessionTimestamp: Date.now(),
              },
            });
          }
        }
      });
    }
  }, [scrollItems.length, currentIndex, smartStartInfo, calculateSmartStart, activeTabId, updateTab]);

  // Save current position to session storage and tab data
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEYS.LAST_POSITION, String(currentIndex));
    
    if (activeTabId) {
      updateTab(activeTabId, {
        data: {
          currentIndex,
          renderedIndex,
        },
      });
    }
  }, [currentIndex, renderedIndex, activeTabId, updateTab]);

  /**
   * Apply engagement-based variety mixing to the queue
   * 
   * This ensures:
   * - Topic variety (don't cluster same categories)
   * - Length variety (mix long and short items)
   * - Discovery injection (surface new items)
   */
  const applyVarietyMixing = useCallback((items: ScrollItem[]): ScrollItem[] => {
    if (items.length <= 3) return items;

    const maxSameCategory = 3; // Max consecutive items from same category
    const result: ScrollItem[] = [];
    const categoryCounts: Map<string, number> = new Map();
    
    // Sort items by engagement score (higher = more priority)
    const sorted = [...items].sort((a, b) => 
      (b.engagementScore ?? 0) - (a.engagementScore ?? 0)
    );

    for (const item of sorted) {
      const category = item.category ?? "uncategorized";
      const currentCount = categoryCounts.get(category) ?? 0;
      
      if (currentCount < maxSameCategory) {
        result.push(item);
        categoryCounts.set(category, currentCount + 1);
      } else {
        // Find a position later in the result where we can insert this
        // without violating the category constraint
        let inserted = false;
        for (let i = result.length - 1; i >= 0; i--) {
          const itemAtPos = result[i];
          const catAtPos = itemAtPos.category ?? "uncategorized";
          if (catAtPos !== category) {
            // Check if inserting here would violate constraint
            let consecutiveSame = 0;
            for (let j = i; j < result.length && consecutiveSame < maxSameCategory; j++) {
              if ((result[j]?.category ?? "uncategorized") === category) {
                consecutiveSame++;
              } else {
                break;
              }
            }
            if (consecutiveSame < maxSameCategory) {
              result.splice(i + 1, 0, item);
              inserted = true;
              break;
            }
          }
        }
        
        if (!inserted) {
          // Add to end anyway - better to show it than lose it
          result.push(item);
        }
      }
    }

    return result;
  }, []);

  // Helper to generate deterministic "random" value from string (0-1 range)
  // This ensures stable scores across renders while still providing variety
  const getStableRandom = useCallback((str: string, offset: number = 0): number => {
    let hash = 0;
    const combined = str + offset;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }, []);

  // Update scroll items when queue or flashcards change
  // Interleave: Due flashcards first, then documents, then RSS
  // Skip during rating to prevent race conditions
  useEffect(() => {
    if (isRating) return;
    let cancelled = false;

    const buildScrollItems = async () => {
      // Create flashcard items from due learning items
      const flashcardItems: ScrollItem[] = dueFlashcards.map((item) => ({
        id: `flashcard-${item.id}`,
        type: "flashcard" as const,
        documentTitle: item.question.substring(0, 50) + (item.question.length > 50 ? "..." : ""),
        learningItem: item,
        category: item.tags?.[0] ?? "flashcards",
        estimatedTime: 2, // Flashcards are quick
        // Use stable random based on item ID to prevent re-render loops
        engagementScore: 5 + getStableRandom(item.id, 1) * 2,
      }));

      // Create document items with engagement scoring
      const docItems: ScrollItem[] = documentQueueItems
        .map((item) => {
          const doc = documents.find(d => d.id === item.documentId);
          if (doc?.isArchived) {
            return null;
          }
          const isImportedWebArticle = !!doc?.filePath
            && /^https?:\/\//.test(doc.filePath)
            && doc?.fileType !== "youtube";

          // Calculate engagement score based on priority and variety factors
          const isNew = !doc?.dateLastReviewed;
          const priority = item.priority ?? 5;
          const recencyBoost = isNew ? 2 : 0;
          const baseScore = priority + recencyBoost;
          // Add stable "randomness" for serendipity (0-1.5 bonus)
          const serendipityBonus = getStableRandom(item.id, 2) * 1.5;

          return {
            id: item.id,
            type: "document" as const,
            documentId: item.documentId,
            documentTitle: item.documentTitle,
            isImportedWebArticle,
            category: doc?.category ?? item.tags?.[0] ?? "uncategorized",
            estimatedTime: item.estimatedTime ?? 10,
            engagementScore: baseScore + serendipityBonus,
          };
        })
        .filter((item): item is ScrollItem => item !== null);

      // Load RSS items based on settings
      const rssSettings = settings.rssQueue ?? defaultSettings.rssQueue;
      let rssItems: ScrollItem[] = [];

      if (rssSettings.includeInQueue) {
        // Get items based on unread setting
        let rssItemsToProcess: { feed: RSSFeed; item: RSSFeedItem }[];
        if (rssSettings.unreadOnly) {
          rssItemsToProcess = await getUnreadItemsAuto();
        } else {
          // Get all items from subscribed feeds
          const allFeeds = await getSubscribedFeedsAuto();
          rssItemsToProcess = allFeeds.flatMap(feed =>
            feed.items.map(item => ({ feed, item }))
          );
        }

        // Filter by feed inclusion/exclusion
        const filteredRssItems = rssItemsToProcess.filter(({ feed }) => {
          // Check if feed is explicitly excluded
          if (rssSettings.excludedFeedIds.includes(feed.id)) return false;

          // Check if feed is explicitly included (if inclusion list is not empty)
          if (rssSettings.includedFeedIds.length > 0) {
            return rssSettings.includedFeedIds.includes(feed.id);
          }

          return true;
        });

        // Sort by date if preferRecent is enabled
        if (rssSettings.preferRecent) {
          filteredRssItems.sort((a, b) =>
            new Date(b.item.pubDate).getTime() - new Date(a.item.pubDate).getTime()
          );
        }

        // Limit items per session
        const limitedRssItems = rssSettings.maxItemsPerSession > 0
          ? filteredRssItems.slice(0, rssSettings.maxItemsPerSession)
          : filteredRssItems;

        rssItems = limitedRssItems.map(({ feed, item }) => ({
          id: `rss-${item.id}`,
          type: "rss",
          documentTitle: item.title,
          rssItem: item,
          rssFeed: feed,
          category: feed.category ?? "rss",
          estimatedTime: 5,
          // Use stable random based on item ID
          engagementScore: 4 + getStableRandom(item.id, 3),
        }));
      }

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
          category: extract.category ?? doc?.category ?? "extracts",
          estimatedTime: 3,
          // Use stable random based on extract ID
          engagementScore: 5 + getStableRandom(extract.id, 4) * 1.5,
        };
      });

      // Combine all review items (flashcards + extracts)
      const allReviewItems = [...flashcardItems, ...extractItems];

      // Calculate target review item count based on percentage setting
      const flashcardPercentage = settings.scrollQueue.flashcardPercentage;
      const nonReviewItems = [...docItems, ...rssItems];
      const totalNonReview = nonReviewItems.length;

      // Calculate target number of review items based on percentage
      let targetReviewCount = 0;
      if (flashcardPercentage < 100 && flashcardPercentage > 0) {
        targetReviewCount = Math.round((flashcardPercentage * totalNonReview) / (100 - flashcardPercentage));
      } else if (flashcardPercentage >= 100) {
        targetReviewCount = allReviewItems.length;
      }

      // Limit review items to available count
      const limitedReviewItems = allReviewItems.slice(0, targetReviewCount);

      // Distribute review items evenly throughout the queue with variety mixing
      const distributedItems: ScrollItem[] = [];

      if (limitedReviewItems.length > 0 && nonReviewItems.length > 0) {
        // Calculate interval for inserting review items
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
        // Only review items
        distributedItems.push(...limitedReviewItems);
      } else {
        // Only non-review items
        distributedItems.push(...nonReviewItems);
      }

      // Apply variety mixing for engagement
      const mixedItems = applyVarietyMixing(distributedItems);

      if (!cancelled) {
        setScrollItems(mixedItems);
      }
    };

    void buildScrollItems();
    return () => {
      cancelled = true;
    };
  }, [documentQueueItems, documents, dueFlashcards, dueExtracts, isRating, settings.scrollQueue, settings.rssQueue, applyVarietyMixing]);

  // Current item (for display during transition)
  const currentItem = scrollItems[currentIndex];
  const currentDocument = useMemo(() => {
    if (!currentItem || currentItem.type !== "document" || !currentItem.documentId) return null;
    return documents.find((doc) => doc.id === currentItem.documentId) ?? null;
  }, [currentItem, documents]);
  const isNewDocument =
    currentDocument
      ? (currentDocument.reps ?? currentDocument.readingCount ?? 0) <= 0
        && !currentDocument.dateLastReviewed
      : false;

  // Rendered item (actual document being rendered)
  const renderedItem = scrollItems[renderedIndex];

  useEffect(() => {
    if (!renderedItem || renderedItem.type !== "rss") {
      setRssSelectedText("");
      return;
    }

    const handleSelection = () => updateRssSelection();
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [renderedItem, updateRssSelection]);

  useEffect(() => {
    setRssSelectedText("");
  }, [renderedItem?.id]);

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

  const [assistantContext, setAssistantContext] = useState<AssistantContext | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const assistantItem = renderedItem ?? currentItem;
    if (!assistantItem) {
      setAssistantContext(undefined);
      return;
    }

    const buildContext = async () => {
      const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;

      if (assistantItem.type === "document" && assistantItem.documentId) {
        const doc = documents.find(d => d.id === assistantItem.documentId);
        const title = doc?.title || assistantItem.documentTitle;
        const titleLine = title ? `Title: ${title}` : null;

        if (doc?.fileType === "youtube") {
          let transcriptText = transcriptCacheRef.current.get(doc.id);
          if (!transcriptText && !transcriptFetchInFlightRef.current.has(doc.id)) {
            transcriptFetchInFlightRef.current.add(doc.id);
            try {
              const videoId = extractYouTubeId(doc.filePath);
              if (videoId) {
                const segments = await fetchYouTubeTranscript(videoId);
                if (segments.length > 0) {
                  const text = buildTranscriptText(segments);
                  if (text) {
                    transcriptCacheRef.current.set(doc.id, text);
                    transcriptText = text;
                  }
                }
              }
            } catch (error) {
              console.warn("[QueueScroll] Failed to fetch YouTube transcript for assistant context", doc.id, error);
            } finally {
              transcriptFetchInFlightRef.current.delete(doc.id);
            }
          }

          if (transcriptText) {
            const content = [titleLine, transcriptText].filter(Boolean).join("\n\n");
            const trimmed = content ? await trimToTokenWindow(content, maxTokens, aiModel) : undefined;
            if (!cancelled) {
              setAssistantContext({
                type: "video",
                documentId: assistantItem.documentId,
                content: trimmed || undefined,
                contextWindowTokens: maxTokens,
                metadata: {
                  title: title || undefined,
                },
              });
            }
            return;
          }
        }

        const content = [titleLine, doc?.content]
          .filter(Boolean)
          .join("\n\n");
        const trimmed = content ? await trimToTokenWindow(content, maxTokens, aiModel) : undefined;
        if (!cancelled) {
          setAssistantContext({
            type: "document",
            documentId: assistantItem.documentId,
            content: trimmed || undefined,
            contextWindowTokens: maxTokens,
            metadata: {
              title: title || undefined,
            },
          });
        }
        return;
      }

      if (assistantItem.type === "extract" && assistantItem.extract) {
        const extractContent = [assistantItem.extract.content, assistantItem.extract.notes]
          .filter(Boolean)
          .join("\n\n");
        const title = assistantItem.documentTitle ? `Title: ${assistantItem.documentTitle}` : null;
        const content = [title, extractContent].filter(Boolean).join("\n\n");
        const trimmed = content ? await trimToTokenWindow(content, maxTokens, aiModel) : undefined;
        if (!cancelled) {
          setAssistantContext({
            type: "document",
            documentId: `extract:${assistantItem.extract.id}`,
            content: trimmed || undefined,
            contextWindowTokens: maxTokens,
            metadata: {
              title: assistantItem.documentTitle || undefined,
            },
          });
        }
        return;
      }

      if (assistantItem.type === "rss") {
        const title = assistantItem.rssItem?.title ? `Title: ${assistantItem.rssItem?.title}` : null;
        const rssContent = assistantItem.rssItem?.content || assistantItem.rssItem?.description;
        const content = [title, rssContent].filter(Boolean).join("\n\n");
        const trimmed = content ? await trimToTokenWindow(content, maxTokens, aiModel) : undefined;
        if (!cancelled) {
          setAssistantContext({
            type: "web",
            url: assistantItem.rssItem?.link || `rss:${assistantItem.rssItem?.id}`,
            content: trimmed || undefined,
            contextWindowTokens: maxTokens,
            metadata: {
              title: assistantItem.rssItem?.title || undefined,
            },
          });
        }
        return;
      }

      setAssistantContext(undefined);
    };

    void buildContext();
    return () => {
      cancelled = true;
    };
  }, [currentItem, renderedItem, documents, contextWindowTokens, aiModel]);

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
      let isYouTubeItem = false;
      if (currentItem?.type === "document" && currentItem.documentId) {
        const doc = documents.find(d => d.id === currentItem.documentId);
        if (doc) {
          const fileType = doc.fileType || doc.filePath?.split('.').pop()?.toLowerCase();
          isScrollableDocument = fileType === "epub" || fileType === "pdf";
          isYouTubeItem = fileType === "youtube"
            || !!doc.filePath?.includes("youtube.com")
            || !!doc.filePath?.includes("youtu.be");
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
      const transcriptScrollElement = target.closest('[data-transcript-scroll="true"]') as HTMLElement | null;
      const scrollableElement = transcriptScrollElement
        || target.closest('[class*="overflow"]') as HTMLElement
        || target.closest('.prose') as HTMLElement
        || document.documentElement;

      if (scrollableElement) {
        const canScrollDown = scrollableElement.scrollTop < (scrollableElement.scrollHeight - scrollableElement.clientHeight - 10);
        const canScrollUp = scrollableElement.scrollTop > 10;

        if (!(isYouTubeItem && !transcriptScrollElement)) {
          // If scrolling down and document can still scroll down, let it scroll
          if (e.deltaY > 0 && canScrollDown) {
            return; // Let the document scroll normally
          }
          // If scrolling up and document can still scroll up, let it scroll
          if (e.deltaY < 0 && canScrollUp) {
            return; // Let the document scroll normally
          }
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
    console.log("[QueueScroll] handleRating called:", { 
      rating, 
      currentItem: currentItem?.id, 
      type: currentItem?.type, 
      isRating,
      documentId: currentItem?.documentId,
      isNewDocument 
    });
    
    if (!currentItem) {
      console.log("[QueueScroll] handleRating early return: no currentItem");
      return;
    }
    
    if (isRating) {
      console.log("[QueueScroll] handleRating early return: already rating");
      return;
    }

    setIsRating(true);
    const ratedItemId = currentItem.id;

    try {
      const timeTaken = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      console.log(`[QueueScroll] Processing rating ${rating} for item type: ${currentItem.type}`);

      if (currentItem.type === "document") {
        if (!currentItem.documentId) {
          console.error("[QueueScroll] Document item has no documentId!");
          throw new Error("Document ID is missing");
        }
        
        console.log(`[QueueScroll] Rating document ${currentItem.documentId} as ${rating} (time: ${timeTaken}s)`);
        
        // Use the engaging FSRS-6 scheduler!
        const result = await rateDocumentEngaging(currentItem.documentId, rating, timeTaken);
        console.log("[QueueScroll] rateDocumentEngaging result:", result);

        // Track rated document to prevent immediate re-appearance
        setRatedDocumentIds(prev => {
          const newSet = new Set(prev);
          newSet.add(currentItem.documentId!);
          return newSet;
        });

        // Track items reviewed this session
        setItemsReviewedThisSession(prev => prev + 1);

        // Remove the rated document from scrollItems and reload queue
        advanceAfterRemoval(ratedItemId);
        void loadQueue();
      } else if (currentItem.type === "flashcard" && currentItem.learningItem) {
        // Rate flashcard using FSRS
        console.log(`Rating flashcard ${currentItem.learningItem.id} as ${rating} (time: ${timeTaken}s)`);
        await submitReview(currentItem.learningItem.id, rating, timeTaken);

        // Track items reviewed
        setItemsReviewedThisSession(prev => prev + 1);

        // Remove the rated flashcard from both dueFlashcards and scrollItems
        setDueFlashcards(prev => prev.filter(item => item.id !== currentItem.learningItem!.id));
        advanceAfterRemoval(ratedItemId);
      } else if (currentItem.type === "rss" && currentItem.rssItem && currentItem.rssFeed) {
        // Mark RSS item as read
        await markItemReadAuto(currentItem.rssFeed.id, currentItem.rssItem.id, true);
        console.log(`Marked RSS item ${currentItem.rssItem.id} as read (time: ${timeTaken}s)`);
        
        // Track items reviewed
        setItemsReviewedThisSession(prev => prev + 1);
        
        // Reload RSS items to update the list
        const rssUnread = await getUnreadItemsAuto();
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
        const nextItems = [...flashcardItems, ...extractItems, ...docItems, ...rssItems];
        setScrollItems(nextItems);
        if (nextItems.length === 0) {
          setCurrentIndex(0);
          setRenderedIndex(0);
        } else {
          const nextIndex = Math.min(currentIndex, nextItems.length - 1);
          setIsTransitioning(true);
          setCurrentIndex(nextIndex);
          startTimeRef.current = Date.now();
          setTimeout(() => {
            setRenderedIndex(nextIndex);
            setIsTransitioning(false);
          }, 300);
        }
      } else if (currentItem.type === "extract" && currentItem.extract) {
        // Rate extract
        console.log(`Rating extract ${currentItem.extract.id} as ${rating} (time: ${timeTaken}s)`);
        await submitExtractReview(currentItem.extract.id, rating, timeTaken);

        // Track items reviewed
        setItemsReviewedThisSession(prev => prev + 1);

        // Remove from both dueExtracts and scrollItems
        setDueExtracts(prev => prev.filter(e => e.id !== currentItem.extract!.id));
        advanceAfterRemoval(ratedItemId);
      }

      // Allow transition to complete, then release rating lock
      setTimeout(() => {
        setIsRating(false);
      }, 300);
    } catch (error) {
      console.error("[QueueScroll] Failed to handle rating:", error);
      toast.error(
        "Rating failed",
        error instanceof Error ? error.message : "Please try again"
      );
    } finally {
      // Always reset isRating after a short delay, even on error
      setTimeout(() => {
        setIsRating(false);
      }, 500);
    }
  };

  const handleCreateRssExtract = useCallback(async () => {
    if (!renderedItem || renderedItem.type !== "rss" || !renderedItem.rssItem) return;

    const selectionText = rssSelectedText.trim();
    if (!selectionText) return;

    const rssItem = renderedItem.rssItem;
    const rssContent = rssItem.content || rssItem.description || "";
    const rssLink = rssItem.link || `rss:${rssItem.id}`;
    const existingDoc = documents.find((doc) => doc.filePath === rssLink);
    let documentId = existingDoc?.id;

    try {
      if (!documentId) {
        const created = await createDocument(
          rssItem.title || renderedItem.documentTitle,
          rssLink,
          "html"
        );
        addDocument(created);
        documentId = created.id;
      }

      if (rssContent && documentId) {
        await updateDocumentContent(documentId, rssContent);
        updateDocument(documentId, {
          content: rssContent,
          title: rssItem.title || renderedItem.documentTitle,
          filePath: rssLink,
          fileType: "html",
        });
      }

      if (documentId) {
        await createExtract({ document_id: documentId, content: selectionText });
      }

      toast.success("Extract created", "Saved from RSS item.");
      setRssSelectedText("");
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error("Failed to create extract from RSS item:", error);
      toast.error(
        "Failed to create extract",
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  }, [renderedItem, rssSelectedText, documents, addDocument, updateDocument, toast]);

  // Handle exit
  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  if (!currentItem) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
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
      className="h-full w-full overflow-hidden bg-background relative"
    >
      {/* Smart Start Indicator */}
      {smartStartInfo && smartStartInfo.isResuming && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-sm shadow-lg animate-pulse">
            Resumed from position {currentIndex + 1}
          </div>
        </div>
      )}

      {/* Content Viewer - Document, Flashcard, or RSS Article */}
      <div 
        className="flex h-full w-full"
        onClick={(e) => {
          // Toggle controls on click/tap if not clicking interactive elements
          if (isMobile && !(e.target as HTMLElement).closest('button, input, textarea, a, .interactive')) {
            setShowControls(prev => !prev);
          }
        }}
      >
        {!isMobile && isAssistantVisible && renderedItem && renderedItem.type !== "flashcard" && assistantPosition === "left" && (
          <>
            {/* Model Chooser - Above Assistant */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2 p-2 border-r border-border bg-card z-10">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id as any)}
                  className={`p-2 rounded-lg transition-all ${
                    selectedProvider === provider.id
                      ? "bg-muted ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                  title={provider.name}
                >
                  <provider.icon className={`w-5 h-5 ${provider.color}`} />
                </button>
              ))}
            </div>
            <div className="flex-shrink-0 h-full z-10">
              <AssistantPanel
                context={assistantContext}
                className="assistant-panel h-full"
                onInputHoverChange={setAssistantInputActive}
                appendContextMessages={false}
                position={assistantPosition}
                onPositionChange={(newPosition) => {
                  setAssistantPosition(newPosition);
                  localStorage.setItem("assistant-panel-position", newPosition);
                }}
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
              />
            </div>
          </>
        )}
        <div
          className={cn(
            "h-full flex-1 min-w-0 transition-opacity duration-300",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          {renderedItem?.type === "document" ? (() => {
            const doc = documents.find(d => d.id === renderedItem.documentId);
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
                onExtractCreated={() => {
                  toast.success("Extract created", "Saved in scroll mode.");
                }}
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
              <div ref={rssContentRef} className="max-w-3xl mx-auto px-8 py-12 reading-surface">
                {/* RSS Article Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 reading-meta">
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-md text-xs font-medium">
                      RSS
                    </span>
                    <span>{renderedItem.rssFeed?.title}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-3 reading-title">
                    {renderedItem.rssItem?.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground reading-meta">
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
                {(renderedItem.rssItem?.content || renderedItem.rssItem?.description) ? (
                  <div
                    className="prose prose-lg max-w-none text-foreground reading-prose"
                    dangerouslySetInnerHTML={{ __html: renderedItem.rssItem?.content || renderedItem.rssItem?.description || "" }}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No content available for this article.</p>
                    <a
                      href={renderedItem.rssItem?.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-4 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read on original site
                    </a>
                  </div>
                )}
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
        {!isMobile && isAssistantVisible && renderedItem && renderedItem.type !== "flashcard" && assistantPosition === "right" && (
          <>
            <div className="flex-shrink-0 h-full z-10">
              <AssistantPanel
                context={assistantContext}
                className="assistant-panel h-full"
                onInputHoverChange={setAssistantInputActive}
                appendContextMessages={false}
                position={assistantPosition}
                onPositionChange={(newPosition) => {
                  setAssistantPosition(newPosition);
                  localStorage.setItem("assistant-panel-position", newPosition);
                }}
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
              />
            </div>
            {/* Model Chooser - Above Assistant */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2 p-2 border-l border-border bg-card z-10">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id as any)}
                  className={`p-2 rounded-lg transition-all ${
                    selectedProvider === provider.id
                      ? "bg-muted ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                  title={provider.name}
                >
                  <provider.icon className={`w-5 h-5 ${provider.color}`} />
                </button>
              ))}
            </div>
          </>
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

      {/* Assistant Toggle */}
      {!isMobile && renderedItem && renderedItem.type !== "flashcard" && (
        <div className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[70] pointer-events-auto">
          <button
            onClick={toggleAssistantVisibility}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-black/70 text-white rounded-lg shadow-lg hover:bg-black/80 transition-colors min-h-[44px] text-sm md:text-base"
            title={isAssistantVisible ? "Hide assistant" : "Show assistant"}
            aria-pressed={!isAssistantVisible}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">
              {isAssistantVisible ? "Hide Assistant" : "Show Assistant"}
            </span>
            <span className="font-medium sm:hidden">
              {isAssistantVisible ? "Hide" : "Show"}
            </span>
          </button>
        </div>
      )}

      {/* RSS Extract Action */}
      {renderedItem?.type === "rss" && rssSelectedText && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[70] pointer-events-auto">
          <button
            onClick={handleCreateRssExtract}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity min-h-[44px] text-sm md:text-base"
            title="Create extract from selection"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Create Extract</span>
            <span className="font-medium sm:hidden">Extract</span>
          </button>
        </div>
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
              <button
                onClick={() => setShowRssSettings(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 backdrop-blur-sm text-white text-sm transition-colors hover:bg-black/60"
                title="RSS queue settings"
              >
                <Rss className="w-4 h-4" />
                RSS
              </button>
              <div className="text-white text-sm bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg max-w-[200px] sm:max-w-md truncate">
                {currentItem.type === "document" && (
                  <span className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-xs shrink-0">DOC</span>
                    <span className="truncate">{currentItem.documentTitle}</span>
                  </span>
                )}
                {currentItem.type === "flashcard" && (
                  <span className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 bg-purple-500/30 rounded text-xs shrink-0">CARD</span>
                    <span className="truncate">{currentItem.documentTitle}</span>
                  </span>
                )}
                {currentItem.type === "rss" && (
                  <span className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 bg-orange-500/30 rounded text-xs shrink-0">RSS</span>
                    <span className="truncate">{currentItem.documentTitle}</span>
                  </span>
                )}
                {currentItem.type === "extract" && (
                  <span className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 bg-yellow-500/30 rounded text-xs shrink-0">EXTRACT</span>
                    <span className="truncate">{currentItem.documentTitle}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Rating Controls - Only for documents and RSS (flashcards have inline rating) */}
        {currentItem.type !== "flashcard" && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
            {currentItem.type === "document" && !isNewDocument ? (
              <>
                <button
                  type="button"
                  onClick={() => handleRating(1)}
                  disabled={isRating}
                  className="group p-3 rounded-full bg-red-500/80 backdrop-blur-sm hover:bg-red-500 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Again - Forgot completely (1)"
                >
                  <AlertCircle className="w-6 h-6 text-white" />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Again (1)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating(2)}
                  disabled={isRating}
                  className="group p-3 rounded-full bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hard - Difficult recall (2)"
                >
                  <Star className="w-6 h-6 text-white" />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Hard (2)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating(3)}
                  disabled={isRating}
                  className="group p-3 rounded-full bg-blue-500/80 backdrop-blur-sm hover:bg-blue-500 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Good - Normal recall (3)"
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Good (3)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating(4)}
                  disabled={isRating}
                  className="group p-3 rounded-full bg-green-500/80 backdrop-blur-sm hover:bg-green-500 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[QueueScroll] Mark as Read clicked:", { 
                    id: currentItem?.id, 
                    type: currentItem?.type, 
                    documentId: currentItem?.documentId,
                    isRating,
                    isNewDocument 
                  });
                  if (!isRating && currentItem) {
                    handleRating(3);
                  } else {
                    console.log("[QueueScroll] Mark as Read blocked - isRating:", isRating, "hasItem:", !!currentItem);
                  }
                }}
                disabled={isRating}
                className="group relative p-4 rounded-full bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                title={currentItem?.type === "document" ? "Mark as Read (Good)" : "Mark as Read"}
              >
                <CheckCircle className="w-7 h-7 text-white" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {currentItem?.type === "document" ? "Mark as Read (Good)" : "Mark as Read"}
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
      
      {/* RSS Queue Settings Modal */}
      <RSSQueueSettingsModal
        isOpen={showRssSettings}
        onClose={() => setShowRssSettings(false)}
      />
    </div>
  );
}
