import { useState, useEffect } from "react";
import {
  Youtube,
  Download,
  Loader2,
  Check,
  AlertCircle,
  Search,
  List,
  Play,
  Clock,
  Eye,
  ExternalLink,
  FileText,
  Settings,
  X,
} from "lucide-react";
import {
  extractYouTubeID,
  extractPlaylistID,
  extractChannelID,
  isYouTubeURL,
  getYouTubeURLType,
  getYouTubeThumbnail,
  getYouTubeWatchURL,
} from "../../api/youtube";
import { invoke } from "@tauri-apps/api/core";

interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  channel: string;
  channel_id?: string;
  duration: number;
  view_count: number;
  upload_date: string;
  thumbnail: string;
  tags: string[];
  category: string;
}

interface YouTubeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (videoId: string, info: YouTubeVideoInfo) => void;
}

type ImportType = "video" | "playlist" | "channel";
type DownloadQuality = "best" | "1080p" | "720p" | "480p" | "audio";
type DownloadStatus = "idle" | "checking" | "fetching" | "ready" | "downloading" | "complete" | "error";

export function YouTubeImportDialog({
  isOpen,
  onClose,
  onImport,
}: YouTubeImportDialogProps) {
  const [url, setUrl] = useState("");
  const [importType, setImportType] = useState<ImportType>("video");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [ytdlpAvailable, setYtdlpAvailable] = useState<boolean | null>(null);
  const [quality, setQuality] = useState<DownloadQuality>("best");
  const [downloadSubtitles, setDownloadSubtitles] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Check yt-dlp availability on mount
  useEffect(() => {
    if (isOpen) {
      checkYTDLP();
    }
  }, [isOpen]);

  const checkYTDLP = async () => {
    try {
      const available = await invoke<boolean>("check_ytdlp");
      setYtdlpAvailable(available);
      if (!available) {
        setError("yt-dlp is not installed. Please install it to download YouTube videos.");
      }
    } catch {
      setYtdlpAvailable(false);
      setError("Failed to check yt-dlp availability");
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    setVideoInfo(null);
    setStatus("idle");

    // Detect import type
    if (value && isYouTubeURL(value)) {
      const type = getYouTubeURLType(value);
      if (type === "playlist") setImportType("playlist");
      else if (type === "channel") setImportType("channel");
      else setImportType("video");
    }
  };

  const handleFetchInfo = async () => {
    if (!url || !isYouTubeURL(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setStatus("fetching");
    setError(null);

    try {
      const info = await invoke<YouTubeVideoInfo>("get_youtube_video_info", { url });
      setVideoInfo(info);
      setStatus("ready");
    } catch (err) {
      setError(err as string);
      setStatus("error");
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    setStatus("downloading");
    setError(null);

    try {
      // In production, this would trigger actual download
      // For now, simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setDownloadProgress(i);
      }

      setStatus("complete");
      onImport?.(videoInfo.id, videoInfo);
    } catch (err) {
      setError(err as string);
      setStatus("error");
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

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-foreground">Import from YouTube</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* yt-dlp Status */}
          {ytdlpAvailable === false && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                yt-dlp is not installed.{" "}
                <a
                  href="https://github.com/yt-dlp/yt-dlp#installation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Install yt-dlp
                </a>{" "}
                to download YouTube videos.
              </span>
            </div>
          )}

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              YouTube URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={status === "fetching" || status === "downloading"}
              />
              {url && isYouTubeURL(url) && (
                <button
                  onClick={handleFetchInfo}
                  disabled={status === "fetching" || status === "downloading" || ytdlpAvailable === false}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {status === "fetching" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Fetch Info
                </button>
              )}
            </div>

            {/* Import type indicator */}
            {url && isYouTubeURL(url) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                {importType === "video" && <Play className="w-3 h-3" />}
                {importType === "playlist" && <List className="w-3 h-3" />}
                {importType === "channel" && <Youtube className="w-3 h-3" />}
                Detected: {importType}
              </div>
            )}
          </div>

          {/* Video Info */}
          {videoInfo && (
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-40 h-28 object-cover rounded-lg"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                    {videoInfo.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">{videoInfo.channel}</p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(videoInfo.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(videoInfo.view_count)} views
                    </span>
                    <span>{new Date(videoInfo.upload_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <a
                    href={getYouTubeWatchURL(videoInfo.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Description */}
              {videoInfo.description && (
                <div className="text-sm text-muted-foreground line-clamp-3">
                  {videoInfo.description}
                </div>
              )}

              {/* Tags */}
              {videoInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {videoInfo.tags.slice(0, 5).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {videoInfo.tags.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{videoInfo.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Download Settings */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
                >
                  <Settings className="w-4 h-4" />
                  Download Settings
                </button>

                {showSettings && (
                  <div className="space-y-3 p-3 bg-background rounded-lg">
                    {/* Quality */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Quality
                      </label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as DownloadQuality)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="best">Best Available</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                        <option value="audio">Audio Only</option>
                      </select>
                    </div>

                    {/* Subtitles */}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={downloadSubtitles}
                        onChange={(e) => setDownloadSubtitles(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-foreground">Download subtitles (if available)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Download Button */}
              {status === "ready" && (
                <button
                  onClick={handleDownload}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Import Video
                </button>
              )}

              {/* Download Progress */}
              {status === "downloading" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Downloading...</span>
                    <span className="text-foreground">{downloadProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Complete */}
              {status === "complete" && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-500">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Video imported successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Help Text */}
          {!videoInfo && (
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <p className="mb-2">Supported URL formats:</p>
              <ul className="space-y-1 text-xs">
                <li>• Videos: youtube.com/watch?v=ID or youtu.be/ID</li>
                <li>• Playlists: youtube.com/playlist?list=ID</li>
                <li>• Channels: youtube.com/@username or youtube.com/channel/ID</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            disabled={status === "downloading"}
            className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            {status === "complete" ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
