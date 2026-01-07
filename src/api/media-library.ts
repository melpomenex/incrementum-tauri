/**
 * Media library management for organizing video and audio files
 */

export type MediaType = "video" | "audio" | "podcast" | "youtube";

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  artist?: string;
  album?: string;
  duration?: number; // in seconds
  filePath: string;
  fileSize?: number; // in bytes
  mimeType?: string;
  thumbnail?: string;
  addedDate: string;
  lastPlayedDate?: string;
  playCount: number;
  position?: number; // playback position in seconds
  metadata: {
    width?: number;
    height?: number;
    bitrate?: number;
    codec?: string;
    [key: string]: any;
  };
  tags: string[];
  rating?: number; // 1-5 stars
  notes?: string;
}

export interface MediaFolder {
  id: string;
  path: string;
  name: string;
  autoImport: boolean;
  recursive: boolean;
  lastScanned?: string;
}

export interface MediaPlaylist {
  id: string;
  name: string;
  description?: string;
  items: string[]; // media item IDs
  createdDate: string;
  modifiedDate: string;
}

/**
 * Get all media items
 */
export function getAllMediaItems(): MediaItem[] {
  const data = localStorage.getItem("media_library");
  return data ? JSON.parse(data) : [];
}

/**
 * Save media items
 */
function saveMediaItems(items: MediaItem[]): void {
  localStorage.setItem("media_library", JSON.stringify(items));
}

/**
 * Add media item
 */
export function addMediaItem(item: MediaItem): void {
  const items = getAllMediaItems();
  items.push(item);
  saveMediaItems(items);
}

/**
 * Update media item
 */
export function updateMediaItem(id: string, updates: Partial<MediaItem>): void {
  const items = getAllMediaItems();
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveMediaItems(items);
  }
}

/**
 * Delete media item
 */
export function deleteMediaItem(id: string): void {
  const items = getAllMediaItems();
  const filtered = items.filter((item) => item.id !== id);
  saveMediaItems(filtered);
}

/**
 * Get media item by ID
 */
export function getMediaItem(id: string): MediaItem | undefined {
  const items = getAllMediaItems();
  return items.find((item) => item.id === id);
}

/**
 * Search media items
 */
export function searchMediaItems(query: string): MediaItem[] {
  const items = getAllMediaItems();
  const lowerQuery = query.toLowerCase();

  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      (item.artist && item.artist.toLowerCase().includes(lowerQuery)) ||
      (item.album && item.album.toLowerCase().includes(lowerQuery)) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filter media items by type
 */
export function filterByType(type: MediaType): MediaItem[] {
  const items = getAllMediaItems();
  return items.filter((item) => item.type === type);
}

/**
 * Filter media items by tags
 */
export function filterByTags(tags: string[]): MediaItem[] {
  const items = getAllMediaItems();
  return items.filter((item) =>
    tags.some((tag) => item.tags.includes(tag))
  );
}

/**
 * Get recently added items
 */
export function getRecentlyAdded(limit: number = 20): MediaItem[] {
  const items = getAllMediaItems();
  return items
    .sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime())
    .slice(0, limit);
}

/**
 * Get recently played items
 */
export function getRecentlyPlayed(limit: number = 20): MediaItem[] {
  const items = getAllMediaItems();
  return items
    .filter((item) => item.lastPlayedDate)
    .sort((a, b) => new Date(b.lastPlayedDate!).getTime() - new Date(a.lastPlayedDate!).getTime())
    .slice(0, limit);
}

/**
 * Get most played items
 */
export function getMostPlayed(limit: number = 20): MediaItem[] {
  const items = getAllMediaItems();
  return items
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}

/**
 * Record playback
 */
export function recordPlayback(id: string, position: number): void {
  const items = getAllMediaItems();
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index].lastPlayedDate = new Date().toISOString();
    items[index].playCount += 1;
    items[index].position = position;
    saveMediaItems(items);
  }
}

/**
 * Update playback position
 */
export function updatePlaybackPosition(id: string, position: number): void {
  const items = getAllMediaItems();
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index].position = position;
    saveMediaItems(items);
  }
}

/**
 * Mark as played (when finished)
 */
export function markAsPlayed(id: string): void {
  updateMediaItem(id, {
    position: 0,
    lastPlayedDate: new Date().toISOString(),
  });
}

/**
 * Get all folders
 */
export function getMediaFolders(): MediaFolder[] {
  const data = localStorage.getItem("media_folders");
  return data ? JSON.parse(data) : [];
}

/**
 * Save folders
 */
function saveMediaFolders(folders: MediaFolder[]): void {
  localStorage.setItem("media_folders", JSON.stringify(folders));
}

/**
 * Add folder
 */
export function addMediaFolder(folder: MediaFolder): void {
  const folders = getMediaFolders();
  folders.push(folder);
  saveMediaFolders(folders);
}

/**
 * Remove folder
 */
export function removeMediaFolder(id: string): void {
  const folders = getMediaFolders();
  const filtered = folders.filter((folder) => folder.id !== id);
  saveMediaFolders(filtered);
}

/**
 * Update folder
 */
export function updateMediaFolder(id: string, updates: Partial<MediaFolder>): void {
  const folders = getMediaFolders();
  const index = folders.findIndex((folder) => folder.id === id);
  if (index !== -1) {
    folders[index] = { ...folders[index], ...updates };
    saveMediaFolders(folders);
  }
}

/**
 * Get all playlists
 */
export function getMediaPlaylists(): MediaPlaylist[] {
  const data = localStorage.getItem("media_playlists");
  return data ? JSON.parse(data) : [];
}

/**
 * Save playlists
 */
function saveMediaPlaylists(playlists: MediaPlaylist[]): void {
  localStorage.setItem("media_playlists", JSON.stringify(playlists));
}

/**
 * Create playlist
 */
export function createPlaylist(
  name: string,
  description?: string,
  items: string[] = []
): MediaPlaylist {
  const playlist: MediaPlaylist = {
    id: `playlist-${Date.now()}`,
    name,
    description,
    items,
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
  };

  const playlists = getMediaPlaylists();
  playlists.push(playlist);
  saveMediaPlaylists(playlists);

  return playlist;
}

/**
 * Update playlist
 */
export function updatePlaylist(
  id: string,
  updates: Partial<Omit<MediaPlaylist, "id" | "createdDate">>
): void {
  const playlists = getMediaPlaylists();
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index !== -1) {
    playlists[index] = {
      ...playlists[index],
      ...updates,
      modifiedDate: new Date().toISOString(),
    };
    saveMediaPlaylists(playlists);
  }
}

/**
 * Delete playlist
 */
export function deletePlaylist(id: string): void {
  const playlists = getMediaPlaylists();
  const filtered = playlists.filter((playlist) => playlist.id !== id);
  saveMediaPlaylists(filtered);
}

/**
 * Add item to playlist
 */
export function addToPlaylist(playlistId: string, mediaItemId: string): void {
  const playlists = getMediaPlaylists();
  const index = playlists.findIndex((playlist) => playlist.id === playlistId);
  if (index !== -1) {
    if (!playlists[index].items.includes(mediaItemId)) {
      playlists[index].items.push(mediaItemId);
      playlists[index].modifiedDate = new Date().toISOString();
      saveMediaPlaylists(playlists);
    }
  }
}

/**
 * Remove item from playlist
 */
export function removeFromPlaylist(playlistId: string, mediaItemId: string): void {
  const playlists = getMediaPlaylists();
  const index = playlists.findIndex((playlist) => playlist.id === playlistId);
  if (index !== -1) {
    playlists[index].items = playlists[index].items.filter((id) => id !== mediaItemId);
    playlists[index].modifiedDate = new Date().toISOString();
    saveMediaPlaylists(playlists);
  }
}

/**
 * Get playlist with full media items
 */
export function getPlaylistWithItems(playlistId: string): {
  playlist: MediaPlaylist | undefined;
  items: MediaItem[];
} {
  const playlists = getMediaPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  const allItems = getAllMediaItems();

  const items = playlist
    ? playlist.items.map((id) => allItems.find((item) => item.id === id)).filter(Boolean) as MediaItem[]
    : [];

  return { playlist, items };
}

/**
 * Get all tags
 */
export function getAllTags(): string[] {
  const items = getAllMediaItems();
  const tagSet = new Set<string>();

  items.forEach((item) => {
    item.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration
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
 * Get library statistics
 */
export function getLibraryStats(): {
  totalItems: number;
  totalDuration: number;
  totalSize: number;
  byType: Record<MediaType, number>;
  mostPlayed: MediaItem | null;
  recentlyAdded: MediaItem | null;
} {
  const items = getAllMediaItems();

  const byType: Record<MediaType, number> = {
    video: 0,
    audio: 0,
    podcast: 0,
    youtube: 0,
  };

  let totalDuration = 0;
  let totalSize = 0;

  items.forEach((item) => {
    byType[item.type]++;
    if (item.duration) totalDuration += item.duration;
    if (item.fileSize) totalSize += item.fileSize;
  });

  const mostPlayed = items.length > 0
    ? items.reduce((max, item) => (item.playCount > max.playCount ? item : max))
    : null;

  const recentlyAdded = items.length > 0
    ? items.reduce((max, item) =>
        new Date(item.addedDate) > new Date(max.addedDate) ? item : max
      )
    : null;

  return {
    totalItems: items.length,
    totalDuration,
    totalSize,
    byType,
    mostPlayed,
    recentlyAdded,
  };
}

/**
 * Generate unique ID
 */
export function generateMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Import media item from file
 */
export async function importMediaItem(
  file: File,
  type: MediaType,
  metadata?: Partial<MediaItem>
): Promise<MediaItem> {
  // Get file metadata
  const duration = await getMediaDuration(file);
  const thumbnail = type === "video" ? await generateVideoThumbnail(file) : undefined;

  const item: MediaItem = {
    id: generateMediaId(),
    type,
    title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
    duration,
    filePath: file.name, // In real implementation, would be actual path
    fileSize: file.size,
    mimeType: file.type,
    thumbnail,
    addedDate: new Date().toISOString(),
    playCount: 0,
    metadata: metadata?.metadata || {},
    tags: metadata?.tags || [],
    rating: metadata?.rating,
    notes: metadata?.notes,
    ...metadata,
  };

  addMediaItem(item);
  return item;
}

/**
 * Get media duration from file
 */
async function getMediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const element = file.type.startsWith("video")
      ? document.createElement("video")
      : document.createElement("audio");

    element.preload = "metadata";

    element.onloadedmetadata = () => {
      resolve(element.duration);
      URL.revokeObjectURL(element.src);
    };

    element.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(element.src);
    };

    element.src = URL.createObjectURL(file);
  });
}

/**
 * Generate video thumbnail
 */
async function generateVideoThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.currentTime = 1; // Capture at 1 second

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve(undefined);
      }

      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Export library data
 */
export function exportLibraryData(): string {
  const data = {
    mediaItems: getAllMediaItems(),
    folders: getMediaFolders(),
    playlists: getMediaPlaylists(),
    exportDate: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import library data
 */
export function importLibraryData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);

    if (data.mediaItems) {
      localStorage.setItem("media_library", JSON.stringify(data.mediaItems));
    }
    if (data.folders) {
      localStorage.setItem("media_folders", JSON.stringify(data.folders));
    }
    if (data.playlists) {
      localStorage.setItem("media_playlists", JSON.stringify(data.playlists));
    }

    return true;
  } catch (error) {
    console.error("Failed to import library data:", error);
    return false;
  }
}
