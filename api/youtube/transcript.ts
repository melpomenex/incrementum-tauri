/**
 * Vercel Serverless Function for fetching YouTube transcripts
 * This provides a server-side fallback that doesn't have CORS issues
 * 
 * COOKIE AUTHENTICATION:
 * To avoid bot detection, you can provide YouTube cookies from an authenticated session.
 * 
 * Setup Instructions:
 * 1. Install a cookie exporter extension in your browser (e.g., "Get cookies.txt" for Chrome)
 * 2. Go to YouTube.com and make sure you're logged in
 * 3. Export cookies for youtube.com in JSON format
 * 4. Set the YOUTUBE_COOKIES_JSON environment variable in Vercel with the JSON content
 * 
 * Cookie Format (JSON):
 * [
 *   {"name": "VISITOR_INFO1_LIVE", "value": "...", "domain": ".youtube.com"},
 *   {"name": "YSC", "value": "...", "domain": ".youtube.com"},
 *   {"name": "LOGIN_INFO", "value": "...", "domain": ".youtube.com"},
 *   {"name": "HSID", "value": "...", "domain": ".youtube.com"},
 *   {"name": "SSID", "value": "...", "domain": ".youtube.com"},
 *   {"name": "APISID", "value": "...", "domain": ".youtube.com"},
 *   {"name": "SAPISID", "value": "...", "domain": ".youtube.com"},
 *   {"name": "SID", "value": "...", "domain": ".youtube.com"}
 * ]
 * 
 * Important cookies: LOGIN_INFO, VISITOR_INFO1_LIVE, YSC, and the auth cookies (HSID, SSID, APISID, SAPISID, SID)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

// Track if cookies are working (to avoid repeated failed attempts)
let cookiesValid = true;
let lastCookieError: string | null = null;

/**
 * Parse cookies from environment variable or request
 * Supports both JSON array format and Netscape cookies.txt format
 */
function getCookiesFromEnv(): Cookie[] {
  try {
    // Try JSON format first
    const cookiesJson = process.env.YOUTUBE_COOKIES_JSON;
    if (cookiesJson) {
      const parsed = JSON.parse(cookiesJson);
      if (Array.isArray(parsed)) {
        return parsed.map((c: any) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.youtube.com',
          path: c.path || '/',
        }));
      }
    }

    // Try Netscape cookies.txt format
    const cookiesTxt = process.env.YOUTUBE_COOKIES_TXT;
    if (cookiesTxt) {
      return parseNetscapeCookies(cookiesTxt);
    }

    return [];
  } catch (error) {
    console.error('Failed to parse cookies from environment:', error);
    return [];
  }
}

/**
 * Parse cookies from request (client-provided)
 */
function getCookiesFromRequest(req: VercelRequest): Cookie[] {
  try {
    // Check for cookies in request body
    if (req.body && Array.isArray(req.body.cookies)) {
      return req.body.cookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.youtube.com',
        path: c.path || '/',
      }));
    }

    // Check for cookies in custom header
    const cookiesHeader = req.headers['x-youtube-cookies'];
    if (cookiesHeader && typeof cookiesHeader === 'string') {
      const parsed = JSON.parse(cookiesHeader);
      if (Array.isArray(parsed)) {
        return parsed.map((c: any) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.youtube.com',
          path: c.path || '/',
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('Failed to parse cookies from request:', error);
    return [];
  }
}

/**
 * Parse Netscape cookies.txt format
 */
function parseNetscapeCookies(content: string): Cookie[] {
  const cookies: Cookie[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Netscape format: domain  flag  path  secure  expiration  name  value
    const parts = trimmed.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        domain: parts[0],
        path: parts[2],
        name: parts[5],
        value: parts[6],
      });
    }
  }

  return cookies;
}

/**
 * Format cookies for Cookie header
 */
function formatCookieHeader(cookies: Cookie[]): string {
  return cookies
    .filter(c => !c.domain || c.domain?.includes('youtube.com') || c.domain?.includes('google.com'))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Merge cookies from multiple sources (env vars and client)
 * Client cookies take precedence
 */
function mergeCookies(envCookies: Cookie[], clientCookies: Cookie[]): Cookie[] {
  const cookieMap = new Map<string, Cookie>();
  
  // Add env cookies first
  for (const cookie of envCookies) {
    cookieMap.set(cookie.name, cookie);
  }
  
  // Override with client cookies
  for (const cookie of clientCookies) {
    cookieMap.set(cookie.name, cookie);
  }
  
  return Array.from(cookieMap.values());
}

/**
 * Get YouTube headers with optional cookies
 */
function getYouTubeHeaders(clientCookies: Cookie[] = []): HeadersInit {
  const envCookies = cookiesValid ? getCookiesFromEnv() : [];
  const allCookies = mergeCookies(envCookies, clientCookies);
  const cookieHeader = allCookies.length > 0 ? formatCookieHeader(allCookies) : '';

  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };

  if (cookieHeader) {
    (headers as Record<string, string>)['Cookie'] = cookieHeader;
  }

  return headers;
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
 * Check if HTML indicates cookie/auth issues
 */
function checkAuthIssues(html: string): { hasIssue: boolean; issue?: string } {
  // Check for specific auth-related messages
  if (html.includes('Sign in to confirm')) {
    return { hasIssue: true, issue: 'SIGN_IN_REQUIRED' };
  }
  if (html.includes('before you continue') || html.includes('consent.youtube.com')) {
    return { hasIssue: true, issue: 'CONSENT_REQUIRED' };
  }
  if (html.includes(' unusual traffic') || html.includes('automated requests')) {
    return { hasIssue: true, issue: 'BOT_DETECTED' };
  }
  if (html.includes('session expired') || html.includes('signed out')) {
    return { hasIssue: true, issue: 'SESSION_EXPIRED' };
  }
  return { hasIssue: false };
}

/**
 * Extract caption tracks from video page HTML
 */
function extractCaptionTracks(html: string): Array<{ baseUrl: string; name: string; languageCode: string }> | null {
  // Check for auth issues first
  const authCheck = checkAuthIssues(html);
  if (authCheck.hasIssue) {
    if (authCheck.issue === 'SESSION_EXPIRED' || authCheck.issue === 'SIGN_IN_REQUIRED') {
      // Mark cookies as invalid to prevent repeated failed attempts
      cookiesValid = false;
      lastCookieError = authCheck.issue;
    }
    throw new Error(`YOUTUBE_AUTH_ERROR: ${authCheck.issue}`);
  }

  if (html.includes('age-restricted') || html.includes('content warning')) {
    throw new Error('Video is age-restricted. Cannot fetch transcript.');
  }
  if (html.includes('bot detection')) {
    throw new Error('YOUTUBE_BOT_DETECTED: YouTube has detected automated access.');
  }

  // Check if we got a valid YouTube page at all
  if (!html.includes('youtube') && !html.includes('ytInitial')) {
    const snippet = html.substring(0, 500);
    console.error('Invalid YouTube response, got:', snippet);
    throw new Error('Invalid response from YouTube (possible redirect or block)');
  }
  
  // Try multiple patterns to find player response
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*({.+?});/,
    /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/,
    /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/,
    /window\.ytInitialPlayerResponse\s*=\s*({.+?});/,
  ];

  let playerResponseStr: string | null = null;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      playerResponseStr = match[1];
      break;
    }
  }

  // Try to find in script tags with JSON (using [\s\S] instead of dotAll flag for compatibility)
  if (!playerResponseStr) {
    const scriptPattern = /<script[^>]*>[\s\S]*?var\s+ytInitialPlayerResponse\s*=\s*({.+?});[\s\S]*?<\/script>/;
    const scriptMatch = html.match(scriptPattern);
    if (scriptMatch) {
      playerResponseStr = scriptMatch[1];
    }
  }

  if (!playerResponseStr) {
    // Log a snippet of the HTML for debugging (check if it's even a YouTube page)
    const snippet = html.substring(0, 800).replace(/\s+/g, ' ');
    console.error('Could not find player response. HTML snippet:', snippet);
    throw new Error('Could not find player response data');
  }

  try {
    const playerResponse = JSON.parse(playerResponseStr);
    
    // Check for playability errors
    const playabilityStatus = playerResponse?.playabilityStatus;
    if (playabilityStatus?.status === 'LOGIN_REQUIRED' || 
        playabilityStatus?.status === 'ERROR' ||
        playabilityStatus?.reason?.includes('bot') ||
        playabilityStatus?.reason?.includes('Sign in')) {
      const reason = playabilityStatus?.reason || 'Video requires sign-in';
      
      // If we have cookies but still got LOGIN_REQUIRED, they might be expired
      const cookies = getCookiesFromEnv();
      if (cookies.length > 0) {
        cookiesValid = false;
        lastCookieError = 'LOGIN_REQUIRED_WITH_COOKIES';
        throw new Error(`YOUTUBE_AUTH_ERROR: Cookies may be expired or invalid. ${reason}`);
      }
      
      throw new Error(`YOUTUBE_BOT_DETECTED: ${reason}`);
    }
    
    if (playabilityStatus?.status !== 'OK' && playabilityStatus?.status !== undefined) {
      const reason = playabilityStatus?.reason || 'Video unavailable';
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
    if (e instanceof Error && (e.message.startsWith('YouTube error') || e.message.startsWith('YOUTUBE_BOT_DETECTED') || e.message.startsWith('YOUTUBE_AUTH_ERROR'))) {
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
 * Try to fetch transcript using innertube API with cookies
 */
async function fetchTranscriptViaInnertube(videoId: string, clientCookies: Cookie[] = []): Promise<{ segments: TranscriptSegment[]; language: string } | null> {
  try {
    // First, get a visitor data token from YouTube's homepage (with cookies)
    const visitorData = await getVisitorData(clientCookies);
    
    const envCookies = getCookiesFromEnv();
    const allCookies = mergeCookies(envCookies, clientCookies);
    const hasCookies = allCookies.length > 0;
    
    const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
    // Prepare headers - include cookies if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20250122.04.00',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
    };

    if (hasCookies) {
      headers['Cookie'] = formatCookieHeader(allCookies);
    }
    
    const response = await fetch(playerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20250122.04.00',
            gl: 'US',
            hl: 'en',
            visitorData: visitorData || undefined,
          },
        },
      }),
    });

    if (!response.ok) {
      console.log('Innertube API returned non-ok status:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Check for playability errors
    const playabilityStatus = data?.playabilityStatus;
    if (playabilityStatus?.status === 'LOGIN_REQUIRED' || 
        playabilityStatus?.status === 'ERROR') {
      console.log('Innertube API playability error:', playabilityStatus);
      
      // If we used cookies and still got LOGIN_REQUIRED, they might be expired
      if (hasCookies && playabilityStatus?.status === 'LOGIN_REQUIRED') {
        cookiesValid = false;
        lastCookieError = 'LOGIN_REQUIRED_WITH_COOKIES';
      }
      
      return null;
    }
    
    const captionTracks = data?.captions?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    const track = captionTracks[0];
    
    // Fetch transcript with cookies if available
    const transcriptHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    if (hasCookies) {
      transcriptHeaders['Cookie'] = formatCookieHeader(allCookies);
    }
    
    const transcriptResponse = await fetch(track.baseUrl, {
      headers: transcriptHeaders,
    });
    
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
 * Get visitor data from YouTube homepage
 */
async function getVisitorData(clientCookies: Cookie[] = []): Promise<string | null> {
  try {
    const headers = getYouTubeHeaders(clientCookies);
    
    const response = await fetch('https://www.youtube.com', {
      headers,
    });
    
    const html = await response.text();
    
    // Check for auth issues
    const authCheck = checkAuthIssues(html);
    if (authCheck.hasIssue && authCheck.issue === 'SESSION_EXPIRED') {
      cookiesValid = false;
      lastCookieError = 'SESSION_EXPIRED';
    }
    
    // Try to extract visitor data from the page
    const visitorMatch = html.match(/"visitorData":"([^"]+)"/);
    if (visitorMatch) {
      return visitorMatch[1];
    }
    
    // Alternative patterns
    const ytcfgMatch = html.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)/);
    if (ytcfgMatch) {
      try {
        const ytcfg = JSON.parse(ytcfgMatch[1]);
        return ytcfg.VISITOR_DATA || null;
      } catch {
        // Ignore parse errors
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get visitor data:', error);
    return null;
  }
}

/**
 * Fetch video page HTML with cookie support
 */
async function fetchVideoPage(videoId: string, clientCookies: Cookie[] = []): Promise<string> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const headers = getYouTubeHeaders(clientCookies);
  
  const response = await fetch(videoUrl, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`);
  }

  return await response.text();
}

/**
 * Fetch transcript from YouTube
 */
async function fetchTranscript(videoId: string, language?: string, clientCookies: Cookie[] = []): Promise<{ segments: TranscriptSegment[]; language: string }> {
  // Merge env and client cookies
  const envCookies = getCookiesFromEnv();
  const allCookies = mergeCookies(envCookies, clientCookies);
  
  if (allCookies.length > 0) {
    console.log(`Using ${allCookies.length} cookies (${clientCookies.length} from client, ${envCookies.length} from env) for YouTube authentication`);
  } else {
    console.log('No cookies configured, using anonymous requests (may be blocked by YouTube)');
  }
  
  // Try innertube API first (more reliable)
  const innertubeResult = await fetchTranscriptViaInnertube(videoId, clientCookies);
  if (innertubeResult) {
    console.log('Successfully fetched transcript via innertube API');
    return innertubeResult;
  }

  // Fallback to page scraping
  console.log('Trying page scraping method...');
  
  // If cookies failed, try once without cookies
  if (!cookiesValid && allCookies.length > 0) {
    console.log('Cookies seem invalid, trying without cookies...');
    cookiesValid = true; // Temporarily re-enable to try without
  }
  
  const html = await fetchVideoPage(videoId, clientCookies);
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

  // Fetch transcript with cookies
  const transcriptHeaders: Record<string, string> = {};
  if (allCookies.length > 0) {
    transcriptHeaders['Cookie'] = formatCookieHeader(allCookies);
    transcriptHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  }

  const transcriptResponse = await fetch(selectedTrack.baseUrl, {
    headers: transcriptHeaders,
  });
  
  if (!transcriptResponse.ok) {
    throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`);
  }

  const transcriptXml = await transcriptResponse.text();
  const segments = parseTranscriptXml(transcriptXml);

  return { segments, language: selectedTrack.languageCode };
}

/**
 * Get status information about cookie authentication
 */
function getAuthStatus(): { 
  configured: boolean; 
  valid: boolean; 
  cookieCount: number;
  lastError: string | null;
} {
  const cookies = getCookiesFromEnv();
  return {
    configured: cookies.length > 0,
    valid: cookiesValid,
    cookieCount: cookies.length,
    lastError: lastCookieError,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.query.status === 'true') {
    const clientCookies = getCookiesFromRequest(req);
    const hasClientCookies = clientCookies.length > 0;
    
    return res.status(200).json({
      success: true,
      auth: {
        ...getAuthStatus(),
        clientCookies: hasClientCookies,
        clientCookieCount: clientCookies.length,
      },
      message: cookiesValid || hasClientCookies
        ? 'Cookie authentication is available' 
        : 'No cookie authentication configured',
    });
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

    // Get client-provided cookies from request body or header
    const clientCookies = getCookiesFromRequest(req);
    if (clientCookies.length > 0) {
      console.log(`Received ${clientCookies.length} cookies from client`);
    }

    const lang = language && typeof language === 'string' ? language : undefined;
    const result = await fetchTranscript(targetVideoId, lang, clientCookies);

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
    
    if (errorMessage.includes('YOUTUBE_AUTH_ERROR')) {
      const clientCookies = getCookiesFromRequest(req);
      return res.status(503).json({
        success: false,
        error: 'YouTube authentication failed. Your cookies may have expired.',
        code: 'YOUTUBE_AUTH_ERROR',
        details: errorMessage,
        auth: {
          clientCookies: clientCookies.length > 0,
          clientCookieCount: clientCookies.length,
          message: clientCookies.length > 0 
            ? 'Your cookies may have expired. Try uploading fresh cookies from your browser.'
            : 'To fix this, upload your YouTube cookies in the app settings.',
        },
      });
    }
    
    if (errorMessage.includes('YOUTUBE_BOT_DETECTED')) {
      const clientCookies = getCookiesFromRequest(req);
      return res.status(503).json({
        success: false,
        error: 'YouTube has detected automated access and is requiring verification.',
        code: 'YOUTUBE_BOT_DETECTED',
        auth: {
          clientCookies: clientCookies.length > 0,
          clientCookieCount: clientCookies.length,
          message: clientCookies.length > 0
            ? 'Your cookies may not be working. Try uploading fresh cookies.'
            : 'To avoid this, upload your YouTube cookies in the app settings.',
        },
      });
    }
    
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
