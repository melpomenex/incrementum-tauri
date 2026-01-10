import { useEffect, useState } from "react";
import { useRssStore } from "../../stores/rssStore";
import {
  Rss,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  BookmarkPlus,
  Check,
  Circle,
  Filter,
  Search,
  FolderOpen,
  Download,
  Upload,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { importOPML } from "../../api/rss";

export function RssTab() {
  const {
    feeds,
    articles,
    selectedFeedId,
    isLoading,
    error,
    showUnreadOnly,
    showQueuedOnly,
    searchQuery,
    selectedCategory,
    loadFeeds,
    addFeed,
    updateFeed,
    deleteFeed,
    refreshFeed,
    loadArticles,
    markArticleRead,
    addArticleToQueue,
    setSelectedFeed,
    setShowUnreadOnly,
    setShowQueuedOnly,
    setSearchQuery,
    setSelectedCategory,
    getCategories,
    getUnreadCount,
  } = useRssStore();

  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [showAddFeedDialog, setShowAddFeedDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState<string | null>(null);
  const [feedSettings, setFeedSettings] = useState({
    category: "",
    updateInterval: 3600,
    autoQueue: false,
  });

  // Load feeds on mount
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // Handle add feed
  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;

    try {
      await addFeed(newFeedUrl, {
        category: feedSettings.category || undefined,
        updateInterval: feedSettings.updateInterval,
        autoQueue: feedSettings.autoQueue,
      });
      setNewFeedUrl("");
      setShowAddFeedDialog(false);
      setFeedSettings({ category: "", updateInterval: 3600, autoQueue: false });
    } catch (error) {
      console.error("Error adding feed:", error);
    }
  };

  // Handle refresh feed
  const handleRefreshFeed = async (feedId: string) => {
    try {
      const newCount = await refreshFeed(feedId);
      console.log(`Fetched ${newCount} new articles`);
    } catch (error) {
      console.error("Error refreshing feed:", error);
    }
  };

  // Handle delete feed
  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm("Are you sure you want to delete this feed?")) return;
    try {
      await deleteFeed(feedId);
    } catch (error) {
      console.error("Error deleting feed:", error);
    }
  };

  // Handle update feed settings
  const handleUpdateFeedSettings = async (feedId: string) => {
    try {
      await updateFeed(feedId, {
        category: feedSettings.category || null,
        update_interval: feedSettings.updateInterval,
        auto_queue: feedSettings.autoQueue,
      });
      setShowSettingsDialog(null);
    } catch (error) {
      console.error("Error updating feed:", error);
    }
  };

  // Handle OPML import
  const handleImportOPML = async () => {
    try {
      // Use Tauri file dialog
      const { open } = await import("@tauri-apps/plugin-dialog");
      const file = await open({
        filters: [{ name: "OPML", extensions: ["opml", "xml"] }],
      });

      if (file) {
        const content = await import("@tauri-apps/plugin-fs").then((fs) =>
          fs.readTextFile(file as string)
        );
        const feeds = importOPML(content);

        // Add each feed
        for (const feed of feeds) {
          try {
            await addFeed(feed.feedUrl);
          } catch (error) {
            console.error(`Failed to import ${feed.title}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error importing OPML:", error);
    }
  };

  // Handle OPML export
  const handleExportOPML = async () => {
    try {
      // Generate OPML from current feeds
      let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Incrementum Feed Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
`;

      feeds.forEach((feed) => {
        const escapeXml = (text: string) =>
          text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

        opml += `    <outline type="rss" text="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.url)}"/>\n`;
      });

      opml += `  </body>
</opml>`;

      const { save } = await import("@tauri-apps/plugin-dialog");
      const filePath = await save({
        filters: [{ name: "OPML", extensions: ["opml"] }],
        defaultPath: "feeds.opml",
      });

      if (filePath) {
        await import("@tauri-apps/plugin-fs").then((fs) =>
          fs.writeTextFile(filePath as string, opml)
        );
      }
    } catch (error) {
      console.error("Error exporting OPML:", error);
    }
  };

  // Get current feed articles with filters applied
  const getCurrentArticles = () => {
    if (!selectedFeedId) return [];

    let currentArticles = articles.get(selectedFeedId) || [];

    // Apply filters
    if (showUnreadOnly) {
      currentArticles = currentArticles.filter((a) => !a.is_read);
    }

    if (showQueuedOnly) {
      currentArticles = currentArticles.filter((a) => a.is_queued);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      currentArticles = currentArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.summary?.toLowerCase().includes(query)
      );
    }

    return currentArticles;
  };

  const categories = getCategories();
  const selectedFeed = feeds.find((f) => f.id === selectedFeedId);
  const currentArticles = getCurrentArticles();

  // Get filtered feeds by category
  const filteredFeeds = selectedCategory
    ? feeds.filter((f) => f.category === selectedCategory)
    : feeds;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rss className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">RSS Feeds</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImportOPML}
              className="px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              title="Import OPML"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleExportOPML}
              className="px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              title="Export OPML"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowAddFeedDialog(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Feed
            </button>
          </div>
        </div>

        {/* Categories filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-muted"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feed list sidebar */}
        <div className="w-80 border-r border-border overflow-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Feeds ({filteredFeeds.length})
            </h3>

            {filteredFeeds.length === 0 ? (
              <div className="text-center py-8">
                <Rss className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No feeds yet. Add your first RSS feed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFeeds.map((feed) => {
                  const unreadCount = getUnreadCount(feed.id);
                  return (
                    <div
                      key={feed.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        selectedFeedId === feed.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-card border border-border hover:bg-muted"
                      }`}
                      onClick={() => setSelectedFeed(feed.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground truncate">
                              {feed.title}
                            </h4>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {feed.category && (
                            <span className="text-xs text-muted-foreground">
                              <FolderOpen className="w-3 h-3 inline mr-1" />
                              {feed.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshFeed(feed.id);
                            }}
                            className="p-1 hover:bg-primary/10 rounded transition-colors"
                            title="Refresh feed"
                          >
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSettingsDialog(feed.id);
                              setFeedSettings({
                                category: feed.category || "",
                                updateInterval: feed.update_interval,
                                autoQueue: feed.auto_queue,
                              });
                            }}
                            className="p-1 hover:bg-primary/10 rounded transition-colors"
                            title="Feed settings"
                          >
                            <Settings className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFeed(feed.id);
                            }}
                            className="p-1 hover:bg-destructive/10 rounded transition-colors"
                            title="Delete feed"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Articles view */}
        <div className="flex-1 overflow-auto">
          {selectedFeed ? (
            <div className="p-4">
              {/* Article filters */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>

                <button
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    showUnreadOnly
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:bg-muted"
                  }`}
                >
                  <Circle className="w-4 h-4" />
                  Unread Only
                </button>

                <button
                  onClick={() => setShowQueuedOnly(!showQueuedOnly)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    showQueuedOnly
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:bg-muted"
                  }`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Queued Only
                </button>

                <button
                  onClick={() => handleRefreshFeed(selectedFeed.id)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {/* Articles list */}
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">Loading articles...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                </div>
              ) : currentArticles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery || showUnreadOnly || showQueuedOnly
                      ? "No articles match your filters"
                      : "No articles yet. Refresh the feed to fetch articles."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentArticles.map((article) => (
                    <div
                      key={article.id}
                      className={`p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow ${
                        article.is_read ? "opacity-60" : ""
                      }`}
                    >
                      {/* Article header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1 leading-snug">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {article.author && (
                              <span>By {article.author}</span>
                            )}
                            {article.published_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(
                                  article.published_date
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Article actions */}
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() =>
                              markArticleRead(article.id, !article.is_read)
                            }
                            className={`p-2 rounded transition-colors ${
                              article.is_read
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            }`}
                            title={
                              article.is_read ? "Mark as unread" : "Mark as read"
                            }
                          >
                            {article.is_read ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => addArticleToQueue(article.id)}
                            className={`p-2 rounded transition-colors ${
                              article.is_queued
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                            title={
                              article.is_queued
                                ? "Remove from queue"
                                : "Add to queue"
                            }
                          >
                            <BookmarkPlus className="w-4 h-4" />
                          </button>

                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded transition-colors"
                            title="Open in browser"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      {/* Article summary */}
                      {article.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {article.summary}
                        </p>
                      )}

                      {/* Article image */}
                      {article.image_url && (
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="mt-3 w-full h-48 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Rss className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a feed to view its articles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Feed Dialog */}
      {showAddFeedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Add RSS Feed
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Feed URL
                </label>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={feedSettings.category}
                  onChange={(e) =>
                    setFeedSettings({ ...feedSettings, category: e.target.value })
                  }
                  placeholder="e.g. Technology, News, Blogs"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Update Interval
                </label>
                <select
                  value={feedSettings.updateInterval}
                  onChange={(e) =>
                    setFeedSettings({
                      ...feedSettings,
                      updateInterval: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value={900}>15 minutes</option>
                  <option value={1800}>30 minutes</option>
                  <option value={3600}>1 hour</option>
                  <option value={7200}>2 hours</option>
                  <option value={21600}>6 hours</option>
                  <option value={43200}>12 hours</option>
                  <option value={86400}>24 hours</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-queue"
                  checked={feedSettings.autoQueue}
                  onChange={(e) =>
                    setFeedSettings({
                      ...feedSettings,
                      autoQueue: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="auto-queue" className="text-sm text-foreground">
                  Automatically add new articles to reading queue
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleAddFeed}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                disabled={isLoading || !newFeedUrl.trim()}
              >
                {isLoading ? "Adding..." : "Add Feed"}
              </button>
              <button
                onClick={() => {
                  setShowAddFeedDialog(false);
                  setNewFeedUrl("");
                  setFeedSettings({
                    category: "",
                    updateInterval: 3600,
                    autoQueue: false,
                  });
                }}
                className="flex-1 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Settings Dialog */}
      {showSettingsDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Feed Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={feedSettings.category}
                  onChange={(e) =>
                    setFeedSettings({ ...feedSettings, category: e.target.value })
                  }
                  placeholder="e.g. Technology, News, Blogs"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Update Interval
                </label>
                <select
                  value={feedSettings.updateInterval}
                  onChange={(e) =>
                    setFeedSettings({
                      ...feedSettings,
                      updateInterval: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value={900}>15 minutes</option>
                  <option value={1800}>30 minutes</option>
                  <option value={3600}>1 hour</option>
                  <option value={7200}>2 hours</option>
                  <option value={21600}>6 hours</option>
                  <option value={43200}>12 hours</option>
                  <option value={86400}>24 hours</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-queue-settings"
                  checked={feedSettings.autoQueue}
                  onChange={(e) =>
                    setFeedSettings({
                      ...feedSettings,
                      autoQueue: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="auto-queue-settings"
                  className="text-sm text-foreground"
                >
                  Automatically add new articles to reading queue
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => handleUpdateFeedSettings(showSettingsDialog)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowSettingsDialog(null)}
                className="flex-1 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
