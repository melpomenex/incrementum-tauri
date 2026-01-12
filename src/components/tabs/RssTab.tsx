import { useEffect, useState, useCallback } from "react";
import { useRssStore } from "../../stores/rssStore";
import type { RssArticle, RssFeed, RssViewMode } from "../../types/rss";
import {
  Rss,
  RefreshCw,
  Plus,
  Trash2,
  Folder,
  FolderPlus,
  Settings,
  List,
  Grid3x3,
  LayoutGrid,
  Star,
  BookOpen,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  BookmarkPlus,
  Search,
  X,
  Download,
  Upload,
  MoreVertical,
} from "lucide-react";

export function RssTab() {
  console.log("RssTab component rendering...");

  let storeData;
  try {
    storeData = useRssStore();
    console.log("RSS Store loaded successfully:", storeData);
  } catch (error) {
    console.error("Error loading RSS store:", error);
    return <div className="p-8 text-red-500">Error loading RSS store: {String(error)}</div>;
  }

  const {
    feeds,
    articles,
    folders,
    selectedArticle,
    selectedFeedId,
    isLoading,
    isFetchingFeed,
    error,
    viewMode,
    filters,
    loadFeeds,
    loadArticles,
    addFeed,
    updateFeed,
    deleteFeed,
    refreshFeed,
    refreshAllFeeds,
    selectArticle,
    markArticleRead,
    toggleArticleFavorite,
    toggleArticleQueued,
    createFolder,
    deleteFolder,
    toggleFolderExpanded,
    moveFeedToFolder,
    setViewMode,
    setFilters,
    setSelectedFeedId,
    importOPML,
    exportOPML,
  } = storeData;

  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load feeds on mount
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // Load all articles when no feed is selected
  useEffect(() => {
    if (!selectedFeedId) {
      loadArticles();
    }
  }, [selectedFeedId, loadArticles]);

  // Handle add feed
  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;

    try {
      await addFeed(newFeedUrl, undefined, undefined);
      setNewFeedUrl("");
      setShowAddFeed(false);
    } catch (error) {
      console.error("Failed to add feed:", error);
    }
  };

  // Handle add folder
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName);
    setNewFolderName("");
    setShowAddFolder(false);
  };

  // Handle OPML import
  const handleImportOPML = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".opml,.xml";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        await importOPML(content);
      } catch (error) {
        console.error("Failed to import OPML:", error);
      }
    };
    input.click();
  };

  // Handle OPML export
  const handleExportOPML = () => {
    try {
      const opmlContent = exportOPML();
      const blob = new Blob([opmlContent], { type: "text/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incrementum-feeds-${new Date().toISOString().split("T")[0]}.opml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export OPML:", error);
    }
  };

  // Filter articles based on current filters
  const filteredArticles = articles.filter((article) => {
    if (filters.showUnreadOnly && article.isRead) return false;
    if (filters.showFavoritesOnly && !article.isFavorite) return false;
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Get feeds organized by folders
  const organizedFeeds = () => {
    const feedsInFolders = new Set<string>();
    const folderGroups = folders.map((folder) => ({
      folder,
      feeds: feeds.filter((feed) => folder.feedIds.includes(feed.id)),
    }));

    // Collect all feed IDs that are in folders
    folders.forEach((folder) => {
      folder.feedIds.forEach((id) => feedsInFolders.add(id));
    });

    // Get feeds not in any folder
    const unorganizedFeeds = feeds.filter((feed) => !feedsInFolders.has(feed.id));

    return { folderGroups, unorganizedFeeds };
  };

  const { folderGroups, unorganizedFeeds } = organizedFeeds();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentIndex = filteredArticles.findIndex((a) => a.id === selectedArticle?.id);

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          if (currentIndex < filteredArticles.length - 1) {
            selectArticle(filteredArticles[currentIndex + 1]);
          }
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          if (currentIndex > 0) {
            selectArticle(filteredArticles[currentIndex - 1]);
          }
          break;
        case " ":
          e.preventDefault();
          if (selectedArticle) {
            markArticleRead(selectedArticle.id, !selectedArticle.isRead);
          }
          break;
        case "s":
          e.preventDefault();
          if (selectedArticle) {
            toggleArticleFavorite(selectedArticle.id);
          }
          break;
        case "q":
          e.preventDefault();
          if (selectedArticle) {
            toggleArticleQueued(selectedArticle.id);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedArticle, filteredArticles, selectArticle, markArticleRead, toggleArticleFavorite, toggleArticleQueued]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Rss className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">RSS Feeds</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-background shadow" : "hover:bg-background/50"}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded ${viewMode === "split" ? "bg-background shadow" : "hover:bg-background/50"}`}
              title="Split view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${viewMode === "grid" ? "bg-background shadow" : "hover:bg-background/50"}`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh All */}
          <button
            onClick={refreshAllFeeds}
            disabled={isFetchingFeed}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            title="Refresh all feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingFeed ? "animate-spin" : ""}`} />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    handleImportOPML();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 rounded-t-lg"
                >
                  <Upload className="w-4 h-4" />
                  Import OPML
                </button>
                <button
                  onClick={() => {
                    handleExportOPML();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 rounded-b-lg"
                >
                  <Download className="w-4 h-4" />
                  Export OPML
                </button>
              </div>
            )}
          </div>

          {/* Add Feed */}
          <button
            onClick={() => setShowAddFeed(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      </div>

      {/* Main Content - Three Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Feeds & Folders */}
        <div className="w-64 border-r border-border flex flex-col bg-card">
          {/* Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <button
              onClick={() => setFilters({ showUnreadOnly: !filters.showUnreadOnly })}
              className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                filters.showUnreadOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Unread Only
            </button>
            <button
              onClick={() => setFilters({ showFavoritesOnly: !filters.showFavoritesOnly })}
              className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                filters.showFavoritesOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
          </div>

          {/* Feeds List */}
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {/* All Articles */}
            <button
              onClick={() => setSelectedFeedId(null)}
              className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                selectedFeedId === null
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted"
              }`}
            >
              All Articles
            </button>

            {/* Folders */}
            {folderGroups.map(({ folder, feeds: folderFeeds }) => (
              <div key={folder.name} className="space-y-1">
                <button
                  onClick={() => toggleFolderExpanded(folder.name)}
                  className="w-full px-2 py-1.5 rounded text-sm font-medium flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  {folder.isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Folder className="w-4 h-4" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{folderFeeds.length}</span>
                </button>

                {folder.isExpanded && (
                  <div className="ml-6 space-y-1">
                    {folderFeeds.map((feed) => (
                      <FeedItem
                        key={feed.id}
                        feed={feed}
                        isSelected={selectedFeedId === feed.id}
                        onSelect={() => setSelectedFeedId(feed.id)}
                        onRefresh={() => refreshFeed(feed.id)}
                        onDelete={() => deleteFeed(feed.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Unorganized Feeds */}
            {unorganizedFeeds.map((feed) => (
              <FeedItem
                key={feed.id}
                feed={feed}
                isSelected={selectedFeedId === feed.id}
                onSelect={() => setSelectedFeedId(feed.id)}
                onRefresh={() => refreshFeed(feed.id)}
                onDelete={() => deleteFeed(feed.id)}
              />
            ))}

            {/* Add Folder Button */}
            <button
              onClick={() => setShowAddFolder(true)}
              className="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-muted transition-colors text-muted-foreground"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>
        </div>

        {/* Middle - Article List */}
        <div className={`${viewMode === "split" ? "w-96" : "flex-1"} border-r border-border flex flex-col bg-background`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-10 pr-8 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Articles */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Rss className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No articles to display</p>
                <p className="text-xs mt-2">
                  {feeds.length === 0
                    ? "Add some RSS feeds to get started"
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3 p-3" : "space-y-1 p-2"}>
                {filteredArticles.map((article) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    isSelected={selectedArticle?.id === article.id}
                    viewMode={viewMode}
                    onSelect={() => {
                      selectArticle(article);
                      if (!article.isRead) {
                        markArticleRead(article.id, true);
                      }
                    }}
                    onToggleFavorite={() => toggleArticleFavorite(article.id)}
                    onToggleQueued={() => toggleArticleQueued(article.id)}
                    onToggleRead={() => markArticleRead(article.id, !article.isRead)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Article Reader (only in split view) */}
        {viewMode === "split" && (
          <div className="flex-1 flex flex-col bg-card">
            {selectedArticle ? (
              <ArticleReader article={selectedArticle} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an article to read</p>
                  <p className="text-xs mt-2">Use ↑↓ or j/k to navigate</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Feed Modal */}
      {showAddFeed && (
        <Modal onClose={() => setShowAddFeed(false)} title="Add RSS Feed">
          <div className="space-y-4">
            <input
              type="url"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="Enter RSS feed URL..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === "Enter" && handleAddFeed()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddFeed(false)}
                className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFeed}
                disabled={!newFeedUrl.trim() || isFetchingFeed}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isFetchingFeed && <RefreshCw className="w-4 h-4 animate-spin" />}
                Add Feed
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Folder Modal */}
      {showAddFolder && (
        <Modal onClose={() => setShowAddFolder(false)} title="New Folder">
          <div className="space-y-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddFolder(false)}
                className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// Feed Item Component
function FeedItem({
  feed,
  isSelected,
  onSelect,
  onRefresh,
  onDelete,
}: {
  feed: RssFeed;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 truncate">{feed.title}</span>
        {feed.unreadCount !== undefined && feed.unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
            {feed.unreadCount}
          </span>
        )}
      </div>

      {showActions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-card shadow-lg rounded px-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="p-1 hover:bg-muted rounded"
            title="Refresh feed"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete feed "${feed.title}"?`)) {
                onDelete();
              }
            }}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
            title="Delete feed"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Article Item Component
function ArticleItem({
  article,
  isSelected,
  viewMode,
  onSelect,
  onToggleFavorite,
  onToggleQueued,
  onToggleRead,
}: {
  article: RssArticle;
  isSelected: boolean;
  viewMode: RssViewMode;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onToggleQueued: () => void;
  onToggleRead: () => void;
}) {
  return (
    <div
      className={`group p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary/10 border-2 border-primary/20"
          : "bg-card border border-border hover:bg-muted"
      } ${!article.isRead ? "font-medium" : "opacity-70"}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {article.imageUrl && viewMode !== "list" && (
          <img
            src={article.imageUrl}
            alt=""
            className="w-16 h-16 object-cover rounded flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 mb-1">{article.title}</h3>
          {article.summary && viewMode !== "list" && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {article.author && <span>{article.author}</span>}
            {article.publishedDate && (
              <span>{new Date(article.publishedDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead();
            }}
            className="p-1 hover:bg-background rounded"
            title={article.isRead ? "Mark unread" : "Mark read"}
          >
            {article.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1 hover:bg-background rounded ${article.isFavorite ? "text-yellow-500" : ""}`}
            title="Favorite"
          >
            <Star className="w-4 h-4" fill={article.isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleQueued();
            }}
            className={`p-1 hover:bg-background rounded ${article.isQueued ? "text-primary" : ""}`}
            title={article.isQueued ? "Remove from queue" : "Add to queue"}
          >
            <BookmarkPlus className="w-4 h-4" fill={article.isQueued ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Article Reader Component
function ArticleReader({ article }: { article: RssArticle }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold mb-2">{article.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {article.author && <span>By {article.author}</span>}
          {article.publishedDate && (
            <span>{new Date(article.publishedDate).toLocaleString()}</span>
          )}
        </div>
        <div className="mt-3">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Open original article →
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full max-w-2xl mb-6 rounded-lg"
          />
        )}

        {article.content ? (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : article.summary ? (
          <p className="text-muted-foreground">{article.summary}</p>
        ) : (
          <p className="text-muted-foreground italic">No content available</p>
        )}
      </div>
    </div>
  );
}

// Modal Component
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
