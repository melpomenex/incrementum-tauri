/**
 * YouTube API integration
 * Note: This uses no-auth methods for metadata extraction
 * For full YouTube API features, API key would be required
 */

/**
 * YouTube video metadata
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  duration: number; // in seconds
  viewCount: number;
  uploadDate: string;
  thumbnail: string;
  thumbnailHigh?: string;
  publishDate: string;
  tags: string[];
  category: string;
  liveContent: boolean;
}

/**
 * YouTube playlist info
 */
export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  videoCount: number;
  thumbnail: string;
  videos: YouTubeVideo[];
}

/**
 * YouTube channel info
 */
export interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  thumbnail: string;
  banner?: string;
}

/**
 * YouTube search result
 */
export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  duration?: number;
  thumbnail: string;
  type: "video" | "playlist" | "channel";
}

/**
 * YouTube transcript segment
 */
export interface YouTubeTranscriptSegment {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractYouTubeID(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract timestamp from YouTube URL (e.g., ?t=933 or ?t=15m30s)
 * Returns timestamp in seconds, or null if not present
 */
export function extractYouTubeTimestamp(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const tParam = urlObj.searchParams.get('t');
    if (!tParam) return null;

    // Parse time in various formats:
    // - Pure seconds: 933
    // - HH:MM:SS or MM:SS: 1:23:45 or 15:30
    // - YouTube format: 15m30s

    // Check for YouTube format (e.g., 15m30s, 1h23m45s)
    const ytMatch = tParam.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
    if (ytMatch) {
      const hours = parseInt(ytMatch[1] || '0');
      const minutes = parseInt(ytMatch[2] || '0');
      const seconds = parseInt(ytMatch[3] || '0');
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Check for HH:MM:SS or MM:SS format
    if (tParam.includes(':')) {
      const parts = tParam.split(':');
      if (parts.length === 3) {
        // HH:MM:SS
        const [h, m, s] = parts.map(Number);
        return h * 3600 + m * 60 + s;
      } else if (parts.length === 2) {
        // MM:SS
        const [m, s] = parts.map(Number);
        return m * 60 + s;
      }
    }

    // Pure seconds
    const seconds = parseInt(tParam);
    if (!isNaN(seconds)) {
      return seconds;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistID(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extract channel ID from YouTube URL
 */
export function extractChannelID(url: string): string | null {
  // Handle /c/, /channel/, /@username formats
  const channelMatch = url.match(/\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) return channelMatch[1];

  const customMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
  if (customMatch) return customMatch[1];

  const handleMatch = url.match(/\/@([a-zA-Z0-9_-]+)/);
  if (handleMatch) return handleMatch[1];

  return null;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: "default" | "medium" | "high" | "max" = "high"): string {
  const qualities = {
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
  return qualities[quality];
}

/**
 * Fetch YouTube video metadata
 * Uses no-oembed YouTube endpoint (no API key required)
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<YouTubeVideo | null> {
  try {
    // Get embed page which has metadata in og tags
    const response = await fetch(`https://www.youtube.com/embed/${videoId}?hl=en`);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract metadata from og tags and yt initial data
    const title = extractMetaTag(html, "og:title") || "";
    const description = extractMetaTag(html, "og:description") || "";
    const thumbnail = extractMetaTag(html, "og:image") || getYouTubeThumbnail(videoId);
    const channel = extractMetaTag(html, "og:site_name") || "";

    // Try to get more data from noembed
    try {
      const noembedResponse = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (noembedResponse.ok) {
        const data = await noembedResponse.json();
        return {
          id: videoId,
          title: data.title || title,
          description: data.html || description,
          channel: data.author_name || channel,
          channelId: "",
          duration: 0, // noembed doesn't provide duration
          viewCount: 0,
          uploadDate: "",
          thumbnail: data.thumbnail_url || thumbnail,
          publishDate: "",
          tags: [],
          category: "",
          liveContent: false,
        };
      }
    } catch {
      // Fallback to basic data
    }

    return {
      id: videoId,
      title,
      description,
      channel,
      channelId: "",
      duration: 0,
      viewCount: 0,
      uploadDate: "",
      thumbnail,
      publishDate: "",
      tags: [],
      category: "",
      liveContent: false,
    };
  } catch (error) {
    console.error("Failed to fetch YouTube video info:", error);
    return null;
  }
}

/**
 * Extract meta tag from HTML
 */
function extractMetaTag(html: string, property: string): string | null {
  // Try both property and name attributes
  const patterns = [
    new RegExp(`<meta property="${property}" content="([^"]+)"`, "i"),
    new RegExp(`<meta name="${property}" content="([^"]+)"`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Fetch YouTube transcript
 * Note: This requires backend processing or yt-dlp
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptSegment[]> {
  // In a browser-only environment, we need to use a backend service
  // For now, return empty array with note about limitation

  console.warn(
    "YouTube transcript fetching requires backend processing (yt-dlp). " +
    "This will be available in the Tauri backend."
  );

  return [];
}

/**
 * Search YouTube
 * Note: Full YouTube search requires API key
 * This is a placeholder for future implementation
 */
export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  console.warn(
    "YouTube search requires API key or backend service. " +
    "This will be available in the Tauri backend."
  );

  return [];
}

/**
 * Fetch YouTube playlist info
 */
export async function fetchYouTubePlaylist(playlistId: string): Promise<YouTubePlaylist | null> {
  console.warn(
    "YouTube playlist fetching requires backend processing (yt-dlp). " +
    "This will be available in the Tauri backend."
  );

  return null;
}

/**
 * Fetch YouTube channel info
 */
export async function fetchYouTubeChannel(channelId: string): Promise<YouTubeChannel | null> {
  console.warn(
    "YouTube channel info requires API key. " +
    "This will be available in the Tauri backend."
  );

  return null;
}

/**
 * Get YouTube watch URL
 */
export function getYouTubeWatchURL(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedURL(videoId: string, startTime?: number): string {
  // Use YouTube's native embed URL
  const url = `https://www.youtube.com/embed/${videoId}`;
  const params = new URLSearchParams();
  
  // Add parameters for cleaner embed
  params.set('rel', '0'); // Don't show related videos
  params.set('modestbranding', '1'); // Minimal YouTube branding
  
  if (startTime) {
    params.set('start', String(Math.floor(startTime)));
  }
  
  return `${url}?${params.toString()}`;
}

/**
 * Parse YouTube duration (ISO 8601 format)
 */
export function parseYouTubeDuration(duration: string): number {
  // YouTube uses PT format: PT1H2M3S = 1 hour, 2 minutes, 3 seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format view count
 */
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
}

/**
 * Check if URL is a YouTube URL
 */
export function isYouTubeURL(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/embed\//,
    /youtube\.com\/shorts\//,
    /youtube\.com\/playlist/,
    /youtube\.com\/channel\//,
    /youtube\.com\/c\//,
    /youtube\.com\/@/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Get video type from URL
 */
export function getYouTubeURLType(url: string): "video" | "playlist" | "channel" | "unknown" {
  if (extractYouTubeID(url)) return "video";
  if (extractPlaylistID(url)) return "playlist";
  if (extractChannelID(url)) return "channel";
  return "unknown";
}

/**
 * YouTube API client using yt-dlp (Tauri command placeholder)
 * These will be implemented in the Rust backend
 */

/**
 * Download YouTube video using yt-dlp
 */
export async function downloadYouTubeVideo(
  url: string,
  quality: "best" | "1080p" | "720p" | "480p" | "audio" = "best"
): Promise<string> {
  // This will be a Tauri command
  console.log("Download request:", url, quality);
  throw new Error("Download requires Tauri backend - will be implemented in Rust");
}

/**
 * Extract YouTube video info using yt-dlp
 */
export async function extractYouTubeInfoWithYTDLP(url: string): Promise<YouTubeVideo | null> {
  // This will be a Tauri command
  console.log("Extract request:", url);
  throw new Error("Extraction requires Tauri backend - will be implemented in Rust");
}

/**
 * Get available formats for a YouTube video
 */
export async function getYouTubeFormats(videoId: string): Promise<
  Array<{
    format_id: string;
    ext: string;
    quality: string;
    filesize: number;
    vcodec: string;
    acodec: string;
  }>
> {
  // This will be a Tauri command
  console.log("Formats request:", videoId);
  throw new Error("Format listing requires Tauri backend - will be implemented in Rust");
}
