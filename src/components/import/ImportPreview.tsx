/**
 * Import preview components for command palette URL import
 */

import { Loader2, AlertCircle, Youtube, Rss, Globe } from "lucide-react";
import { URLType } from "../../hooks/useURLDetector";
import type { YouTubeVideo } from "../../api/youtube";
import type { Feed } from "../../api/rss";
import type { WebPageMetadata } from "../../hooks/useURLMetadata";

interface ImportPreviewProps {
  urlType: URLType;
  url: string;
  data: YouTubeVideo | Feed | WebPageMetadata | null;
  isLoading: boolean;
  error: string | null;
  onImport: () => void;
  isImporting: boolean;
}

export function ImportPreview({
  urlType,
  url,
  data,
  isLoading,
  error,
  onImport,
  isImporting,
}: ImportPreviewProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-6">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        <div className="text-sm text-muted-foreground">
          Fetching preview...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-6">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <div className="flex-1">
          <div className="text-sm font-medium text-destructive">
            Failed to fetch preview
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // No data yet
  if (!data) {
    return null;
  }

  // Render specific preview based on type
  switch (urlType) {
    case URLType.YouTube:
      return <YouTubeImportPreview data={data as YouTubeVideo} onImport={onImport} isImporting={isImporting} />;
    case URLType.RSSFeed:
      return <RSSImportPreview data={data as Feed} onImport={onImport} isImporting={isImporting} />;
    case URLType.WebPage:
      return <WebPageImportPreview data={data as WebPageMetadata} onImport={onImport} isImporting={isImporting} />;
    default:
      return null;
  }
}

interface YouTubeImportPreviewProps {
  data: YouTubeVideo;
  onImport: () => void;
  isImporting: boolean;
}

function YouTubeImportPreview({ data, onImport, isImporting }: YouTubeImportPreviewProps) {
  return (
    <div className="flex gap-4 px-4 py-3">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-32 h-20 rounded overflow-hidden bg-muted">
        <img
          src={data.thumbnail}
          alt={data.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase">
            YouTube Video
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {data.title}
        </h3>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{data.channel}</span>
          {data.duration > 0 && (
            <>
              <span>•</span>
              <span>{formatDuration(data.duration)}</span>
            </>
          )}
        </div>

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
            {data.description}
          </p>
        )}
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        disabled={isImporting}
        className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImporting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Importing...
          </span>
        ) : (
          "Import Video"
        )}
      </button>
    </div>
  );
}

interface RSSImportPreviewProps {
  data: Feed;
  onImport: () => void;
  isImporting: boolean;
}

function RSSImportPreview({ data, onImport, isImporting }: RSSImportPreviewProps) {
  return (
    <div className="flex gap-4 px-4 py-3">
      {/* Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded bg-orange-500/10 flex items-center justify-center">
        <Rss className="w-6 h-6 text-orange-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Rss className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase">
            RSS Feed
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground">
          {data.title}
        </h3>

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {data.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{data.items.length} items</span>
          {data.category && (
            <>
              <span>•</span>
              <span className="px-1.5 py-0.5 bg-muted rounded">{data.category}</span>
            </>
          )}
        </div>
      </div>

      {/* Subscribe button */}
      <button
        onClick={onImport}
        disabled={isImporting}
        className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImporting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Subscribing...
          </span>
        ) : (
          "Subscribe"
        )}
      </button>
    </div>
  );
}

interface WebPageImportPreviewProps {
  data: WebPageMetadata;
  onImport: () => void;
  isImporting: boolean;
}

function WebPageImportPreview({ data, onImport, isImporting }: WebPageImportPreviewProps) {
  return (
    <div className="flex gap-4 px-4 py-3">
      {/* Favicon */}
      <div className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
        {data.favicon ? (
          <img src={data.favicon} alt="" className="w-6 h-6" />
        ) : (
          <Globe className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase">
            Web Article
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {data.title}
        </h3>

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {data.description}
          </p>
        )}

        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <span className="truncate max-w-xs">{data.url}</span>
        </div>
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        disabled={isImporting}
        className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImporting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Importing...
          </span>
        ) : (
          "Import Article"
        )}
      </button>
    </div>
  );
}

/**
 * Format duration in seconds to readable format
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
