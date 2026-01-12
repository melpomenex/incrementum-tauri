import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RssFeed,
  RssArticle,
  RssFeedFolder,
  RssViewMode,
  RssFilters,
} from "../types/rss";
import * as rssApi from "../api/rssTauri";
import { createDocument } from "../api/documents";

interface RssState {
  // Data
  feeds: RssFeed[];
  articles: RssArticle[];
  folders: RssFeedFolder[];
  selectedArticle: RssArticle | null;
  selectedFeedId: string | null;

  // UI State
  isLoading: boolean;
  isFetchingFeed: boolean;
  error: string | null;
  viewMode: RssViewMode;
  filters: RssFilters;

  // Actions - Feeds
  loadFeeds: () => Promise<void>;
  addFeed: (url: string, category?: string, folder?: string) => Promise<void>;
  updateFeed: (id: string, updates: Partial<RssFeed>) => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  refreshFeed: (feedId: string) => Promise<void>;
  refreshAllFeeds: () => Promise<void>;

  // Actions - Articles
  loadArticles: (feedId?: string) => Promise<void>;
  selectArticle: (article: RssArticle | null) => void;
  markArticleRead: (id: string, isRead: boolean) => Promise<void>;
  toggleArticleFavorite: (id: string) => Promise<void>;
  toggleArticleQueued: (id: string) => Promise<void>;

  // Actions - Folders
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  toggleFolderExpanded: (name: string) => void;
  moveFeedToFolder: (feedId: string, folderName: string | null) => void;

  // Actions - UI
  setViewMode: (mode: RssViewMode) => void;
  setFilters: (filters: Partial<RssFilters>) => void;
  setSelectedFeedId: (feedId: string | null) => void;
  setError: (error: string | null) => void;

  // Actions - OPML
  importOPML: (opmlContent: string) => Promise<void>;
  exportOPML: () => string;
}

export const useRssStore = create<RssState>()(
  persist(
    (set, get) => ({
      // Initial State
      feeds: [],
      articles: [],
      folders: [],
      selectedArticle: null,
      selectedFeedId: null,
      isLoading: false,
      isFetchingFeed: false,
      error: null,
      viewMode: "split",
      filters: {
        showUnreadOnly: false,
        showFavoritesOnly: false,
      },

      // Feed Actions
      loadFeeds: async () => {
        set({ isLoading: true, error: null });
        try {
          const feeds = await rssApi.getRssFeeds();
          // Calculate unread counts
          for (const feed of feeds) {
            try {
              const unreadCount = await rssApi.getRssFeedUnreadCount(feed.id);
              feed.unreadCount = unreadCount;
            } catch (e) {
              console.error(`Failed to get unread count for feed ${feed.id}:`, e);
              feed.unreadCount = 0;
            }
          }
          set({ feeds, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load feeds",
            isLoading: false,
          });
        }
      },

      addFeed: async (url: string, category?: string, folder?: string) => {
        set({ isFetchingFeed: true, error: null });
        try {
          // Fetch and parse feed
          const xmlContent = await rssApi.fetchFeedContent(url);
          const parsedFeed = rssApi.parseFeedXml(xmlContent);

          if (!parsedFeed) {
            throw new Error("Failed to parse feed XML");
          }

          // Create feed in database
          const feed = await rssApi.createRssFeed(
            url,
            parsedFeed.title,
            parsedFeed.description,
            category,
            3600, // Default 1 hour update interval
            false // Don't auto-queue by default
          );

          // Add folder if specified
          if (folder) {
            const { folders } = get();
            const existingFolder = folders.find((f) => f.name === folder);
            if (existingFolder) {
              existingFolder.feedIds.push(feed.id);
              set({ folders: [...folders] });
            } else {
              set({
                folders: [
                  ...folders,
                  { name: folder, isExpanded: true, feedIds: [feed.id] },
                ],
              });
            }
          }

          // Save articles
          for (const item of parsedFeed.items) {
            try {
              await rssApi.createRssArticle(
                feed.id,
                item.url,
                item.title,
                item.author,
                item.publishedDate,
                item.content,
                item.summary,
                item.imageUrl
              );
            } catch (e) {
              console.error("Failed to save article:", e);
            }
          }

          // Update last fetched
          await rssApi.updateRssFeedFetched(feed.id);

          // Reload feeds
          await get().loadFeeds();
          set({ isFetchingFeed: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to add feed",
            isFetchingFeed: false,
          });
          throw error;
        }
      },

      updateFeed: async (id: string, updates: Partial<RssFeed>) => {
        try {
          await rssApi.updateRssFeed(id, {
            title: updates.title,
            description: updates.description,
            category: updates.category,
            updateInterval: updates.updateInterval,
            autoQueue: updates.autoQueue,
            isActive: updates.isActive,
          });
          await get().loadFeeds();
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to update feed",
          });
          throw error;
        }
      },

      deleteFeed: async (id: string) => {
        try {
          await rssApi.deleteRssFeed(id);

          // Remove from folders
          const { folders } = get();
          const updatedFolders = folders.map((folder) => ({
            ...folder,
            feedIds: folder.feedIds.filter((feedId) => feedId !== id),
          }));
          set({ folders: updatedFolders });

          await get().loadFeeds();
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to delete feed",
          });
          throw error;
        }
      },

      refreshFeed: async (feedId: string) => {
        set({ isFetchingFeed: true, error: null });
        try {
          const feed = await rssApi.getRssFeed(feedId);
          if (!feed) {
            throw new Error("Feed not found");
          }

          // Fetch and parse feed
          const xmlContent = await rssApi.fetchFeedContent(feed.url);
          const parsedFeed = rssApi.parseFeedXml(xmlContent);

          if (!parsedFeed) {
            throw new Error("Failed to parse feed XML");
          }

          // Get existing articles to avoid duplicates
          const existingArticles = await rssApi.getRssArticles(feedId);
          const existingUrls = new Set(existingArticles.map((a) => a.url));

          // Save new articles
          for (const item of parsedFeed.items) {
            if (!existingUrls.has(item.url)) {
              try {
                await rssApi.createRssArticle(
                  feedId,
                  item.url,
                  item.title,
                  item.author,
                  item.publishedDate,
                  item.content,
                  item.summary,
                  item.imageUrl
                );
              } catch (e) {
                console.error("Failed to save article:", e);
              }
            }
          }

          // Update last fetched
          await rssApi.updateRssFeedFetched(feedId);

          // Reload feeds and articles
          await get().loadFeeds();
          if (get().selectedFeedId === feedId) {
            await get().loadArticles(feedId);
          }

          set({ isFetchingFeed: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to refresh feed",
            isFetchingFeed: false,
          });
          throw error;
        }
      },

      refreshAllFeeds: async () => {
        const { feeds } = get();
        for (const feed of feeds) {
          if (feed.isActive) {
            try {
              await get().refreshFeed(feed.id);
            } catch (e) {
              console.error(`Failed to refresh feed ${feed.id}:`, e);
            }
          }
        }
      },

      // Article Actions
      loadArticles: async (feedId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const articles = await rssApi.getRssArticles(feedId, 100);
          set({ articles, isLoading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to load articles",
            isLoading: false,
          });
        }
      },

      selectArticle: (article) => set({ selectedArticle: article }),

      markArticleRead: async (id: string, isRead: boolean) => {
        try {
          await rssApi.markRssArticleRead(id, isRead);

          // Update local state
          const { articles } = get();
          const updatedArticles = articles.map((a) =>
            a.id === id ? { ...a, isRead } : a
          );
          set({ articles: updatedArticles });

          // Update selected article if it's the one being marked
          const { selectedArticle } = get();
          if (selectedArticle?.id === id) {
            set({ selectedArticle: { ...selectedArticle, isRead } });
          }

          // Reload feeds to update unread counts
          await get().loadFeeds();
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to mark article",
          });
          throw error;
        }
      },

      toggleArticleFavorite: async (id: string) => {
        // Note: This is client-side only for now
        // Would need backend support to persist favorites
        const { articles, selectedArticle } = get();
        const updatedArticles = articles.map((a) =>
          a.id === id ? { ...a, isFavorite: !a.isFavorite } : a
        );
        set({ articles: updatedArticles });

        if (selectedArticle?.id === id) {
          set({
            selectedArticle: {
              ...selectedArticle,
              isFavorite: !selectedArticle.isFavorite,
            },
          });
        }
      },

      toggleArticleQueued: async (id: string) => {
        try {
          const { articles } = get();
          const article = articles.find((a) => a.id === id);
          if (!article) {
            throw new Error("Article not found");
          }

          const newStatus = await rssApi.toggleRssArticleQueued(id);

          // If article is being queued, create a document for it
          if (newStatus && !article.isQueued) {
            try {
              // Create a document from the RSS article
              // This will make it appear in the Incremental Reading queue
              await createDocument(
                article.title,
                article.url, // Use URL as file path
                "html"
              );
            } catch (docError) {
              console.error("Failed to create document from RSS article:", docError);
              // Continue anyway - the article is still marked as queued
            }
          }

          // Update local state
          const updatedArticles = articles.map((a) =>
            a.id === id ? { ...a, isQueued: newStatus } : a
          );
          set({ articles: updatedArticles });

          // Update selected article if it's the one being toggled
          const { selectedArticle } = get();
          if (selectedArticle?.id === id) {
            set({ selectedArticle: { ...selectedArticle, isQueued: newStatus } });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to queue article",
          });
          throw error;
        }
      },

      // Folder Actions
      createFolder: (name: string) => {
        const { folders } = get();
        if (!folders.find((f) => f.name === name)) {
          set({
            folders: [
              ...folders,
              { name, isExpanded: true, feedIds: [] },
            ],
          });
        }
      },

      deleteFolder: (name: string) => {
        const { folders } = get();
        set({ folders: folders.filter((f) => f.name !== name) });
      },

      toggleFolderExpanded: (name: string) => {
        const { folders } = get();
        const updatedFolders = folders.map((f) =>
          f.name === name ? { ...f, isExpanded: !f.isExpanded } : f
        );
        set({ folders: updatedFolders });
      },

      moveFeedToFolder: (feedId: string, folderName: string | null) => {
        const { folders, feeds } = get();

        // Remove feed from all folders
        let updatedFolders = folders.map((folder) => ({
          ...folder,
          feedIds: folder.feedIds.filter((id) => id !== feedId),
        }));

        // Add to new folder if specified
        if (folderName) {
          const targetFolder = updatedFolders.find((f) => f.name === folderName);
          if (targetFolder) {
            targetFolder.feedIds.push(feedId);
          } else {
            updatedFolders.push({
              name: folderName,
              isExpanded: true,
              feedIds: [feedId],
            });
          }

          // Update feed's folder property
          const feed = feeds.find((f) => f.id === feedId);
          if (feed) {
            feed.folder = folderName;
          }
        } else {
          // Remove folder from feed
          const feed = feeds.find((f) => f.id === feedId);
          if (feed) {
            feed.folder = undefined;
          }
        }

        set({ folders: updatedFolders });
      },

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      setSelectedFeedId: (feedId) => {
        set({ selectedFeedId: feedId });
        if (feedId) {
          get().loadArticles(feedId);
        } else {
          get().loadArticles();
        }
      },

      setError: (error) => set({ error }),

      // OPML Actions
      importOPML: async (opmlContent: string) => {
        set({ isLoading: true, error: null });
        try {
          const opmlFeeds = rssApi.importOPML(opmlContent);

          // Add each feed from OPML
          for (const opmlFeed of opmlFeeds) {
            try {
              await get().addFeed(opmlFeed.feedUrl, opmlFeed.category);
            } catch (error) {
              console.error(`Failed to import feed ${opmlFeed.title}:`, error);
              // Continue with next feed
            }
          }

          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to import OPML",
            isLoading: false,
          });
          throw error;
        }
      },

      exportOPML: () => {
        const { feeds } = get();
        return rssApi.exportOPML(feeds);
      },
    }),
    {
      name: "rss-storage",
      partialize: (state) => ({
        viewMode: state.viewMode,
        filters: state.filters,
        folders: state.folders,
      }),
    }
  )
);
