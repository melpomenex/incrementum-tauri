/**
 * Browser-based YouTube transcript fetching
 * Uses CORS proxies to access YouTube's transcript data
 * Falls back to Vercel API endpoint when deployed on Vercel
 * 
 * Now supports user-provided cookies for authentication
 */

import { getCookiesForApi, YouTubeCookie } from '../lib/youtubeCookies';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResponse {
  segments: TranscriptSegment[];
  videoId: string;
  language: string;
}

// CORS proxies to try (in order)
// Note: These are public CORS proxies that may have rate limits or reliability issues
// Many of these have been blocked or have strict rate limits
const CORS_PROXIES: string[] = [
  // Most public CORS proxies are now blocked by YouTube or have rate limits
  // The app should primarily rely on the API endpoint for transcript fetching
];

// Flag to disable CORS proxy fallback (recommended for production)
const DISABLE_CORS_PROXY = true;

// Third-party transcript APIs as last resort
const TRANSCRIPT_APIS = [
  // Returns JSON transcript directly
  { url: 'https://yt.lemnoslife.com/videos?part=snippet&id=', extract: (data: any) => null }, // Not a transcript API, placeholder
];

/**
 * Check if running on Vercel or production domain
 */
function isVercel(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return (
    hostname.includes('vercel.app') ||
    hostname.includes('readsync.org') ||
    hostname.includes('incrementum') ||
    // Check for env vars that indicate Vercel deployment
    // @ts-expect-error - Vite env var
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERCEL_ENV === 'production') ||
    // @ts-expect-error - Vite env var  
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERCEL_URL !== undefined)
  );
}

/**
 * Get API base URL
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  
  // Use relative URL for same-origin requests
  return '';
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
 * Fetch with CORS proxy fallback
 */
async function fetchWithCorsProxy(url: string): Promise<Response> {
  // Try direct fetch first (unlikely to work due to CORS, but worth a shot)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });
    if (response.ok) return response;
  } catch (e) {
    // Expected to fail due to CORS
  }

  // Try CORS proxies
  let lastError: Error | null = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });
      if (response.ok) return response;
    } catch (e) {
      lastError = e as Error;
      console.warn(`[YouTubeTranscript] CORS proxy failed: ${proxy}`, e);
    }
  }

  throw lastError || new Error('All CORS proxies failed');
}

/**
 * Fetch video page to get transcript data
 */
async function fetchVideoPage(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetchWithCorsProxy(url);
  const text = await response.text();
  
  // Handle allorigins.win response format (JSON with contents field)
  try {
    const json = JSON.parse(text);
    if (json.contents) {
      return json.contents;
    }
    // If it's JSON but no contents, return stringified version
    return JSON.stringify(json);
  } catch {
    // Not JSON, return as-is
    return text;
  }
}

/**
 * Extract caption tracks from video page HTML
 */
function extractCaptionTracks(html: string): Array<{ baseUrl: string; name: string; languageCode: string }> {
  // Look for ytInitialPlayerResponse in the page
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (!playerResponseMatch) {
    throw new Error('Could not find player response data');
  }

  try {
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
  } catch (e) {
    throw new Error(`Failed to parse caption tracks: ${e}`);
  }
}

/**
 * Parse XML transcript data
 */
function parseTranscriptXml(xmlText: string): TranscriptSegment[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Failed to parse transcript XML');
  }

  const textElements = xmlDoc.querySelectorAll('text');
  const segments: TranscriptSegment[] = [];

  textElements.forEach((el) => {
    const start = parseFloat(el.getAttribute('start') || '0');
    const duration = parseFloat(el.getAttribute('dur') || '0');
    // Decode HTML entities in text
    const text = el.textContent
      ?.replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim() || '';

    if (text) {
      segments.push({
        text,
        start,
        duration,
      });
    }
  });

  return segments;
}

/**
 * Try to fetch transcript from API endpoint
 * Includes user-provided cookies if available
 */
async function fetchFromApi(videoId: string, language?: string): Promise<TranscriptResponse | null> {
  try {
    const params = new URLSearchParams({ videoId });
    if (language) params.append('language', language);

    // Get user-provided cookies from IndexedDB
    const cookies = await getCookiesForApi();
    const hasCookies = cookies.length > 0;
    
    if (hasCookies) {
      console.log(`[YouTubeTranscript] Including ${cookies.length} cookies in request`);
    }

    const response = await fetch(`/api/youtube/transcript?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cookies: cookies.length > 0 ? cookies : undefined,
      }),
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('API returned non-JSON response (likely HTML error page)');
    }

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      // Handle specific error codes
      if (data.code === 'YOUTUBE_BOT_DETECTED') {
        const msg = data.auth?.clientCookies 
          ? 'YouTube is still blocking requests. Your cookies may have expired - try uploading fresh ones.'
          : 'YouTube is blocking transcript requests due to bot detection. Try uploading your YouTube cookies in settings.';
        throw new Error(msg);
      }
      if (data.code === 'YOUTUBE_AUTH_ERROR') {
        const msg = data.auth?.message || 'YouTube authentication failed. Your cookies may have expired.';
        throw new Error(msg);
      }
      if (data.code === 'YOUTUBE_CONSENT_REQUIRED') {
        throw new Error('YouTube requires consent. Please try a different video.');
      }
      if (data.code === 'AGE_RESTRICTED') {
        throw new Error('This video is age-restricted and cannot have transcripts fetched.');
      }
      if (data.code === 'NO_CAPTIONS') {
        throw new Error('This video does not have captions/subtitles available.');
      }
      throw new Error(data.error || `API returned ${response.status}`);
    }

    return {
      segments: data.segments,
      videoId: data.videoId,
      language: data.language,
    };
  } catch (error) {
    console.warn('[YouTubeTranscript] API fetch failed:', error);
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * Fetch YouTube transcript by video ID
 * Note: In local development, this may fail due to CORS restrictions.
 * The transcript fetching works best when deployed to Vercel with the API endpoints.
 */
export async function fetchYouTubeTranscript(
  videoIdOrUrl: string,
  language?: string
): Promise<TranscriptResponse> {
  const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;

  if (!videoId || videoId.length !== 11) {
    throw new Error('Invalid YouTube video ID or URL');
  }

  // Check if running locally
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Try API endpoint first (works best on Vercel deployments)
  try {
    const apiResult = await fetchFromApi(videoId, language);
    console.log('[YouTubeTranscript] Successfully fetched via API');
    return apiResult;
  } catch (apiError) {
    // If it's a specific error (like no captions), don't try fallback
    const errorMsg = apiError instanceof Error ? apiError.message : '';
    if (errorMsg.includes('does not have captions') || 
        errorMsg.includes('age-restricted') ||
        errorMsg.includes('requires consent')) {
      throw apiError;
    }
    
    console.warn('[YouTubeTranscript] API fetch failed:', apiError);
    
    if (isLocalhost) {
      console.warn(
        '[YouTubeTranscript] Note: Transcript fetching in local development may fail due to CORS. ' +
        'Deploy to Vercel for full functionality, or use `vercel dev` to test API endpoints locally.'
      );
    }
  }

  // Fallback to CORS proxy method
  console.log('[YouTubeTranscript] Trying CORS proxy method...');

  try {
    // Fetch video page to get caption tracks
    const html = await fetchVideoPage(videoId);
    const captionTracks = extractCaptionTracks(html);

    // Find the best matching caption track
    let selectedTrack = captionTracks[0]; // Default to first track

    if (language) {
      // Try to find exact match first
      const exactMatch = captionTracks.find(t => t.languageCode === language);
      if (exactMatch) {
        selectedTrack = exactMatch;
      } else {
        // Try partial match (e.g., 'en' matches 'en-US')
        const partialMatch = captionTracks.find(t => t.languageCode.startsWith(language));
        if (partialMatch) {
          selectedTrack = partialMatch;
        }
      }
    }

    // Fetch the transcript XML
    const transcriptUrl = selectedTrack.baseUrl;
    const transcriptResponse = await fetchWithCorsProxy(transcriptUrl);
    let transcriptXml = await transcriptResponse.text();
    
    // Handle allorigins.win response format (JSON with contents field)
    try {
      const json = JSON.parse(transcriptXml);
      if (json.contents) {
        transcriptXml = json.contents;
      }
    } catch {
      // Not JSON, use as-is
    }

    // Parse the transcript
    const segments = parseTranscriptXml(transcriptXml);

    if (segments.length === 0) {
      throw new Error('No transcript segments found');
    }

    return {
      segments,
      videoId,
      language: selectedTrack.languageCode,
    };
  } catch (error) {
    if (isLocalhost) {
      throw new Error(
        'Transcript fetching failed in local development mode. ' +
        'This is typically due to CORS restrictions. ' +
        'Please deploy to Vercel or use `vercel dev` for full functionality. ' +
        `Original error: ${error}`
      );
    }
    throw error;
  }
}

/**
 * Check if a video has transcripts available
 */
export async function checkTranscriptAvailable(videoIdOrUrl: string): Promise<boolean> {
  try {
    const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    if (!videoId || videoId.length !== 11) return false;

    const html = await fetchVideoPage(videoId);
    const captionTracks = extractCaptionTracks(html);
    return captionTracks.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get available languages for a video
 */
export async function getAvailableLanguages(
  videoIdOrUrl: string
): Promise<Array<{ code: string; name: string }>> {
  try {
    const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
    if (!videoId || videoId.length !== 11) return [];

    const html = await fetchVideoPage(videoId);
    const captionTracks = extractCaptionTracks(html);

    return captionTracks.map(track => ({
      code: track.languageCode,
      name: track.name,
    }));
  } catch {
    return [];
  }
}
