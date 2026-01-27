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
function extractCaptionTracks(html: string): Array<{ baseUrl: string; name: string; languageCode: string }> | null {
  // Try multiple patterns to find player response
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*({.+?});/,
    /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/,
    /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/,
  ];

  let playerResponseStr: string | null = null;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      playerResponseStr = match[1];
      break;
    }
  }

  if (!playerResponseStr) {
    // Check if it's a login page or age restriction
    if (html.includes('Sign in') || html.includes('before you continue')) {
      throw new Error('YouTube requires sign-in or consent. Cannot fetch transcript.');
    }
    if (html.includes('age-restricted') || html.includes('content warning')) {
      throw new Error('Video is age-restricted. Cannot fetch transcript.');
    }
    // Log a snippet of the HTML for debugging
    const snippet = html.substring(0, 500).replace(/\s+/g, ' ');
    console.error('Could not find player response. HTML snippet:', snippet);
    throw new Error('Could not find player response data');
  }

  try {
    const playerResponse = JSON.parse(playerResponseStr);
    
    // Check for playability errors
    const playabilityError = playerResponse?.playabilityStatus?.errorScreen;
    if (playabilityError) {
      const reason = playerResponse?.playabilityStatus?.reason || 'Video unavailable';
      throw new Error(`YouTube error: ${reason}`);
    }

    const captionTracks = playerResponse?.captions?.captionTracks;

    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      return null; // No captions available
    }

    return captionTracks.map((track: any) => ({
      baseUrl: track.baseUrl,
      name: track.name?.simpleText || track.name?.runs?.[0]?.text || 'Unknown',
      languageCode: track.languageCode || 'en',
    }));
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('YouTube error')) {
      throw e;
    }
    console.error('Failed to parse player response:', e);
    throw new Error('Failed to parse player response data');
  }
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
 * Try to fetch transcript using innertube API (more reliable)
 */
async function fetchTranscriptViaInnertube(videoId: string): Promise<{ segments: TranscriptSegment[]; language: string } | null> {
  try {
    // First, get the player's JS to extract the innertube API key
    const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
    const response = await fetch(playerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240101.00.00',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            gl: 'US',
            hl: 'en',
          },
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const captionTracks = data?.captions?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    const track = captionTracks[0];
    const transcriptResponse = await fetch(track.baseUrl);
    
    if (!transcriptResponse.ok) {
      return null;
    }

    const transcriptXml = await transcriptResponse.text();
    const segments = parseTranscriptXml(transcriptXml);

    return {
      segments,
      language: track.languageCode || 'en',
    };
  } catch (error) {
    console.error('Innertube API failed:', error);
    return null;
  }
}

/**
 * Fetch transcript from YouTube
 */
async function fetchTranscript(videoId: string, language?: string): Promise<{ segments: TranscriptSegment[]; language: string }> {
  // Try innertube API first (more reliable)
  const innertubeResult = await fetchTranscriptViaInnertube(videoId);
  if (innertubeResult) {
    console.log('Successfully fetched transcript via innertube API');
    return innertubeResult;
  }

  // Fallback to page scraping
  console.log('Trying page scraping method...');
  
  // Fetch video page
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cookie': 'CONSENT=YES+cb', // Try to bypass consent screen
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`);
  }

  const html = await response.text();
  const captionTracks = extractCaptionTracks(html);

  if (!captionTracks) {
    throw new Error('No caption tracks available for this video');
  }

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
        success: false,
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
    
    // Return more specific error codes
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('sign-in') || errorMessage.includes('consent')) {
      return res.status(503).json({
        success: false,
        error: errorMessage,
        code: 'YOUTUBE_CONSENT_REQUIRED',
      });
    }
    
    if (errorMessage.includes('age-restricted')) {
      return res.status(403).json({
        success: false,
        error: errorMessage,
        code: 'AGE_RESTRICTED',
      });
    }
    
    if (errorMessage.includes('No caption tracks')) {
      return res.status(404).json({
        success: false,
        error: errorMessage,
        code: 'NO_CAPTIONS',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
