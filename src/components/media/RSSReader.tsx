import { useState, useEffect } from "react";
import {
  Rss,
  Plus,
  Search,
  Star,
  StarOff,
  ExternalLink,
  FolderPlus,
  RefreshCw,
  Settings,
  Trash2,
  Check,
  CheckCircle2,
  Folder,
  Import,
  Download,
} from "lucide-react";
import {
  Feed,
  FeedItem,
  getSubscribedFeeds,
  fetchFeed,
  subscribeToFeed,
  unsubscribeFromFeed,
  markItemRead,
  markFeedRead,
  toggleItemFavorite,
  getUnreadItems,
  getFavoriteItems,
  searchFeedItems,
  getFeedFolders,
  createFolder,
  addFeedToFolder,
  importOPML,
  exportOPML,
  formatFeedDate,
} from "../../api/rss";

type ViewMode = "all" | "unread" | "favorites" | "search";
type SortOrder = "date" | "title";

export function RSSReader() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const [items, setItems] = useState<Array<{ feed: Feed; item: FeedItem }>>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [folders, setFolders] = useState(getFeedFolders());

  // Load feeds on mount
  useEffect(() => {
    loadFeeds();
  }, []);

  // Update items when feeds or view mode changes
  useEffect(() => {
    if (viewMode === "all" && selectedFeed) {
      setItems(selectedFeed.items.map((item) => ({ feed: selectedFeed, item })));
    } else if (viewMode === "unread") {
      setItems(getUnreadItems());
    } else if (viewMode === "favorites") {
      setItems(getFavoriteItems());
    } else if (viewMode === "search" && searchQuery) {
      setItems(searchFeedItems(searchQuery));
    }
  }, [viewMode, selectedFeed, feeds, searchQuery]);

  const loadFeeds = () => {
    setFeeds(getSubscribedFeeds());
    setFolders(getFeedFolders());
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;

    setIsAdding(true);
    try {
      const feed = await fetchFeed(newFeedUrl);
      if (feed) {
        subscribeToFeed(feed);
        loadFeeds();
        setSelectedFeed(feed);
        setShowAddDialog(false);
        setNewFeedUrl("");
      } else {
        alert("Failed to parse feed. Please check the URL.");
      }
    } catch (error) {
      alert("Error adding feed: " + (error as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefreshFeed = async (feed: Feed) => {
    try {
      const updated = await fetchFeed(feed.feedUrl);
      if (updated) {
        // Preserve read/favorite status
        const existing = getSubscribedFeeds().find((f) => f.id === feed.id);
        if (existing) {
          updated.items.forEach((newItem) => {
            const existingItem = existing.items.find((i) => i.id === newItem.id);
            if (existingItem) {
              newItem.read = existingItem.read;
              newItem.favorite = existingItem.favorite;
            }
          });
        }

        subscribeToFeed(updated);
        loadFeeds();
        if (selectedFeed?.id === updated.id) {
          setSelectedFeed(updated);
        }
      }
    } catch (error) {
      alert("Failed to refresh feed: " + (error as Error).message);
    }
  };

  const handleRemoveFeed = (feedId: string) => {
    if (confirm("Are you sure you want to unsubscribe from this feed?")) {
      unsubscribeFromFeed(feedId);
      loadFeeds();
      if (selectedFeed?.id === feedId) {
        setSelectedFeed(null);
      }
    }
  };

  const handleItemClick = (feed: Feed, item: FeedItem) => {
    markItemRead(feed.id, item.id, true);
    loadFeeds();
    setSelectedItem(item);
  };

  const handleToggleFavorite = (feed: Feed, item: FeedItem) => {
    toggleItemFavorite(feed.id, item.id);
    loadFeeds();
  };

  const handleMarkAllRead = (feedId: string) => {
    markFeedRead(feedId);
    loadFeeds();
  };

  const handleExportOPML = () => {
    const opml = exportOPML();
    const blob = new Blob([opml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feeds.opml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportOPML = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".opml,.xml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const importedFeeds = importOPML(content);
          importedFeeds.forEach((feed) => subscribeToFeed(feed));
          loadFeeds();
          alert(`Imported ${importedFeeds.length} feeds`);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const unreadCount = feeds.reduce((acc, feed) => acc + feed.unreadCount, 0);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rss className="w-5 h-5 text-orange-500" />
              Feeds
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setShowAddDialog(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Add feed"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleImportOPML}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Import OPML"
              >
                <Import className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportOPML}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Export OPML"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* View mode tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setViewMode("all")}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                viewMode === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode("unread")}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors relative ${
                viewMode === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 px-1 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("favorites")}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                viewMode === "favorites"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Favorites
            </button>
          </div>

          {/* Search */}
          {viewMode === "search" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Feed list */}
        <div className="flex-1 overflow-y-auto">
          {feeds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Rss className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No feeds yet</p>
              <button
                onClick={() => setShowAddDialog(true)}
                className="text-orange-500 hover:underline text-sm"
              >
                Add your first feed
              </button>
            </div>
          ) : (
            <div>
              {/* Folders */}
              {folders.map((folder) => (
                <div key={folder.id} className="border-b border-border">
                  <button className="w-full px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                    <Folder className="w-4 h-4" />
                    {folder.name}
                  </button>
                </div>
              ))}

              {/* Feeds */}
              {feeds.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => {
                    setSelectedFeed(feed);
                    setViewMode("all");
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-start gap-2 ${
                    selectedFeed?.id === feed.id ? "bg-muted/50" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {feed.imageUrl ? (
                      <img
                        src={feed.imageUrl}
                        alt=""
                        className="w-4 h-4 rounded"
                      />
                    ) : (
                      <Rss className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>

                  {/* Title and unread count */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate">
                        {feed.title}
                      </span>
                      {feed.unreadCount > 0 && (
                        <span className="ml-1 px-1.5 bg-orange-500 text-white text-xs rounded-full">
                          {feed.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Items list */}
        <div className="flex-1 overflow-y-auto border-r border-border">
          {selectedFeed && viewMode === "all" && (
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedFeed.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedFeed.items.length} items</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRefreshFeed(selectedFeed)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    title="Refresh feed"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMarkAllRead(selectedFeed.id)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    title="Mark all as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveFeed(selectedFeed.id)}
                    className="p-2 text-destructive hover:bg-destructive/20 rounded-lg"
                    title="Unsubscribe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {viewMode === "unread" ? "No unread items" : "No articles"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map(({ feed, item }) => (
                <article
                  key={`${feed.id}-${item.id}`}
                  onClick={() => handleItemClick(feed, item)}
                  className={`p-4 hover:bg-muted/30 cursor-pointer transition-colors ${
                    !item.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Read status */}
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      item.read ? "bg-muted" : "bg-orange-500"
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium mb-1 ${
                        item.read ? "text-muted-foreground" : "text-foreground"
                      }`}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {item.description.replace(/<[^>]+>/g, "")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{feed.title}</span>
                        <span>•</span>
                        <span>{formatFeedDate(item.pubDate)}</span>
                        {item.author && (
                          <>
                            <span>•</span>
                            <span>{item.author}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(feed, item);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title={item.favorite ? "Remove favorite" : "Add to favorites"}
                      >
                        {item.favorite ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Open original"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Article preview */}
        {selectedItem && (
          <div className="h-1/2 border-t border-border bg-card overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-2">{selectedItem.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                <span>{formatFeedDate(selectedItem.pubDate)}</span>
                {selectedItem.author && <span>by {selectedItem.author}</span>}
              </div>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: selectedItem.content }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Feed Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-4">Add RSS Feed</h2>
            <input
              type="url"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewFeedUrl("");
                }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFeed}
                disabled={isAdding || !newFeedUrl}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add Feed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
