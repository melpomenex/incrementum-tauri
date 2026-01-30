/**
 * Hook for detecting and classifying URLs in the command palette
 * Supports YouTube, RSS feeds, and general web pages
 */

import { useMemo } from "react";

/**
 * URL type classification
 */
export enum URLType {
  YouTube = "youtube",
  RSSFeed = "rss",
  WebPage = "web",
  Unknown = "unknown",
}

/**
 * URL detection result
 */
export interface URLDetectionResult {
  isURL: boolean;
  type: URLType;
  url: string;
  youtubeId?: string;
  playlistId?: string;
}

/**
 * YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

/**
 * RSS feed patterns
 */
const RSS_PATTERNS = [
  /\/feed(?:\/)?$/,
  /\.rss(?:\/)?$/i,
  /\.xml(?:\/)?$/i,
  /\/atom(?:\/)?$/i,
  /\/rss(?:\/)?$/i,
];

/**
 * Valid URL pattern (http/https only)
 */
const VALID_URL_PATTERN = /^https?:\/\/.+/i;

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeID(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract YouTube playlist ID from URL
 */
function extractPlaylistID(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Detect if URL is an RSS feed
 */
function isRSSFeedURL(url: string): boolean {
  return RSS_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Detect if URL is a YouTube URL
 */
function isYouTubeURL(url: string): boolean {
  return YOUTUBE_PATTERNS.some(pattern => pattern.test(url)) ||
         extractPlaylistID(url) !== null;
}

/**
 * Detect URL type from input string
 */
function detectURL(input: string): URLDetectionResult {
  const trimmed = input.trim();

  // Check if it's a valid URL
  if (!VALID_URL_PATTERN.test(trimmed)) {
    return {
      isURL: false,
      type: URLType.Unknown,
      url: trimmed,
    };
  }

  // Check for YouTube first
  if (isYouTubeURL(trimmed)) {
    const videoId = extractYouTubeID(trimmed);
    const playlistId = extractPlaylistID(trimmed);
    return {
      isURL: true,
      type: URLType.YouTube,
      url: trimmed,
      youtubeId: videoId || undefined,
      playlistId: playlistId || undefined,
    };
  }

  // Check for RSS feed
  if (isRSSFeedURL(trimmed)) {
    return {
      isURL: true,
      type: URLType.RSSFeed,
      url: trimmed,
    };
  }

  // Default to web page
  return {
    isURL: true,
    type: URLType.WebPage,
    url: trimmed,
  };
}

/**
 * Hook for URL detection in command palette
 */
export function useURLDetector(input: string): URLDetectionResult {
  return useMemo(() => detectURL(input), [input]);
}

/**
 * Export utilities for testing
 */
export const urlDetectorUtils = {
  detectURL,
  extractYouTubeID,
  extractPlaylistID,
  isYouTubeURL,
  isRSSFeedURL,
};
