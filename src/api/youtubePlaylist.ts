/**
 * YouTube Playlist Auto-Import API
 * 
 * Provides methods to subscribe to playlists, manage subscriptions,
 * and control queue interspersion settings.
 */

import { invokeCommand } from "../lib/tauri";

/**
 * A subscription to a YouTube playlist
 */
export interface PlaylistSubscription {
  id: string;
  playlist_id: string;
  playlist_url: string;
  title: string | null;
  channel_name: string | null;
  channel_id: string | null;
  description: string | null;
  thumbnail_url: string | null;
  total_videos: number | null;
  is_active: boolean;
  auto_import_new: boolean;
  queue_intersperse_interval: number;
  priority_rating: number;
  last_refreshed_at: string | null;
  refresh_interval_hours: number;
  created_at: string;
  modified_at: string;
}

/**
 * A video from a subscribed playlist
 */
export interface PlaylistVideo {
  id: string;
  subscription_id: string;
  video_id: string;
  video_title: string | null;
  video_duration: number | null;
  thumbnail_url: string | null;
  position: number | null;
  is_imported: boolean;
  document_id: string | null;
  added_to_queue: boolean;
  queue_position: number | null;
  published_at: string | null;
  discovered_at: string;
  imported_at: string | null;
}

/**
 * Global settings for YouTube playlist integration
 */
export interface PlaylistSettings {
  id: string;
  enabled: boolean;
  default_intersperse_interval: number;
  default_priority: number;
  max_consecutive_playlist_videos: number;
  prefer_new_videos: boolean;
  created_at: string;
  modified_at: string;
}

/**
 * Subscription detail including videos
 */
export interface PlaylistSubscriptionDetail {
  subscription: PlaylistSubscription;
  videos: PlaylistVideo[];
}

/**
 * Result of refreshing a playlist
 */
export interface PlaylistRefreshResult {
  new_videos_found: number;
  imported_count: number;
}

/**
 * Unimported video with subscription info
 */
export interface UnimportedPlaylistVideo extends PlaylistVideo {
  subscription_title: string | null;
  channel_name: string | null;
}

/**
 * A playlist video ready for queue interspersion
 */
export interface PlaylistQueueItem {
  playlist_video_id: string;
  video_id: string;
  video_title: string | null;
  document_id: string;
  document_title: string;
  document_url: string;
  subscription_id: string;
  subscription_title: string | null;
  intersperse_interval: number;
  priority_rating: number;
}

/**
 * Subscribe to a YouTube playlist
 */
export async function subscribeToPlaylist(
  playlistUrl: string
): Promise<PlaylistSubscription> {
  return invokeCommand("subscribe_to_playlist", { playlistUrl });
}

/**
 * Get all playlist subscriptions
 */
export async function getPlaylistSubscriptions(): Promise<PlaylistSubscription[]> {
  return invokeCommand("get_playlist_subscriptions");
}

/**
 * Get a single playlist subscription with videos
 */
export async function getPlaylistSubscription(
  subscriptionId: string
): Promise<PlaylistSubscriptionDetail> {
  return invokeCommand("get_playlist_subscription", { subscriptionId });
}

/**
 * Update playlist subscription settings
 */
export async function updatePlaylistSubscription(
  subscriptionId: string,
  updates: {
    title?: string;
    is_active?: boolean;
    auto_import_new?: boolean;
    queue_intersperse_interval?: number;
    priority_rating?: number;
    refresh_interval_hours?: number;
  }
): Promise<void> {
  return invokeCommand("update_playlist_subscription", {
    subscriptionId,
    ...updates,
  });
}

/**
 * Delete a playlist subscription
 */
export async function deletePlaylistSubscription(
  subscriptionId: string
): Promise<void> {
  return invokeCommand("delete_playlist_subscription", { subscriptionId });
}

/**
 * Refresh a playlist - fetch latest videos
 */
export async function refreshPlaylist(
  subscriptionId: string,
  autoImport: boolean = true
): Promise<PlaylistRefreshResult> {
  return invokeCommand("refresh_playlist", { subscriptionId, autoImport });
}

/**
 * Import a specific video from a playlist
 */
export async function importPlaylistVideo(
  playlistVideoId: string
): Promise<import("../types/document").Document> {
  return invokeCommand("import_playlist_video", { playlistVideoId });
}

/**
 * Get all unimported videos from playlists
 */
export async function getUnimportedPlaylistVideos(): Promise<
  UnimportedPlaylistVideo[]
> {
  return invokeCommand("get_unimported_playlist_videos");
}

/**
 * Get global playlist settings
 */
export async function getPlaylistSettings(): Promise<PlaylistSettings> {
  return invokeCommand("get_playlist_settings");
}

/**
 * Update global playlist settings
 */
export async function updatePlaylistSettings(
  settings: Partial<
    Omit<PlaylistSettings, "id" | "created_at" | "modified_at">
  >
): Promise<void> {
  return invokeCommand("update_playlist_settings", settings);
}

/**
 * Get queue items from playlist videos that need interspersion
 */
export async function getPlaylistQueueItems(
  limit?: number
): Promise<PlaylistQueueItem[]> {
  return invokeCommand("get_playlist_queue_items", { limit });
}

/**
 * Mark a playlist video as added to the queue
 */
export async function markPlaylistVideoQueued(
  playlistVideoId: string,
  queuePosition: number
): Promise<void> {
  return invokeCommand("mark_playlist_video_queued", {
    playlistVideoId,
    queuePosition,
  });
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Check if URL is a YouTube playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  const hasListParam = url.includes("list=");
  const isYouTubeWatch = url.includes("youtube.com/watch");
  const isYouTubePlaylist = url.includes("youtube.com/playlist");
  const isYouTuBe = url.includes("youtu.be/");
  
  return (
    isYouTubePlaylist ||
    (isYouTubeWatch && hasListParam) ||
    (isYouTuBe && hasListParam)
  );
}

/**
 * Format video duration
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
