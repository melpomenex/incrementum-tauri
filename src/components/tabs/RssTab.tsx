import { useState } from "react";

interface RssFeed {
  id: string;
  title: string;
  url: string;
  description?: string;
}

interface RssItem {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

export function RssTab() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [items, setItems] = useState<RssItem[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;

    try {
      // For now, we'll add the feed with basic info
      // In a full implementation, you'd fetch and parse the RSS feed
      const newFeed: RssFeed = {
        id: Date.now().toString(),
        title: newFeedUrl,
        url: newFeedUrl,
      };

      setFeeds([...feeds, newFeed]);
      setNewFeedUrl("");

      // TODO: Implement actual RSS fetching and parsing
      // You might use a library like 'rss-parser' or implement XML parsing
      console.log("Added RSS feed:", newFeedUrl);
    } catch (error) {
      console.error("Error adding RSS feed:", error);
    }
  };

  const handleRemoveFeed = (feedId: string) => {
    setFeeds(feeds.filter((f) => f.id !== feedId));
    if (selectedFeed === feedId) {
      setSelectedFeed(null);
      setItems([]);
    }
  };

  const handleSelectFeed = (feed: RssFeed) => {
    setSelectedFeed(feed.id);
    // TODO: Fetch and parse RSS items
    setItems([]);
    console.log("Selected feed:", feed.title);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">RSS Feeds</h2>

        <div className="flex gap-2">
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="Enter RSS feed URL..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            onKeyPress={(e) => e.key === "Enter" && handleAddFeed()}
          />
          <button
            onClick={handleAddFeed}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Feed
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Feed List */}
        <div className="w-80 border-r border-border overflow-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Your Feeds ({feeds.length})
            </h3>
            {feeds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feeds yet. Add your first RSS feed above.
              </p>
            ) : (
              <div className="space-y-2">
                {feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFeed === feed.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-card border border-border hover:bg-muted"
                    }`}
                    onClick={() => handleSelectFeed(feed)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {feed.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {feed.url}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFeed(feed.id);
                        }}
                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feed Items */}
        <div className="flex-1 overflow-auto">
          {selectedFeed ? (
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Feed Items
              </h3>
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    RSS feed parsing is not yet fully implemented.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This feature will allow you to subscribe to RSS feeds and
                    import articles into your reading queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-card border border-border rounded-lg"
                    >
                      <h4 className="font-medium text-foreground mb-1">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                      )}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Read more
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">
                Select a feed to view its items
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
