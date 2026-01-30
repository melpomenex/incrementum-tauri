/**
 * YouTube cookie management utilities
 *
 * Cookies are stored in localStorage and sent with transcript API requests
 * to bypass YouTube bot detection.
 */

export interface YouTubeCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

const YOUTUBE_COOKIES_KEY = 'incrementum_youtube_cookies';

/**
 * Get stored YouTube cookies from localStorage
 */
export function getStoredYouTubeCookies(): YouTubeCookie[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(YOUTUBE_COOKIES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[YouTubeCookies] Failed to parse stored cookies:', error);
  }

  return [];
}

/**
 * Store YouTube cookies in localStorage
 */
export function storeYouTubeCookies(cookies: YouTubeCookie[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(YOUTUBE_COOKIES_KEY, JSON.stringify(cookies));
  } catch (error) {
    console.error('[YouTubeCookies] Failed to store cookies:', error);
  }
}

/**
 * Clear stored YouTube cookies
 */
export function clearYouTubeCookies(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(YOUTUBE_COOKIES_KEY);
}

/**
 * Check if cookies are stored
 */
export function hasYouTubeCookies(): boolean {
  return getStoredYouTubeCookies().length > 0;
}

/**
 * Get cookie count
 */
export function getYouTubeCookieCount(): number {
  return getStoredYouTubeCookies().length;
}

/**
 * Parse cookies from JSON string
 * Supports multiple formats:
 * - JSON array of cookie objects
 * - JSON object with cookie names as keys
 * - Netscape cookies.txt format (simplified)
 */
export function parseCookiesFromString(cookieString: string): YouTubeCookie[] {
  // Try JSON array format first
  try {
    const parsed = JSON.parse(cookieString);
    if (Array.isArray(parsed)) {
      return parsed.filter((c: any) => c.name && c.value).map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.youtube.com',
        path: c.path || '/',
      }));
    }
  } catch {
    // Not JSON array, continue to other formats
  }

  // Try JSON object format
  try {
    const parsed = JSON.parse(cookieString);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .filter(([_, value]) => typeof value === 'string')
        .map(([name, value]) => ({
          name,
          value: value as string,
          domain: '.youtube.com',
          path: '/',
        }));
    }
  } catch {
    // Not JSON object, continue
  }

  // Try Netscape cookies.txt format (simplified)
  // Format: domain \t flag \t path \t secure \t expiration \t name \t value
  const lines = cookieString.split('\n');
  const cookies: YouTubeCookie[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

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
export function formatCookiesForHeader(cookies: YouTubeCookie[]): string {
  return cookies
    .filter(c => !c.domain || c.domain?.includes('youtube.com') || c.domain?.includes('google.com'))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Validate cookies by checking required YouTube cookies
 */
export function validateYouTubeCookies(cookies: YouTubeCookie[]): {
  valid: boolean;
  missing: string[];
  hasAuth: boolean;
} {
  const cookieNames = new Set(cookies.map(c => c.name));

  // Important cookies for YouTube authentication
  const requiredCookies = ['VISITOR_INFO1_LIVE', 'YSC'];
  const authCookies = ['LOGIN_INFO', 'HSID', 'SSID', 'APISID', 'SAPISID', 'SID'];

  const missing = requiredCookies.filter(c => !cookieNames.has(c));
  const hasAuth = authCookies.some(c => cookieNames.has(c));

  return {
    valid: missing.length === 0,
    missing,
    hasAuth,
  };
}

/**
 * Test cookies by calling the transcript API status endpoint
 */
export async function testYouTubeCookies(cookies: YouTubeCookie[]): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const response = await fetch('/api/youtube/transcript?status=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cookies }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: data.message || 'Cookies are working!',
        details: data.auth,
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to validate cookies',
        details: data.auth,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to API',
    };
  }
}

/**
 * Get cookies formatted for API requests
 */
export function getCookiesForApi(): YouTubeCookie[] {
  return getStoredYouTubeCookies();
}
