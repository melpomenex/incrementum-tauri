/**
 * Vercel Serverless Function for fetching YouTube video info
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
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
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video info using oEmbed (simple, no API key needed)
 */
async function fetchVideoInfoOembed(videoId: string): Promise<YouTubeVideoInfo> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch video info: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: videoId,
    title: data.title || 'Unknown',
    description: '',
    channel: data.author_name || 'Unknown',
    channel_id: '',
    duration: 0, // oEmbed doesn't provide duration
    view_count: 0,
    upload_date: '',
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    tags: [],
    category: '',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { videoId, url } = req.query;

    let targetVideoId: string | null = null;

    if (videoId && typeof videoId === 'string') {
      targetVideoId = videoId;
    } else if (url && typeof url === 'string') {
      targetVideoId = extractVideoId(url);
    }

    if (!targetVideoId) {
      return res.status(400).json({
        error: 'Missing or invalid videoId or url parameter',
      });
    }

    const info = await fetchVideoInfoOembed(targetVideoId);

    return res.status(200).json({
      success: true,
      ...info,
    });
  } catch (error) {
    console.error('Video info fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
