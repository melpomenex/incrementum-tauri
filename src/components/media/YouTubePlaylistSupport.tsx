import { useState, useEffect } from "react";
import {
  List,
  Youtube,
  Download,
  Loader2,
  Check,
  AlertCircle,
  Play,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { extractPlaylistID, extractChannelID, getYouTubeThumbnail } from "../../api/youtube";

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
}

interface YouTubePlaylistSupportProps {
  url: string;
  onImport?: (videoIds: string[]) => void;
}

export function YouTubePlaylistSupport({ url, onImport }: YouTubePlaylistSupportProps) {
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "complete">("idle");

  // Detect playlist or channel from URL
  useEffect(() => {
    const pid = extractPlaylistID(url);
    const cid = extractChannelID(url);

    setPlaylistId(pid);
    setChannelId(cid);

    if (pid || cid) {
      fetchContent();
    }
  }, [url]);

  const fetchContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (playlistId) {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const info = await invoke<any>("get_youtube_playlist_info", { url: playlistUrl });

        setTitle(info.title || "Unknown Playlist");
        setChannel(info.channel || "");
        setVideos(info.entries || []);
      } else if (channelId) {
        // For channels, we'd need to get videos
        // This is a placeholder for channel support
        const channelUrl = `https://www.youtube.com/channel/${channelId}`;
        const info = await invoke<any>("get_youtube_playlist_info", { url: channelUrl });

        setTitle(info.title || "Unknown Channel");
        setVideos(info.entries || []);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideoExpand = (videoId: string) => {
    setExpandedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVideos(new Set(videos.map((v) => v.id)));
  };

  const deselectAll = () => {
    setSelectedVideos(new Set());
  };

  const handleImport = async () => {
    if (selectedVideos.size === 0) return;

    setImportStatus("importing");

    try {
      // In production, this would download all selected videos
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onImport?.(Array.from(selectedVideos));
      setImportStatus("complete");
    } catch {
      setImportStatus("idle");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!playlistId && !channelId) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          {playlistId ? (
            <List className="w-5 h-5 text-primary" />
          ) : (
            <Youtube className="w-5 h-5 text-red-500" />
          )}
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>

        {channel && (
          <p className="text-sm text-muted-foreground">by {channel}</p>
        )}

        <div className="mt-2 text-sm text-muted-foreground">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </div>

        {/* Selection controls */}
        {videos.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:opacity-90"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-muted text-muted-foreground rounded hover:opacity-90"
            >
              Deselect All
            </button>
            <span className="text-sm text-muted-foreground ml-auto">
              {selectedVideos.size} selected
            </span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading videos...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Video List */}
      {!isLoading && videos.length > 0 && (
        <div className="max-h-[400px] overflow-y-auto">
          <div className="divide-y divide-border">
            {videos.map((video) => (
              <div
                key={video.id}
                className="p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Select checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedVideos.has(video.id)}
                    onChange={() => toggleVideoSelection(video.id)}
                    className="mt-1 rounded"
                  />

                  {/* Thumbnail */}
                  <img
                    src={video.thumbnail || getYouTubeThumbnail(video.id)}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.channel}
                    </p>
                    {video.duration > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleVideoExpand(video.id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Expand details"
                    >
                      {expandedVideos.has(video.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Open on YouTube"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedVideos.has(video.id) && (
                  <div className="mt-3 pt-3 border-t border-border text-sm">
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <div>
                        <span className="font-medium">Video ID:</span> {video.id}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer with import button */}
      {selectedVideos.size > 0 && (
        <div className="p-4 border-t border-border">
          <button
            onClick={handleImport}
            disabled={importStatus === "importing" || importStatus === "complete"}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {importStatus === "importing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing {selectedVideos.size} video{selectedVideos.size !== 1 ? "s" : ""}...
              </>
            ) : importStatus === "complete" ? (
              <>
                <Check className="w-4 h-4" />
                Import Complete!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Import {selectedVideos.size} video{selectedVideos.size !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
