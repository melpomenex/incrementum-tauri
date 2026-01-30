/**
 * YouTube Data API client for browser
 * Used for fetching playlist information in the webapp
 */

import { useSettingsStore } from "../stores/settingsStore";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  position: number;
  duration?: string;
  videoId: string;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  itemCount: number;
  videos: YouTubeVideoItem[];
}

/**
 * Get the YouTube API key from settings
 */
function getApiKey(): string | undefined {
  return useSettingsStore.getState().settings?.youtube?.apiKey;
}

/**
 * Check if YouTube API is enabled (has API key)
 */
export function isYouTubeApiEnabled(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch playlist information from YouTube Data API
 */
export async function fetchPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("YouTube API key not configured. Please add your API key in settings.");
  }

  // Fetch playlist details
  const playlistUrl = `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`;
  
  const playlistResponse = await fetch(playlistUrl);
  
  if (!playlistResponse.ok) {
    const error = await playlistResponse.json();
    throw new Error(error.error?.message || "Failed to fetch playlist");
  }
  
  const playlistData = await playlistResponse.json();
  
  if (!playlistData.items || playlistData.items.length === 0) {
    throw new Error("Playlist not found");
  }
  
  const playlist = playlistData.items[0];
  const snippet = playlist.snippet;
  const thumbnails = snippet.thumbnails;
  
  // Get the best available thumbnail
  const thumbnail = thumbnails.maxres?.url || 
                   thumbnails.standard?.url || 
                   thumbnails.high?.url || 
                   thumbnails.medium?.url || 
                   thumbnails.default?.url;

  // Fetch all playlist items (videos)
  const videos: YouTubeVideoItem[] = [];
  let nextPageToken: string | undefined;
  
  do {
    const itemsUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    
    const itemsResponse = await fetch(itemsUrl);
    
    if (!itemsResponse.ok) {
      const error = await itemsResponse.json();
      throw new Error(error.error?.message || "Failed to fetch playlist items");
    }
    
    const itemsData = await itemsResponse.json();
    
    for (const item of itemsData.items) {
      const itemThumbnails = item.snippet.thumbnails;
      const itemThumbnail = itemThumbnails?.maxres?.url || 
                           itemThumbnails?.standard?.url || 
                           itemThumbnails?.high?.url || 
                           itemThumbnails?.medium?.url || 
                           itemThumbnails?.default?.url ||
                           `https://img.youtube.com/vi/${item.contentDetails.videoId}/hqdefault.jpg`;
      
      videos.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: itemThumbnail,
        position: item.snippet.position,
        videoId: item.contentDetails.videoId,
      });
    }
    
    nextPageToken = itemsData.nextPageToken;
  } while (nextPageToken);

  return {
    id: playlistId,
    title: snippet.title,
    description: snippet.description,
    channelTitle: snippet.channelTitle,
    channelId: snippet.channelId,
    thumbnail,
    itemCount: playlist.contentDetails.itemCount,
    videos,
  };
}

/**
 * Fetch video durations for a list of video IDs
 * This requires a separate API call since playlistItems don't include duration
 */
export async function fetchVideoDurations(videoIds: string[]): Promise<Map<string, string>> {
  const apiKey = getApiKey();
  
  if (!apiKey || videoIds.length === 0) {
    return new Map();
  }

  const durations = new Map<string, string>();
  
  // API allows max 50 IDs per request
  const chunkSize = 50;
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize);
    const ids = chunk.join(",");
    
    const url = `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${ids}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn("Failed to fetch video durations:", await response.text());
      continue;
    }
    
    const data = await response.json();
    
    for (const item of data.items || []) {
      durations.set(item.id, item.contentDetails.duration);
    }
  }
  
  return durations;
}

/**
 * Parse ISO 8601 duration to seconds
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
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
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Import videos from a playlist as documents
 */
export async function importPlaylistVideos(
  playlistInfo: YouTubePlaylistInfo,
  importAll: boolean = true,
  selectedVideoIds?: string[]
): Promise<Array<{ title: string; url: string; videoId: string; thumbnail: string }>> {
  const videosToImport = importAll 
    ? playlistInfo.videos 
    : playlistInfo.videos.filter(v => selectedVideoIds?.includes(v.videoId));

  return videosToImport.map(video => ({
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.videoId}&list=${playlistInfo.id}`,
    videoId: video.videoId,
    thumbnail: video.thumbnail,
  }));
}

/**
 * Validate YouTube API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet&chart=mostPopular&maxResults=1&key=${apiKey}`;
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}
