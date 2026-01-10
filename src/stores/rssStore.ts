import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { fetchFeed, type Feed, type FeedItem } from "../api/rss";

interface RssFeedDB {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string | null;
  update_interval: number;
  last_fetched: string | null;
  is_active: boolean;
  date_added: string;
  auto_queue: boolean;
}

interface RssArticleDB {
  id: string;
  feed_id: string;
  url: string;
  title: string;
  author: string | null;
  published_date: string | null;
  content: string | null;
  summary: string | null;
  image_url: string | null;
  is_queued: boolean;
  is_read: boolean;
  date_added: string;
}

interface RssState {
  // Data
  feeds: RssFeedDB[];
  articles: Map<string, RssArticleDB[]>; // feedId -> articles
  selectedFeedId: string | null;
  isLoading: boolean;
  error: string | null;

  // UI filters
  showUnreadOnly: boolean;
  showQueuedOnly: boolean;
  searchQuery: string;
  selectedCategory: string | null;

  // Actions - Feed Management
  loadFeeds: () => Promise<void>;
  addFeed: (url: string, options?: {
    category?: string;
    updateInterval?: number;
    autoQueue?: boolean;
  }) => Promise<void>;
  updateFeed: (id: string, updates: Partial<RssFeedDB>) => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  refreshFeed: (id: string) => Promise<void>;

  // Actions - Article Management
  loadArticles: (feedId: string) => Promise<void>;
  markArticleRead: (articleId: string, isRead: boolean) => Promise<void>;
  addArticleToQueue: (articleId: string) => Promise<void>;

  // Actions - UI
  setSelectedFeed: (feedId: string | null) => void;
  setShowUnreadOnly: (value: boolean) => void;
  setShowQueuedOnly: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;

  // Utility
  getCategories: () => string[];
  getUnreadCount: (feedId?: string) => number;
}

export const useRssStore = create<RssState>((set, get) => ({
  // Initial state
  feeds: [],
  articles: new Map(),
  selectedFeedId: null,
  isLoading: false,
  error: null,
  showUnreadOnly: false,
  showQueuedOnly: false,
  searchQuery: "",
  selectedCategory: null,

  // Load all feeds from database
  loadFeeds: async () => {
    set({ isLoading: true, error: null });
    try {
      const feeds = await invoke<RssFeedDB[]>("get_rss_feeds");
      set({ feeds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load feeds",
        isLoading: false,
      });
    }
  },

  // Add a new feed
  addFeed: async (url, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch and parse the feed
      const parsedFeed = await fetchFeed(url);
      if (!parsedFeed) {
        throw new Error("Failed to parse RSS feed");
      }

      // Save feed to database
      const feed = await invoke<RssFeedDB>("create_rss_feed", {
        url,
        title: parsedFeed.title,
        description: parsedFeed.description || null,
        category: options.category || null,
        updateInterval: options.updateInterval || 3600, // Default 1 hour
        autoQueue: options.autoQueue || false,
      });

      // Save articles to database
      for (const item of parsedFeed.items) {
        await invoke("create_rss_article", {
          feedId: feed.id,
          url: item.link,
          title: item.title,
          author: item.author || null,
          publishedDate: item.pubDate || null,
          content: item.content || null,
          summary: item.description || null,
          imageUrl: item.enclosure?.url || null,
        });
      }

      // Update feed last_fetched timestamp
      await invoke("update_rss_feed_fetched", { id: feed.id });

      // Reload feeds
      await get().loadFeeds();
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add feed",
        isLoading: false,
      });
      throw error;
    }
  },

  // Update feed settings
  updateFeed: async (id, updates) => {
    try {
      await invoke("update_rss_feed", {
        id,
        title: updates.title,
        description: updates.description,
        category: updates.category,
        updateInterval: updates.update_interval,
        autoQueue: updates.auto_queue,
        isActive: updates.is_active,
      });
      await get().loadFeeds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update feed",
      });
      throw error;
    }
  },

  // Delete feed
  deleteFeed: async (id) => {
    try {
      await invoke("delete_rss_feed", { id });

      // Clear articles for this feed
      const articles = new Map(get().articles);
      articles.delete(id);

      // Update state
      set((state) => ({
        feeds: state.feeds.filter((f) => f.id !== id),
        articles,
        selectedFeedId: state.selectedFeedId === id ? null : state.selectedFeedId,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete feed",
      });
      throw error;
    }
  },

  // Refresh feed (fetch new articles)
  refreshFeed: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const feed = get().feeds.find((f) => f.id === id);
      if (!feed) {
        throw new Error("Feed not found");
      }

      // Fetch and parse the feed
      const parsedFeed = await fetchFeed(feed.url);
      if (!parsedFeed) {
        throw new Error("Failed to parse RSS feed");
      }

      // Get existing articles to avoid duplicates
      const existingArticles = await invoke<RssArticleDB[]>("get_rss_articles", {
        feedId: id,
        limit: 1000,
      });
      const existingUrls = new Set(existingArticles.map((a) => a.url));

      // Save new articles
      let newCount = 0;
      for (const item of parsedFeed.items) {
        if (!existingUrls.has(item.link)) {
          await invoke("create_rss_article", {
            feedId: id,
            url: item.link,
            title: item.title,
            author: item.author || null,
            publishedDate: item.pubDate || null,
            content: item.content || null,
            summary: item.description || null,
            imageUrl: item.enclosure?.url || null,
          });
          newCount++;

          // Auto-queue if enabled
          if (feed.auto_queue) {
            // Will be implemented when we add queue integration
          }
        }
      }

      // Update feed last_fetched timestamp
      await invoke("update_rss_feed_fetched", { id });

      // Reload articles for this feed
      await get().loadArticles(id);
      set({ isLoading: false });

      return newCount;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to refresh feed",
        isLoading: false,
      });
      throw error;
    }
  },

  // Load articles for a feed
  loadArticles: async (feedId) => {
    set({ isLoading: true, error: null });
    try {
      const articles = await invoke<RssArticleDB[]>("get_rss_articles", {
        feedId,
        limit: 200,
      });

      const articlesMap = new Map(get().articles);
      articlesMap.set(feedId, articles);

      set({ articles: articlesMap, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load articles",
        isLoading: false,
      });
    }
  },

  // Mark article as read/unread
  markArticleRead: async (articleId, isRead) => {
    try {
      await invoke("mark_rss_article_read", { id: articleId, isRead });

      // Update local state
      const articles = new Map(get().articles);
      for (const [feedId, feedArticles] of articles.entries()) {
        const updated = feedArticles.map((a) =>
          a.id === articleId ? { ...a, is_read: isRead } : a
        );
        articles.set(feedId, updated);
      }
      set({ articles });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to mark article",
      });
      throw error;
    }
  },

  // Add article to reading queue
  addArticleToQueue: async (articleId) => {
    try {
      // Get current queued status
      const articles = get().articles;
      let currentStatus = false;
      for (const feedArticles of articles.values()) {
        const article = feedArticles.find((a) => a.id === articleId);
        if (article) {
          currentStatus = article.is_queued;
          break;
        }
      }

      if (currentStatus) {
        // Article is already queued, just toggle it off
        await invoke<boolean>("toggle_rss_article_queued", {
          id: articleId,
        });

        // Update local state
        const updatedArticles = new Map(get().articles);
        for (const [feedId, feedArticles] of updatedArticles.entries()) {
          const updated = feedArticles.map((a) =>
            a.id === articleId ? { ...a, is_queued: false } : a
          );
          updatedArticles.set(feedId, updated);
        }
        set({ articles: updatedArticles });
      } else {
        // Add article to queue as a document
        await invoke<string>("add_rss_article_to_queue", {
          articleId,
        });

        // Update local state to mark as queued
        const updatedArticles = new Map(get().articles);
        for (const [feedId, feedArticles] of updatedArticles.entries()) {
          const updated = feedArticles.map((a) =>
            a.id === articleId ? { ...a, is_queued: true } : a
          );
          updatedArticles.set(feedId, updated);
        }
        set({ articles: updatedArticles });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add to queue",
      });
      throw error;
    }
  },

  // UI Actions
  setSelectedFeed: (feedId) => {
    set({ selectedFeedId: feedId });
    if (feedId) {
      get().loadArticles(feedId);
    }
  },

  setShowUnreadOnly: (value) => set({ showUnreadOnly: value }),
  setShowQueuedOnly: (value) => set({ showQueuedOnly: value }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Utility functions
  getCategories: () => {
    const feeds = get().feeds;
    const categories = new Set<string>();
    feeds.forEach((feed) => {
      if (feed.category) {
        categories.add(feed.category);
      }
    });
    return Array.from(categories).sort();
  },

  getUnreadCount: (feedId) => {
    const articles = get().articles;
    if (feedId) {
      const feedArticles = articles.get(feedId) || [];
      return feedArticles.filter((a) => !a.is_read).length;
    } else {
      // Total unread across all feeds
      let count = 0;
      for (const feedArticles of articles.values()) {
        count += feedArticles.filter((a) => !a.is_read).length;
      }
      return count;
    }
  },
}));
