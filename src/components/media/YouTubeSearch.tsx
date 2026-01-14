import { useState } from "react";
import {
  Search,
  Youtube,
  Clock,
  Eye,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { getYouTubeThumbnail, getYouTubeWatchURL, formatDuration, formatViewCount } from "../../api/youtube";

interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  channel_id?: string;
  duration: number;
  view_count: number;
  thumbnail: string;
  upload_date: string;
}

interface YouTubeSearchProps {
  onImport?: (videoId: string, info: YouTubeSearchResult) => void;
}

export function YouTubeSearch({ onImport }: YouTubeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await invoke<any[]>("search_youtube_videos", {
        query,
        apiKey: null, // Can be enhanced with API key support
      });

      // Transform results to our format
      const formattedResults: YouTubeSearchResult[] = searchResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        channel: item.channel,
        channel_id: item.channel_id,
        duration: item.duration || 0,
        view_count: item.view_count || 0,
        thumbnail: item.thumbnail || getYouTubeThumbnail(item.id),
        upload_date: item.upload_date || "",
      }));

      setResults(formattedResults);
    } catch (err) {
      setError(err as string);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-foreground">YouTube Search</h2>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search YouTube videos..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-h-[500px] overflow-y-auto">
        {results.length === 0 && !isSearching && !error && (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Enter a search query to find YouTube videos</p>
            <p className="text-xs mt-1">
              Note: YouTube search requires yt-dlp or YouTube API key
            </p>
          </div>
        )}

        <div className="divide-y divide-border">
          {results.map((result) => (
            <div
              key={result.id}
              className="p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-40 h-24 object-cover rounded"
                  />
                  {result.duration > 0 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
                      {formatDuration(result.duration)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1">
                    {result.channel}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(result.view_count)}
                    </span>
                    <span>•</span>
                    <span>{new Date(result.upload_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <a
                    href={getYouTubeWatchURL(result.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => onImport?.(result.id, result)}
                    className="p-1.5 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                    title="Import video"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to format duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Helper function to format view count
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}
