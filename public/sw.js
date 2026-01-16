/**
 * Incrementum Service Worker
 *
 * Provides offline support, caching strategies, and background sync
 * for the Progressive Web App (PWA) version of Incrementum.
 */

const VERSION = 'incrementum-v2';
const CACHE_NAME = `${VERSION}-main`;
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;

// Cache durations (in seconds)
const CACHE_DURATION = {
  STATIC: 30 * 24 * 60 * 60, // 30 days
  API: 5 * 60, // 5 minutes
  IMAGES: 7 * 24 * 60 * 60, // 7 days
  DOCUMENTS: 24 * 60 * 60, // 1 day
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  '/api/documents',
  '/api/rss',
  '/api/analytics',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker:', VERSION);

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      // Pre-cache essential API data
      caches.open(API_CACHE).then((cache) => {
        // Optionally preload some data
        return cache.addAll([
          '/api/documents?limit=20',
          '/api/analytics/dashboard',
        ]);
      }),
    ]).then(() => {
      // Activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker:', VERSION);

  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.startsWith(VERSION))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests with special strategy
  if (url.pathname.startsWith('/api')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle image requests with longer cache
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle all other requests with cache-first strategy
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with stale-while-revalidate strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this is a cacheable API endpoint
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern =>
    url.pathname.startsWith(pattern)
  );

  if (!isCacheable) {
    // Non-cacheable API: network only with error handling
    try {
      return await fetch(request);
    } catch (error) {
      console.error('[SW] API request failed:', error);
      return new Response(
        JSON.stringify({
          error: 'Network unavailable',
          message: 'Could not connect to server. Please check your internet connection.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Cacheable API: stale-while-revalidate
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      // Only cache successful responses
      if (response && response.status === 200) {
        // Clone before caching since response can only be read once
        const responseClone = response.clone();
        cache.put(request, responseClone);
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] API fetch failed:', error);
      // If network fails and we have a cached response, use it
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    });

  // Return cached response immediately, update in background
  if (cachedResponse) {
    return cachedResponse;
  }

  // No cache, wait for network
  return fetchPromise;
}

/**
 * Handle navigation requests (SPA routing)
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const response = await fetch(request);

    if (response && response.status === 200) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Navigation fetch failed, trying cache:', error);

    // Fall back to cached index.html for offline SPA
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache available, show offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Incrementum</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #0a0a0a;
              color: #e4e4e7;
              text-align: center;
              padding: 20px;
            }
            .offline-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 { margin: 0 0 10px; }
            p { margin: 0 0 20px; opacity: 0.8; }
            button {
              background: #6366f1;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>You're Offline</h1>
          <p>Check your internet connection to continue learning.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </body>
      </html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

/**
 * Handle image requests with aggressive caching
 */
async function handleImageRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cache is still valid (7 days)
    const cacheDate = cachedResponse.headers.get('date');
    if (cacheDate) {
      const age = (Date.now() - new Date(cacheDate).getTime()) / 1000;
      if (age < CACHE_DURATION.IMAGES) {
        return cachedResponse;
      }
    }
  }

  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      // Cache images with long expiration
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    // Return cached image even if expired
    return cachedResponse || new Response(null, { status: 404 });
  }
}

/**
 * Handle static requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      // Cache successful responses
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.error('[SW] Static fetch failed:', error);
    return new Response('Resource not available offline', { status: 404 });
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-review-progress') {
    event.waitUntil(syncReviewProgress());
  }
});

/**
 * Sync review progress when back online
 */
async function syncReviewProgress() {
  try {
    // Get pending sync data from IndexedDB
    const pendingSync = await getPendingSyncData();

    // Send to server
    for (const item of pendingSync) {
      await fetch('/api/review/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      // Remove from pending after successful sync
      await removePendingSyncData(item.id);
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Get pending sync data from IndexedDB
 */
async function getPendingSyncData() {
  // This would interact with IndexedDB to get offline actions
  // For now, return empty array
  return [];
}

/**
 * Remove pending sync data after successful sync
 */
async function removePendingSyncData(id) {
  // This would remove the item from IndexedDB
  console.log('[SW] Removing synced item:', id);
}

/**
 * Message handler for manual cache control
 */
self.addEventListener('message', (event) => {
  const { action, data } = event.data;

  switch (action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;

    case 'cache-documents':
      event.waitUntil(cacheDocuments(data));
      break;

    case 'clear-cache':
      event.waitUntil(clearCache());
      break;

    case 'get-version':
      event.ports[0].postMessage({ version: VERSION });
      break;
  }
});

/**
 * Cache specific documents for offline reading
 */
async function cacheDocuments(documentIds) {
  const cache = await caches.open(API_CACHE);

  for (const id of documentIds) {
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (response.ok) {
        await cache.put(`/api/documents/${id}`, response);
      }
    } catch (error) {
      console.error(`[SW] Failed to cache document ${id}:`, error);
    }
  }
}

/**
 * Clear all caches
 */
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

// Log when service worker is fully loaded
self.addEventListener('controllerchange', () => {
  console.log('[SW] Controller changed, new service worker is active');
});
