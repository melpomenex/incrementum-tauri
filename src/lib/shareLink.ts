/**
 * Document Sharing Link Utilities
 *
 * This module provides functions for encoding and decoding document reading state
 * into shareable URL fragments, enabling users to share their reading position,
 * highlights, and extracts with others.
 */

/**
 * Document reading state that can be encoded in a shareable link
 */
export interface DocumentState {
  /** Reading position - page number for documents, timestamp for videos */
  pos?: number;
  /** Highlight IDs to display */
  highlights?: string[];
  /** Extract IDs to display */
  extracts?: string[];
  /** Scroll position percentage (0-100) */
  scroll?: number;
  /** Zoom/scale value (e.g., 1.0 for 100%, 1.5 for 150%, or "page-width"/"fit-page") */
  zoom?: string | number;
  /** Video timestamp in seconds (for YouTube videos) */
  time?: number;
}

/**
 * Encoded state string format: key=value&key=value,...
 * Values are encoded using base64url to handle special characters
 */

/**
 * Encode document state into a URL fragment string
 */
export function encodeDocumentState(state: DocumentState): string {
  const params: string[] = [];

  if (state.pos !== undefined) {
    params.push(`pos=${state.pos}`);
  }

  if (state.time !== undefined) {
    params.push(`time=${state.time}`);
  }

  if (state.scroll !== undefined) {
    params.push(`scroll=${Math.round(state.scroll)}`);
  }

  if (state.zoom !== undefined) {
    // Encode zoom as string (supports both numeric and named values like "page-width")
    params.push(`zoom=${encodeURIComponent(String(state.zoom))}`);
  }

  if (state.highlights && state.highlights.length > 0) {
    const compressed = compressIdList(state.highlights);
    params.push(`hl=${compressed}`);
  }

  if (state.extracts && state.extracts.length > 0) {
    const compressed = compressIdList(state.extracts);
    params.push(`ex=${compressed}`);
  }

  return params.length > 0 ? `#${params.join('&')}` : '';
}

/**
 * Decode document state from a URL fragment string
 */
export function decodeDocumentState(fragment: string): DocumentState {
  const state: DocumentState = {};

  // Remove leading # if present
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment;

  if (!hash) {
    return state;
  }

  const params = new URLSearchParams(hash);

  if (params.has('pos')) {
    state.pos = parseInt(params.get('pos') || '0', 10);
  }

  if (params.has('time')) {
    state.time = parseInt(params.get('time') || '0', 10);
  }

  if (params.has('scroll')) {
    state.scroll = parseInt(params.get('scroll') || '0', 10);
  }

  if (params.has('zoom')) {
    const zoomStr = decodeURIComponent(params.get('zoom') || '');
    // Try parsing as number, fallback to string for named values like "page-width"
    const zoomNum = parseFloat(zoomStr);
    state.zoom = !isNaN(zoomNum) ? zoomNum : zoomStr;
  }

  if (params.has('hl')) {
    const compressed = params.get('hl') || '';
    state.highlights = decompressIdList(compressed);
  }

  if (params.has('ex')) {
    const compressed = params.get('ex') || '';
    state.extracts = decompressIdList(compressed);
  }

  return state;
}

/**
 * Generate a shareable URL for a document with encoded state
 */
export function generateShareUrl(baseUrl: string, documentId: string, state: DocumentState): string {
  const fragment = encodeDocumentState(state);
  return `${baseUrl}/document/${documentId}${fragment}`;
}

/**
 * Generate a shareable URL for a YouTube video with timestamp
 */
export function generateYouTubeShareUrl(videoId: string, time?: number): string {
  const state: DocumentState = time !== undefined ? { time } : {};
  const fragment = encodeDocumentState(state);

  // YouTube URLs format
  const baseUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return time !== undefined ? `${baseUrl}&t=${Math.floor(time)}` : baseUrl;
}

/**
 * Parse document state from current URL
 */
export function parseStateFromUrl(): DocumentState {
  return decodeDocumentState(window.location.hash);
}

/**
 * Format video timestamp for YouTube URL (e.g., 1m23s)
 */
export function formatYouTubeTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join('');
}

/**
 * Simple compression for ID lists
 * Converts array of IDs to a comma-separated string
 * For very long lists, could use run-length encoding or other compression
 */
export function compressIdList(ids: string[]): string {
  if (ids.length === 0) return '';

  // For short lists, just join with commas
  if (ids.length < 10) {
    return ids.join(',');
  }

  // For longer lists, use a simple range encoding
  // IDs that end with numbers can be encoded as ranges
  const ranges: string[] = [];
  let start = ids[0];
  let end = ids[0];

  for (let i = 1; i < ids.length; i++) {
    const prevIndex = getNumericSuffix(end);
    const currentIndex = getNumericSuffix(ids[i]);

    if (prevIndex !== null && currentIndex !== null &&
        ids[i].startsWith(end.slice(0, -prevIndex.length)) &&
        currentIndex === prevIndex + 1) {
      // Continue range
      end = ids[i];
    } else {
      // End current range
      if (start === end) {
        ranges.push(start);
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = ids[i];
      end = ids[i];
    }
  }

  // Add last range
  if (start === end) {
    ranges.push(start);
  } else {
    ranges.push(`${start}-${end}`);
  }

  return ranges.join(',');
}

/**
 * Decompress ID list back to array
 */
export function decompressIdList(compressed: string): string[] {
  if (!compressed) return [];

  const ids: string[] = [];

  for (const part of compressed.split(',')) {
    if (part.includes('-')) {
      // Range encoding: id1-id5
      const [start, end] = part.split('-');
      ids.push(start);
      if (end && start !== end) {
        // Expand range
        const startPrefix = start.slice(0, -getNumericSuffix(start)!.length);
        const endPrefix = end.slice(0, -getNumericSuffix(end)!.length);
        const startIndex = parseInt(getNumericSuffix(start)!, 10);
        const endIndex = parseInt(getNumericSuffix(end)!, 10);

        if (startPrefix === endPrefix) {
          for (let i = startIndex + 1; i <= endIndex; i++) {
            ids.push(`${startPrefix}${i}`);
          }
        }
      }
    } else {
      // Regular ID
      ids.push(part);
    }
  }

  return ids;
}

/**
 * Extract numeric suffix from a string (e.g., "item-123" -> "123")
 */
function getNumericSuffix(str: string): string | null {
  const match = str.match(/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Check if a document state is empty
 */
export function isEmptyState(state: DocumentState): boolean {
  return !state.pos &&
    !state.time &&
    !state.scroll &&
    state.zoom === undefined &&
    (!state.highlights || state.highlights.length === 0) &&
    (!state.extracts || state.extracts.length === 0);
}

/**
 * Update URL hash without triggering navigation
 * Uses replaceState for smooth state updates without adding history entries
 */
export function updateUrlHash(state: DocumentState, replace = true): void {
  const fragment = encodeDocumentState(state);
  const newUrl = window.location.pathname + window.location.search + fragment;

  if (replace) {
    window.history.replaceState(null, '', newUrl);
  } else {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Push a new history entry with updated hash
 * Use this when you want back/forward navigation to work
 */
export function pushUrlHash(state: DocumentState): void {
  updateUrlHash(state, false);
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}
