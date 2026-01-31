import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Rss,
  Plus,
  Search,
  Star,
  StarOff,
  ExternalLink,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle2,
  Folder,
  Import,
  Download,
  Maximize2,
  Minimize2,
  Newspaper,
  X,
} from "lucide-react";
import {
  Feed,
  FeedItem,
  getSubscribedFeeds,
  getSubscribedFeedsAuto,
  fetchFeed,
  subscribeToFeed,
  subscribeToFeedAuto,
  unsubscribeFromFeedAuto,
  markItemReadAuto,
  markFeedReadAuto,
  toggleItemFavoriteAuto,
  getUnreadItems,
  getFavoriteItems,
  searchFeedItems,
  getFeedFolders,
  importOpmlAuto,
  exportOPML,
  exportOpmlAuto,
  formatFeedDate,
  setRssPreferencesAuto,
  getRssPreferencesAuto,
  type RssUserPreference,
} from "../../api/rss";
import { RSSCustomizationPanel, RSSUserPreferenceUpdate } from "./RSSCustomizationPanel";
import { NewsletterDirectory } from "../newsletter/NewsletterDirectory";
import { isTauri } from "../../lib/tauri";

type ViewMode = "all" | "unread" | "favorites" | "search";

// Default auto-refresh interval in milliseconds (5 minutes)
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function RSSReader() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const [items, setItems] = useState<Array<{ feed: Feed; item: FeedItem }>>([]);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedItemFeed, setSelectedItemFeed] = useState<Feed | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [lastNonSearchViewMode, setLastNonSearchViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showNewsletterDirectory, setShowNewsletterDirectory] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [folders, setFolders] = useState(getFeedFolders());
  const [preferences, setPreferences] = useState<RssUserPreference | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastAutoRefresh, setLastAutoRefresh] = useState<Date | null>(null);
  const [isMobileFullScreen, setIsMobileFullScreen] = useState(false);

  // Reference to the auto-refresh interval
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Apply preferences when saved
  const handleSavePreferences = async (newPreferences: RSSUserPreferenceUpdate) => {
    try {
      const saved = await setRssPreferencesAuto(newPreferences, selectedFeed?.id);
      setPreferences(saved);
      console.log("Preferences saved successfully:", saved);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  // Load preferences on mount or when feed changes
  useEffect(() => {
    (async () => {
      if (selectedFeed) {
        try {
          const loaded = await getRssPreferencesAuto(selectedFeed.id);
          setPreferences(loaded);
        } catch (error) {
          console.error("Failed to load preferences:", error);
        }
      }
    })();
  }, [selectedFeed]);

  // Load feeds on mount
  useEffect(() => {
    (async () => {
      await loadFeeds();
    })();
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

  useEffect(() => {
    if (items.length === 0) {
      setSelectedItem(null);
      setSelectedItemFeed(null);
      return;
    }

    if (selectedItem) {
      const stillThere = items.find(({ item }) => item.id === selectedItem.id);
      if (stillThere) {
        setSelectedItem(stillThere.item);
        setSelectedItemFeed(stillThere.feed);
        return;
      }
    }

    setSelectedItem(items[0].item);
    setSelectedItemFeed(items[0].feed);
  }, [items, selectedItem]);

  const loadFeeds = async () => {
    const feeds = await getSubscribedFeedsAuto();
    setFeeds(feeds);
    setFolders(getFeedFolders());
  };

  // Refresh all feeds (for auto-refresh and manual refresh all)
  const refreshAllFeeds = useCallback(async () => {
    if (isAutoRefreshing) return; // Prevent concurrent refreshes

    setIsAutoRefreshing(true);
    console.log("[RSS Auto-Refresh] Starting periodic refresh...");

    try {
      const currentFeeds = await getSubscribedFeedsAuto();

      for (const feed of currentFeeds) {
        try {
          const updated = await fetchFeed(feed.feedUrl);
          if (updated) {
            // Preserve read/favorite status from existing items
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
          }
        } catch (error) {
          console.warn(`[RSS Auto-Refresh] Failed to refresh feed ${feed.title}:`, error);
          // Continue with other feeds even if one fails
        }
      }

      // Reload feeds after updating
      await loadFeeds();
      setLastAutoRefresh(new Date());
      console.log("[RSS Auto-Refresh] Completed periodic refresh");
    } catch (error) {
      console.error("[RSS Auto-Refresh] Failed to refresh feeds:", error);
    } finally {
      setIsAutoRefreshing(false);
    }
  }, [isAutoRefreshing]);

  // Set up periodic auto-refresh
  useEffect(() => {
    // Start the auto-refresh interval
    autoRefreshIntervalRef.current = setInterval(() => {
      refreshAllFeeds();
    }, DEFAULT_REFRESH_INTERVAL_MS);

    console.log(`[RSS Auto-Refresh] Set up periodic refresh every ${DEFAULT_REFRESH_INTERVAL_MS / 1000 / 60} minutes`);

    // Cleanup on unmount
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
        console.log("[RSS Auto-Refresh] Cleared periodic refresh interval");
      }
    };
  }, [refreshAllFeeds]);

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;

    setIsAdding(true);
    try {
      const feed = await fetchFeed(newFeedUrl);
      if (feed) {
        await subscribeToFeedAuto(feed);
        await loadFeeds();
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

  const handleRemoveFeed = async (feedId: string) => {
    if (confirm("Are you sure you want to unsubscribe from this feed?")) {
      await unsubscribeFromFeedAuto(feedId);
      await loadFeeds();
      if (selectedFeed?.id === feedId) {
        setSelectedFeed(null);
      }
    }
  };

  const handleItemClick = async (feed: Feed, item: FeedItem) => {
    await markItemReadAuto(feed.id, item.id, true);
    await loadFeeds();
    setSelectedItem(item);
    setSelectedItemFeed(feed);
  };

  const handleToggleFavorite = async (feed: Feed, item: FeedItem) => {
    await toggleItemFavoriteAuto(feed.id, item.id);
    await loadFeeds();
  };

  const handleMarkAllRead = async (feedId: string) => {
    await markFeedReadAuto(feedId);
    await loadFeeds();
  };

  const handleExportOPML = async () => {
    const opml = await exportOpmlAuto();
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
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          const importedFeeds = await importOpmlAuto(content);
          if (importedFeeds.length > 0) {
            if (isTauri()) {
              await Promise.all(
                importedFeeds.map(async (feed) => {
                  try {
                    const updated = await fetchFeed(feed.feedUrl);
                    if (updated) {
                      await subscribeToFeedAuto(updated);
                      return;
                    }
                    await subscribeToFeedAuto(feed);
                  } catch (error) {
                    console.warn("Failed to fetch feed during OPML import:", feed.feedUrl, error);
                    await subscribeToFeedAuto(feed);
                  }
                })
              );
            } else {
              importedFeeds.forEach((feed) => subscribeToFeed(feed));
            }
          }
          await loadFeeds();
          alert(`Imported ${importedFeeds.length || "feeds"} successfully`);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const unreadCount = feeds.reduce((acc, feed) => acc + feed.unreadCount, 0);
  const groupedFeeds = useMemo(() => {
    const sections: Array<{ id: string; name: string; feeds: Feed[] }> = [];
    const assigned = new Set<string>();

    folders.forEach((folder) => {
      const folderFeeds = folder.feeds
        .map((feedId) => feeds.find((feed) => feed.id === feedId))
        .filter((feed): feed is Feed => Boolean(feed));
      if (folderFeeds.length > 0) {
        sections.push({ id: folder.id, name: folder.name, feeds: folderFeeds });
        folderFeeds.forEach((feed) => assigned.add(feed.id));
      }
    });

    const categoryMap = new Map<string, Feed[]>();
    feeds.forEach((feed) => {
      if (assigned.has(feed.id)) {
        return;
      }
      if (feed.category) {
        const list = categoryMap.get(feed.category) ?? [];
        list.push(feed);
        categoryMap.set(feed.category, list);
        assigned.add(feed.id);
      }
    });

    Array.from(categoryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, categoryFeeds]) => {
        sections.push({
          id: `category-${category}`,
          name: category,
          feeds: categoryFeeds,
        });
      });

    const ungrouped = feeds.filter((feed) => !assigned.has(feed.id));

    return { sections, ungrouped };
  }, [feeds, folders]);
  const itemsTitle =
    viewMode === "all" && selectedFeed
      ? selectedFeed.title
      : viewMode === "unread"
        ? "Unread"
        : viewMode === "favorites"
          ? "Favorites"
          : "Search";
  const itemsSubtitle =
    viewMode === "all" && selectedFeed
      ? `${selectedFeed.items.length} items`
      : `${items.length} items`;
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== "search") {
      setLastNonSearchViewMode(mode);
      setSearchQuery("");
    }
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      setViewMode("search");
    } else {
      setViewMode(lastNonSearchViewMode);
    }
  };

  const readingStyles = useMemo(() => {
    if (!preferences) return {};
    return {
      "--reading-font-family": preferences.font_family,
      "--reading-font-size": preferences.font_size ? `${preferences.font_size}px` : undefined,
      "--reading-line-height": preferences.line_height,
      "--reading-max-width": preferences.content_width ? `${preferences.content_width}ch` : undefined,
      "--reading-text-align": preferences.text_align,
    } as React.CSSProperties;
  }, [preferences]);

  return (
    <div className="h-full w-full bg-background">
      <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-[0_0_0_1px_rgba(15,23,42,0.04)]">
        {/* Sidebar */}
        <div className={`w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border/70 bg-card/60 flex-col min-h-0 ${isMobileFullScreen ? "hidden lg:flex" : "flex"}`}>
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border/70 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
                <Rss className="w-5 h-5 text-orange-500" />
                RSS
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                  title="Add feed"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowNewsletterDirectory(true)}
                  className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
                  title="Browse newsletter directory"
                >
                  <Newspaper className="w-4 h-4" />
                </button>
                <button
                  onClick={handleImportOPML}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                  title="Import OPML"
                >
                  <Import className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportOPML}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                  title="Export OPML"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCustomization(true)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                  title="Customize view"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* View mode tabs */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handleViewModeChange("all")}
                className={`px-2 py-1.5 text-xs rounded-md transition-colors ${viewMode === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70"
                  }`}
              >
                All
              </button>
              <button
                onClick={() => handleViewModeChange("unread")}
                className={`px-2 py-1.5 text-xs rounded-md transition-colors relative ${viewMode === "unread"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70"
                  }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1 px-1 bg-red-500 text-white text-[10px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleViewModeChange("favorites")}
                className={`px-2 py-1.5 text-xs rounded-md transition-colors ${viewMode === "favorites"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70"
                  }`}
              >
                Favorites
              </button>
            </div>
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
                {groupedFeeds.sections.map((section) => (
                  <div key={section.id} className="border-b border-border/70">
                    <div className="w-full px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-[0.18em]">
                      <Folder className="w-3.5 h-3.5" />
                      {section.name}
                    </div>
                    {section.feeds.map((feed) => (
                      <button
                        key={feed.id}
                        onClick={() => {
                          setSelectedFeed(feed);
                          handleViewModeChange("all");
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-muted/70 transition-colors flex items-start gap-2 ${selectedFeed?.id === feed.id ? "bg-muted/50" : ""
                          }`}
                      >
                        <div className="w-6 h-6 rounded bg-muted/80 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                          {feed.imageUrl || feed.icon ? (
                            <img
                              src={feed.imageUrl || feed.icon}
                              alt=""
                              className="w-6 h-6 object-cover"
                            />
                          ) : (
                            <Rss className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
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
                ))}

                {groupedFeeds.ungrouped.length > 0 && (
                  <div className="border-b border-border/70">
                    {groupedFeeds.ungrouped.map((feed) => (
                      <button
                        key={feed.id}
                        onClick={() => {
                          setSelectedFeed(feed);
                          handleViewModeChange("all");
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-muted/70 transition-colors flex items-start gap-2 ${selectedFeed?.id === feed.id ? "bg-muted/50" : ""
                          }`}
                      >
                        <div className="w-6 h-6 rounded bg-muted/80 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                          {feed.imageUrl || feed.icon ? (
                            <img
                              src={feed.imageUrl || feed.icon}
                              alt=""
                              className="w-6 h-6 object-cover"
                            />
                          ) : (
                            <Rss className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
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
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Items list */}
          <div className={`w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-border/70 flex-col min-h-0 ${isMobileFullScreen ? "hidden lg:flex" : "flex"}`}>
            <div className="px-5 pt-4 pb-3 border-b border-border/70 bg-gradient-to-b from-muted/20 via-muted/10 to-transparent">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">{itemsTitle}</h3>
                  <p className="text-xs text-muted-foreground">{itemsSubtitle}</p>
                </div>
                {selectedFeed && viewMode === "all" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRefreshFeed(selectedFeed)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg mobile-density-tap"
                      title="Refresh feed"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMarkAllRead(selectedFeed.id)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg mobile-density-tap"
                      title="Mark all as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveFeed(selectedFeed.id)}
                      className="p-2 text-destructive hover:bg-destructive/20 rounded-lg mobile-density-tap"
                      title="Unsubscribe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-9 pr-3 py-2 bg-background/80 border border-border/70 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground mobile-density-section">
                {viewMode === "unread" ? "No unread items" : "No articles"}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {items.map(({ feed, item }) => {
                  const imageUrl =
                    item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined;
                  return (
                    <article
                      key={`${feed.id}-${item.id}`}
                      onClick={() => handleItemClick(feed, item)}
                      className={`group px-4 py-3 border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors ${selectedItem?.id === item.id ? "bg-muted/50" : ""
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-2 h-2 w-2 rounded-full flex-shrink-0 ${item.read ? "bg-muted" : "bg-orange-500"
                          }`} />

                        {imageUrl && (
                          <div className="w-16 h-12 rounded-md overflow-hidden bg-muted/70 flex-shrink-0 border border-border/60">
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-semibold mb-1 ${item.read ? "text-muted-foreground" : "text-foreground"
                            }`}>
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {item.description.replace(/<[^>]+>/g, "")}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-medium truncate">{feed.title}</span>
                            <span>•</span>
                            <span>{formatFeedDate(item.pubDate)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(feed, item);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded transition-colors"
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
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded transition-colors"
                            title="Open original"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Article preview */}
          <div className="flex-1 flex flex-col min-h-0 bg-card/40">
            {selectedItem ? (
              <>
                <div className="px-6 py-4 border-b border-border/70 bg-gradient-to-r from-muted/20 via-muted/10 to-transparent flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                      {selectedItemFeed?.title ?? "Article"}
                    </p>
                    <h2 className="text-lg font-semibold text-foreground truncate">{selectedItem.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMobileFullScreen(!isMobileFullScreen)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg lg:hidden"
                      title={isMobileFullScreen ? "Show lists" : "Expand article"}
                    >
                      {isMobileFullScreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                    {selectedItemFeed && (
                      <button
                        onClick={() => handleToggleFavorite(selectedItemFeed, selectedItem)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg"
                        title={selectedItem.favorite ? "Remove favorite" : "Add to favorites"}
                      >
                        {selectedItem.favorite ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <a
                      href={selectedItem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg"
                      title="Open original"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="reading-surface" style={readingStyles}>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4 reading-meta">
                      <span>{formatFeedDate(selectedItem.pubDate)}</span>
                      {selectedItem.author && <span>by {selectedItem.author}</span>}
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-foreground dark:prose-invert reading-prose"
                      dangerouslySetInnerHTML={{ __html: selectedItem.content || selectedItem.description || "" }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Rss className="w-10 h-10 mb-3 opacity-60" />
                <p>Select a story to start reading</p>
              </div>
            )}
          </div>
        </div>
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

      {/* Customization Panel */}
      <RSSCustomizationPanel
        feedId={selectedFeed?.id}
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        onSave={handleSavePreferences}
      />
    </div>

    {/* Newsletter Directory Modal */}
    {showNewsletterDirectory && (
      <div className="fixed inset-0 z-50 bg-black/50">
        <div className="h-full w-full bg-background">
          <button
            onClick={() => setShowNewsletterDirectory(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-muted/80 hover:bg-muted text-foreground rounded-lg backdrop-blur-sm transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <NewsletterDirectory
            onSubscribe={(feed) => {
              // Refresh feeds after subscription
              loadFeeds();
            }}
            onClose={() => setShowNewsletterDirectory(false)}
          />
        </div>
      </div>
    )}
  </>
  );
}
