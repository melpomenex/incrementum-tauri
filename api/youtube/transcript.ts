/**
 * Vercel Serverless Function for fetching YouTube transcripts
 * This provides a server-side fallback that doesn't have CORS issues
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
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
 * Extract caption tracks from video page HTML
 */
function extractCaptionTracks(html: string): Array<{ baseUrl: string; name: string; languageCode: string }> {
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (!playerResponseMatch) {
    throw new Error('Could not find player response data');
  }

  const playerResponse = JSON.parse(playerResponseMatch[1]);
  const captionTracks = playerResponse?.captions?.captionTracks;

  if (!captionTracks || !Array.isArray(captionTracks)) {
    throw new Error('No caption tracks available for this video');
  }

  return captionTracks.map((track: any) => ({
    baseUrl: track.baseUrl,
    name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown',
    languageCode: track.languageCode || 'en',
  }));
}

/**
 * Parse XML transcript data
 */
function parseTranscriptXml(xmlText: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Simple regex-based parsing for XML transcript
  const textRegex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = textRegex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    // Decode HTML entities
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();

    if (text) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

/**
 * Fetch transcript from YouTube
 */
async function fetchTranscript(videoId: string, language?: string): Promise<{ segments: TranscriptSegment[]; language: string }> {
  // Fetch video page
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`);
  }

  const html = await response.text();
  const captionTracks = extractCaptionTracks(html);

  // Select the best matching track
  let selectedTrack = captionTracks[0];

  if (language) {
    const exactMatch = captionTracks.find(t => t.languageCode === language);
    if (exactMatch) {
      selectedTrack = exactMatch;
    } else {
      const partialMatch = captionTracks.find(t => t.languageCode.startsWith(language));
      if (partialMatch) {
        selectedTrack = partialMatch;
      }
    }
  }

  // Fetch transcript
  const transcriptResponse = await fetch(selectedTrack.baseUrl);
  if (!transcriptResponse.ok) {
    throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`);
  }

  const transcriptXml = await transcriptResponse.text();
  const segments = parseTranscriptXml(transcriptXml);

  return { segments, language: selectedTrack.languageCode };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { videoId, url, language } = req.query;

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

    const lang = language && typeof language === 'string' ? language : undefined;
    const result = await fetchTranscript(targetVideoId, lang);

    return res.status(200).json({
      success: true,
      videoId: targetVideoId,
      language: result.language,
      segments: result.segments,
    });
  } catch (error) {
    console.error('Transcript fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
