/**
 * YouTube Cookie Management
 * Stores and retrieves YouTube authentication cookies in IndexedDB
 * Allows users to use their own YouTube account for transcript fetching
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface YouTubeCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number;
}

interface YouTubeCookiesDB extends DBSchema {
  cookies: {
    key: string;
    value: YouTubeCookie;
  };
  metadata: {
    key: 'uploadedAt' | 'cookieCount';
    value: { key: string; value: number | string };
  };
}

const DB_NAME = 'youtube-auth';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<YouTubeCookiesDB>> | null = null;

function getDB(): Promise<IDBPDatabase<YouTubeCookiesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<YouTubeCookiesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cookies')) {
          db.createObjectStore('cookies', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Parse cookies from various export formats
 */
export function parseCookies(input: string): YouTubeCookie[] {
  const cookies: YouTubeCookie[] = [];
  const trimmed = input.trim();

  // Try JSON format first
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((c: any) => ({
        name: c.name || c.Name,
        value: c.value || c.Value,
        domain: c.domain || c.Domain || '.youtube.com',
        path: c.path || c.Path || '/',
        secure: c.secure ?? c.Secure ?? true,
        httpOnly: c.httpOnly ?? c.HttpOnly ?? false,
        sameSite: c.sameSite || c.SameSite,
        expirationDate: c.expirationDate || c.ExpirationDate,
      }));
    }
  } catch {
    // Not JSON, try other formats
  }

  // Try Netscape cookies.txt format
  const lines = trimmed.split('\n');
  let isNetscapeFormat = false;

  for (const line of lines) {
    const l = line.trim();
    if (!l || l.startsWith('#')) {
      if (l.includes('Netscape HTTP Cookie File')) {
        isNetscapeFormat = true;
      }
      continue;
    }

    const parts = l.split('\t');
    if (parts.length >= 7) {
      isNetscapeFormat = true;
      cookies.push({
        domain: parts[0],
        path: parts[2],
        secure: parts[3] === 'TRUE',
        expirationDate: parts[4] !== '0' ? parseInt(parts[4]) : undefined,
        name: parts[5],
        value: parts[6],
      });
    }
  }

  if (isNetscapeFormat && cookies.length > 0) {
    return cookies;
  }

  // Try simple "name=value; name2=value2" format
  const simplePairs = trimmed.split(';');
  for (const pair of simplePairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name && valueParts.length > 0) {
      cookies.push({
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain: '.youtube.com',
        path: '/',
      });
    }
  }

  return cookies;
}

/**
 * Filter and validate YouTube cookies
 */
export function filterYouTubeCookies(cookies: YouTubeCookie[]): YouTubeCookie[] {
  const importantCookies = [
    'LOGIN_INFO',
    'VISITOR_INFO1_LIVE',
    'YSC',
    'HSID',
    'SSID',
    'APISID',
    'SAPISID',
    'SID',
    'CONSENT',
    'SIDCC',
    '__Secure-1PSID',
    '__Secure-3PSID',
    '__Secure-1PAPISID',
    '__Secure-3PAPISID',
    '__Secure-1PSIDCC',
    '__Secure-3PSIDCC',
  ];

  return cookies.filter(c => {
    // Keep cookies for youtube.com domains
    const isYouTubeDomain = !c.domain || 
      c.domain.includes('youtube.com') || 
      c.domain.includes('google.com');
    
    // Prioritize important cookies but keep others too
    return isYouTubeDomain;
  }).map(c => ({
    ...c,
    domain: c.domain || '.youtube.com',
    path: c.path || '/',
  }));
}

/**
 * Save cookies to IndexedDB
 */
export async function saveCookies(cookies: YouTubeCookie[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['cookies', 'metadata'], 'readwrite');
  const cookieStore = tx.objectStore('cookies');
  const metaStore = tx.objectStore('metadata');

  // Clear existing cookies
  await cookieStore.clear();

  // Add new cookies
  const filtered = filterYouTubeCookies(cookies);
  for (const cookie of filtered) {
    await cookieStore.put(cookie);
  }

  // Update metadata
  await metaStore.put({ key: 'uploadedAt', value: Date.now() });
  await metaStore.put({ key: 'cookieCount', value: filtered.length });

  await tx.done;
}

/**
 * Get all stored cookies
 */
export async function getCookies(): Promise<YouTubeCookie[]> {
  try {
    const db = await getDB();
    return await db.getAll('cookies');
  } catch {
    return [];
  }
}

/**
 * Get cookies formatted for API requests
 */
export async function getCookiesForApi(): Promise<YouTubeCookie[]> {
  const cookies = await getCookies();
  
  // Filter to essential cookies only to reduce payload size
  const essentialCookies = [
    'LOGIN_INFO',
    'VISITOR_INFO1_LIVE', 
    'YSC',
    'HSID',
    'SSID',
    'APISID',
    'SAPISID',
    'SID',
    'CONSENT',
  ];

  return cookies.filter(c => 
    essentialCookies.includes(c.name) ||
    c.name.startsWith('__Secure-')
  );
}

/**
 * Check if cookies are stored
 */
export async function hasCookies(): Promise<boolean> {
  try {
    const cookies = await getCookies();
    return cookies.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get metadata about stored cookies
 */
export async function getCookieMetadata(): Promise<{
  hasCookies: boolean;
  count: number;
  uploadedAt: number | null;
}> {
  try {
    const db = await getDB();
    const count = await db.count('cookies');
    const uploadedAt = await db.get('metadata', 'uploadedAt');
    
    return {
      hasCookies: count > 0,
      count,
      uploadedAt: uploadedAt?.value as number || null,
    };
  } catch {
    return {
      hasCookies: false,
      count: 0,
      uploadedAt: null,
    };
  }
}

/**
 * Clear stored cookies
 */
export async function clearCookies(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['cookies', 'metadata'], 'readwrite');
  await tx.objectStore('cookies').clear();
  await tx.objectStore('metadata').clear();
  await tx.done;
}

/**
 * Validate that cookies look correct
 */
export function validateCookies(cookies: YouTubeCookie[]): { valid: boolean; message: string } {
  if (cookies.length === 0) {
    return { valid: false, message: 'No cookies found' };
  }

  const hasLoginInfo = cookies.some(c => c.name === 'LOGIN_INFO');
  const hasVisitorInfo = cookies.some(c => c.name === 'VISITOR_INFO1_LIVE');
  const hasAuthCookie = cookies.some(c => 
    ['HSID', 'SSID', 'APISID', 'SAPISID', 'SID'].includes(c.name)
  );

  if (!hasLoginInfo && !hasAuthCookie) {
    return { 
      valid: false, 
      message: 'Missing authentication cookies. Make sure you\'re logged into YouTube when exporting.' 
    };
  }

  if (!hasVisitorInfo) {
    return { 
      valid: true, 
      message: `Found ${cookies.length} cookies. Warning: Missing VISITOR_INFO1_LIVE (may have reduced success rate).` 
    };
  }

  return { 
    valid: true, 
    message: `Found ${cookies.length} valid YouTube cookies.` 
  };
}
