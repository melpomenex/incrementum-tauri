import { useState, useEffect } from "react";
import {
  Rss,
  Play,
  Plus,
  Search,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  RefreshCw,
  Globe,
  Filter,
  Loader2,
} from "lucide-react";
import {
  PodcastFeed,
  PodcastEpisode,
  getSubscribedPodcasts,
  subscribeToPodcast,
  unsubscribeFromPodcast,
  parsePodcastFeed,
  markEpisodePlayed,
  updateEpisodeProgress,
  searchEpisodes,
  getUnplayedEpisodes,
  formatDuration,
  isValidPodcastUrl,
  discoverPodcasts,
} from "../../api/podcast";

interface PodcastManagerProps {
  onPlayEpisode?: (feed: PodcastFeed, episode: PodcastEpisode) => void;
}

export function PodcastManager({ onPlayEpisode }: PodcastManagerProps) {
  const [subscriptions, setSubscriptions] = useState<PodcastFeed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<PodcastFeed | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "unplayed" | "inprogress">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<PodcastFeed[]>([]);

  // Load subscriptions
  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = () => {
    setSubscriptions(getSubscribedPodcasts());
  };

  // Add new subscription
  const handleAddSubscription = async () => {
    if (!isValidPodcastUrl(newFeedUrl)) {
      alert("Please enter a valid podcast feed URL");
      return;
    }

    setIsAdding(true);
    try {
      const feed = await parsePodcastFeed(newFeedUrl);
      if (feed) {
        subscribeToPodcast(feed);
        loadSubscriptions();
        setSelectedFeed(feed);
        setShowAddDialog(false);
        setNewFeedUrl("");
      } else {
        alert("Failed to parse podcast feed. Please check the URL.");
      }
    } catch (error) {
      alert("Error adding podcast: " + (error as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  // Remove subscription
  const handleRemoveSubscription = (feedId: string) => {
    if (confirm("Are you sure you want to unsubscribe from this podcast?")) {
      unsubscribeFromPodcast(feedId);
      loadSubscriptions();
      if (selectedFeed?.id === feedId) {
        setSelectedFeed(null);
      }
    }
  };

  // Play episode
  const handlePlayEpisode = (feed: PodcastFeed, episode: PodcastEpisode) => {
    onPlayEpisode?.(feed, episode);
  };

  // Mark as played/unplayed
  const handleTogglePlayed = (feedId: string, episode: PodcastEpisode) => {
    markEpisodePlayed(feedId, episode.id, !episode.played);
    loadSubscriptions();
  };

  // Refresh feed
  const handleRefreshFeed = async (feed: PodcastFeed) => {
    setIsRefreshing(true);
    try {
      const updated = await parsePodcastFeed(feed.feedUrl);
      if (updated) {
        subscribeToPodcast(updated);
        loadSubscriptions();
        if (selectedFeed?.id === updated.id) {
          setSelectedFeed(updated);
        }
      }
    } catch (error) {
      alert("Failed to refresh feed: " + (error as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Discover podcasts
  const handleDiscover = async () => {
    setShowDiscover(true);
    const results = await discoverPodcasts();
    setDiscoverResults(results);
  };

  // Filter episodes
  const getFilteredEpisodes = (episodes: PodcastEpisode[]): PodcastEpisode[] => {
    switch (filter) {
      case "unplayed":
        return episodes.filter((ep) => !ep.played);
      case "inprogress":
        return episodes.filter((ep) => ep.position !== undefined && ep.position > 0 && !ep.played);
      default:
        return episodes;
    }
  };

  // Get all unplayed count
  const unplayedCount = subscriptions.reduce(
    (acc, feed) => acc + feed.episodes.filter((ep) => !ep.played).length,
    0
  );

  return (
    <div className="h-full flex">
      {/* Sidebar - Podcast List */}
      <div className="w-80 border-r border-border bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rss className="w-5 h-5 text-primary" />
              Podcasts
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setShowAddDialog(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Add podcast"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleDiscover}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Discover podcasts"
              >
                <Globe className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search podcasts..."
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Podcast List */}
        <div className="overflow-y-auto h-[calc(100%-140px)]">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Rss className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No podcasts yet</p>
              <button
                onClick={() => setShowAddDialog(true)}
                className="text-primary hover:underline"
              >
                Add your first podcast
              </button>
            </div>
          ) : (
            <div>
              {subscriptions
                .filter((feed) =>
                  feed.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((feed) => {
                  const unplayed = feed.episodes.filter((ep) => !ep.played).length;

                  return (
                    <button
                      key={feed.id}
                      onClick={() => setSelectedFeed(feed)}
                      className={`w-full p-3 text-left hover:bg-muted transition-colors border-b border-border ${
                        selectedFeed?.id === feed.id ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Cover art */}
                        {feed.imageUrl ? (
                          <img
                            src={feed.imageUrl}
                            alt={feed.title}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Rss className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {feed.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {feed.author}
                          </p>
                          {unplayed > 0 && (
                            <div className="mt-1 text-xs text-primary">
                              {unplayed} unplayed
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-80 p-4 bg-card border-t border-border">
          <div className="text-sm text-muted-foreground">
            {unplayedCount} unplayed episode{unplayedCount !== 1 ? "s" : ""} across{" "}
            {subscriptions.length} podcast{subscriptions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Main Content - Episodes */}
      <div className="flex-1 flex flex-col">
        {selectedFeed ? (
          <>
            {/* Feed Header */}
            <div className="p-6 border-b border-border bg-card">
              <div className="flex items-start gap-4">
                {selectedFeed.imageUrl && (
                  <img
                    src={selectedFeed.imageUrl}
                    alt={selectedFeed.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {selectedFeed.title}
                  </h2>
                  {selectedFeed.author && (
                    <p className="text-muted-foreground mb-2">{selectedFeed.author}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {selectedFeed.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefreshFeed(selectedFeed)}
                      disabled={isRefreshing}
                      className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefreshing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Refresh
                    </button>
                    <button
                      onClick={() => handleRemoveSubscription(selectedFeed.id)}
                      className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Unsubscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Filter */}
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Episodes</option>
                  <option value="unplayed">Unplayed</option>
                  <option value="inprogress">In Progress</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  {getFilteredEpisodes(selectedFeed.episodes).length} episodes
                </span>
              </div>

              {/* Episodes */}
              <div className="space-y-2">
                {getFilteredEpisodes(selectedFeed.episodes).map((episode) => (
                  <div
                    key={episode.id}
                    className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Play button */}
                      <button
                        onClick={() => handlePlayEpisode(selectedFeed, episode)}
                        className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
                      >
                        <Play className="w-5 h-5" fill="currentColor" />
                      </button>

                      {/* Episode info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground mb-1">
                          {episode.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {episode.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(episode.duration || 0)}
                          </span>
                          <span>
                            {new Date(episode.pubDate).toLocaleDateString()}
                          </span>
                          {episode.position !== undefined && episode.position > 0 && !episode.played && (
                            <span className="text-primary">
                              {Math.round((episode.position / (episode.duration || 1)) * 100)}% played
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleTogglePlayed(selectedFeed.id, episode)}
                        className={`p-2 rounded transition-colors ${
                          episode.played
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={episode.played ? "Mark as unplayed" : "Mark as played"}
                      >
                        {episode.played ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Rss className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Select a podcast to view episodes</p>
              <p className="text-sm">
                {subscriptions.length > 0
                  ? "Choose from your subscriptions on the left"
                  : "Add your first podcast to get started"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Podcast Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-4">Add Podcast</h2>
            <input
              type="url"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com/podcast/feed.xml"
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
                onClick={handleAddSubscription}
                disabled={isAdding || !newFeedUrl}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discover Dialog */}
      {showDiscover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Discover Podcasts</h2>
              <button
                onClick={() => setShowDiscover(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {discoverResults.map((feed) => (
                <div
                  key={feed.id}
                  className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {feed.imageUrl && (
                    <img
                      src={feed.imageUrl}
                      alt={feed.title}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <h3 className="font-medium text-foreground text-sm mb-1">{feed.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{feed.description}</p>
                  <button
                    onClick={() => {
                      subscribeToPodcast(feed);
                      loadSubscriptions();
                      setShowDiscover(false);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
                  >
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
