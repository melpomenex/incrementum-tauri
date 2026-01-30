import { useState, useEffect, useCallback } from "react";
import {
  ListVideo,
  Plus,
  RefreshCw,
  Trash2,
  Settings,
  Play,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
} from "lucide-react";
import {
  PlaylistSubscription,
  PlaylistVideo,
  PlaylistSettings,
  getPlaylistSubscriptions,
  getPlaylistSubscription,
  subscribeToPlaylist,
  deletePlaylistSubscription,
  refreshPlaylist,
  updatePlaylistSubscription,
  getPlaylistSettings,
  updatePlaylistSettings,
  importPlaylistVideo,
  isPlaylistUrl,
  formatDuration,
} from "../../api/youtubePlaylist";
import { getYouTubeThumbnail } from "../../api/youtube";
import { isTauri } from "../../lib/tauri";
import { useSettingsStore } from "../../stores/settingsStore";
import {
  isYouTubeApiEnabled,
  validateApiKey,
} from "../../lib/youtubeDataApi";

interface YouTubePlaylistManagerProps {
  onImportVideo?: (documentId: string) => void;
}

export function YouTubePlaylistManager({
  onImportVideo,
}: YouTubePlaylistManagerProps) {
  const isDesktop = isTauri();
  const { settings: appSettings, updateSettingsCategory } = useSettingsStore();
  const [subscriptions, setSubscriptions] = useState<PlaylistSubscription[]>(
    []
  );
  const [settings, setSettings] = useState<PlaylistSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [videos, setVideos] = useState<Record<string, PlaylistVideo[]>>({});
  const [importingId, setImportingId] = useState<string | null>(null);
  
  // Browser mode: API key configuration
  const [apiKeyInput, setApiKeyInput] = useState(appSettings?.youtube?.apiKey || "");
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationResult, setKeyValidationResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [subs, sett] = await Promise.all([
        getPlaylistSubscriptions(),
        getPlaylistSettings(),
      ]);
      setSubscriptions(subs);
      setSettings(sett);
      // Clear cached videos since we're reloading
      setVideos({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSubscription = async () => {
    if (!newUrl.trim() || !isPlaylistUrl(newUrl)) {
      setError("Please enter a valid YouTube playlist URL (e.g., https://www.youtube.com/playlist?list=...)");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await subscribeToPlaylist(newUrl);
      setNewUrl("");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Provide more helpful error messages
      if (message.includes("yt-dlp") || message.includes("playlist")) {
        setError(
          "Could not access playlist:\n\n" + 
          message + 
          "\n\nTips:\n" +
          "• Make sure the playlist URL is correct\n" +
          "• For unlisted playlists: open the playlist in your browser first\n" +
          "• For private playlists: they cannot be imported\n" +
          "• Try updating yt-dlp: yt-dlp -U\n" +
          "• Check the terminal/console for detailed error logs"
        );
      } else {
        setError(message);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      await deletePlaylistSubscription(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    setError(null);

    try {
      const result = await refreshPlaylist(id, true);
      if (result.new_videos_found > 0) {
        // Reload to show new videos
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshingId(null);
    }
  };

  const handleToggleActive = async (sub: PlaylistSubscription) => {
    try {
      await updatePlaylistSubscription(sub.id, {
        is_active: !sub.is_active,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImportVideo = async (playlistVideoId: string) => {
    setImportingId(playlistVideoId);
    try {
      const doc = await importPlaylistVideo(playlistVideoId);
      onImportVideo?.(doc.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportingId(null);
    }
  };

  const handleUpdateSettings = async (updates: Partial<PlaylistSettings>) => {
    try {
      await updatePlaylistSettings(updates);
      const newSettings = await getPlaylistSettings();
      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    
    // Fetch videos if not already loaded
    if (!videos[id]) {
      try {
        const detail = await getPlaylistSubscription(id);
        setVideos((prev) => ({ ...prev, [id]: detail.videos }));
      } catch (err) {
        console.error("Failed to fetch playlist videos:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Browser/PWA mode with YouTube Data API support
  if (!isDesktop) {
    const handleSaveApiKey = async () => {
      if (!apiKeyInput.trim()) {
        updateSettingsCategory("youtube", { apiKey: undefined, enabled: false });
        setKeyValidationResult({ success: true, message: "API key cleared" });
        return;
      }
      
      setIsValidatingKey(true);
      setKeyValidationResult(null);
      
      const isValid = await validateApiKey(apiKeyInput.trim());
      
      if (isValid) {
        updateSettingsCategory("youtube", { apiKey: apiKeyInput.trim(), enabled: true });
        setKeyValidationResult({ success: true, message: "API key validated and saved!" });
      } else {
        setKeyValidationResult({ success: false, message: "Invalid API key. Please check your key and try again." });
      }
      
      setIsValidatingKey(false);
    };
    
    const hasApiKey = isYouTubeApiEnabled() || !!appSettings?.youtube?.apiKey;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">YouTube Playlist Import</h2>
        </div>

        {/* API Key Configuration */}
        <div className="p-4 bg-card border border-border rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">YouTube Data API Configuration</h3>
            {hasApiKey && (
              <span className="ml-auto px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full">
                Configured
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            To import YouTube playlists in the web app, you need a YouTube Data API key. 
            Your API key is stored locally in your browser.
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your YouTube Data API key..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={isValidatingKey}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isValidatingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
            
            {keyValidationResult && (
              <p className={`text-sm ${keyValidationResult.success ? "text-green-500" : "text-destructive"}`}>
                {keyValidationResult.message}
              </p>
            )}
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How to get an API key:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the <strong>YouTube Data API v3</strong></li>
              <li>Create credentials (API Key)</li>
              <li>Copy and paste the key here</li>
            </ol>
          </div>
        </div>

        {/* Playlist Import Section */}
        {hasApiKey ? (
          <div className="p-4 bg-card border border-border rounded-lg space-y-4">
            <h3 className="font-medium">Import Playlist</h3>
            
            <div className="flex gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Paste YouTube playlist URL..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubscription()}
              />
              <button
                onClick={handleAddSubscription}
                disabled={isAdding || !newUrl.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Import
              </button>
            </div>
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 whitespace-pre-line">{error}</div>
              </div>
            )}
            
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> In the web app, playlist import is a one-time operation. 
                Videos will be imported as individual documents. For auto-import and queue interspersion features, 
                use the <a href="https://github.com/melpomenex/incrementum-tauri/releases" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">desktop app</a>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100">API Key Required</h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Please configure your YouTube Data API key above to import playlists.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">YouTube Playlist Auto-Import</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Global Settings */}
      {showSettings && settings && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-medium">Global Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  handleUpdateSettings({ enabled: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">Enable playlist auto-import</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.prefer_new_videos}
                onChange={(e) =>
                  handleUpdateSettings({ prefer_new_videos: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">Prefer newer videos in queue</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Default Queue Interval
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.default_intersperse_interval}
                onChange={(e) =>
                  handleUpdateSettings({
                    default_intersperse_interval: parseInt(e.target.value) || 5,
                  })
                }
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Insert a video every N queue items
              </p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Default Priority
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.default_priority}
                onChange={(e) =>
                  handleUpdateSettings({
                    default_priority: parseInt(e.target.value) || 5,
                  })
                }
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Max Consecutive
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.max_consecutive_playlist_videos}
                onChange={(e) =>
                  handleUpdateSettings({
                    max_consecutive_playlist_videos:
                      parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max consecutive playlist videos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add New */}
      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste YouTube playlist URL..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => e.key === "Enter" && handleAddSubscription()}
        />
        <button
          onClick={handleAddSubscription}
          disabled={isAdding || !newUrl.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add Playlist
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 whitespace-pre-line">{error}</div>
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:underline flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <ListVideo className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-medium text-muted-foreground mb-1">
            No playlists subscribed
          </h3>
          <p className="text-sm text-muted-foreground/70">
            Add a YouTube playlist URL above to start auto-importing videos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={`border border-border rounded-lg overflow-hidden ${
                !sub.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Subscription Header */}
              <div className="p-4 flex items-center gap-4">
                <button
                  onClick={() => toggleExpand(sub.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expandedId === sub.id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                {sub.thumbnail_url ? (
                  <img
                    src={sub.thumbnail_url}
                    alt=""
                    className="w-16 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                    <ListVideo className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {sub.title || "Untitled Playlist"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {sub.channel_name && <span>by {sub.channel_name} • </span>}
                    <span>{sub.total_videos || 0} videos</span>
                    {sub.last_refreshed_at && (
                      <span>
                        {" "}
                        • Refreshed{" "}
                        {new Date(sub.last_refreshed_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(sub)}
                    className={`p-2 rounded-lg transition-colors ${
                      sub.is_active
                        ? "text-green-500 hover:bg-green-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={sub.is_active ? "Active" : "Paused"}
                  >
                    {sub.is_active ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleRefresh(sub.id)}
                    disabled={refreshingId === sub.id}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Refresh playlist"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        refreshingId === sub.id ? "animate-spin" : ""
                      }`}
                    />
                  </button>

                  <a
                    href={sub.playlist_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedId === sub.id && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">
                        Queue Interval
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={sub.queue_intersperse_interval}
                        onChange={(e) =>
                          updatePlaylistSubscription(sub.id, {
                            queue_intersperse_interval:
                              parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Insert a video every N items
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={sub.priority_rating}
                        onChange={(e) =>
                          updatePlaylistSubscription(sub.id, {
                            priority_rating: parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">
                        Refresh Interval (hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={sub.refresh_interval_hours}
                        onChange={(e) =>
                          updatePlaylistSubscription(sub.id, {
                            refresh_interval_hours:
                              parseInt(e.target.value) || 24,
                          })
                        }
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sub.auto_import_new}
                        onChange={(e) =>
                          updatePlaylistSubscription(sub.id, {
                            auto_import_new: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm">Auto-import new videos</span>
                    </label>
                  </div>

                  {/* Videos List */}
                  <div className="mt-6 border-t border-border pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ListVideo className="w-4 h-4" />
                      Videos ({videos[sub.id]?.length || 0})
                    </h4>
                    {videos[sub.id] === undefined ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : videos[sub.id]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No videos found in this playlist.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {videos[sub.id]?.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center gap-3 p-2 bg-background rounded-lg border border-border"
                          >
                            <img
                              src={getYouTubeThumbnail(video.video_id)}
                              alt=""
                              className="w-20 h-14 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {video.video_title || "Untitled Video"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {video.video_duration
                                  ? formatDuration(video.video_duration)
                                  : "Unknown duration"}
                                {video.is_imported && (
                                  <span className="ml-2 text-green-600">
                                    • Imported
                                  </span>
                                )}
                              </p>
                            </div>
                            {!video.is_imported && (
                              <button
                                onClick={() => handleImportVideo(video.id)}
                                disabled={importingId === video.id}
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                              >
                                {importingId === video.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                Import
                              </button>
                            )}
                            {video.is_imported && video.document_id && (
                              <button
                                onClick={() => onImportVideo?.(video.document_id!)}
                                className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
