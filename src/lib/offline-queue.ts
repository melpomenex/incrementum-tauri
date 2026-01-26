/**
 * Enhanced sync client with offline queue and dual-connection mode
 * Handles both local server (localhost:8766) and cloud API (readsync.org)
 */

import * as db from './database.js';

const LOCAL_SERVER_URL = 'http://127.0.0.1:8766';
const CLOUD_API_BASE = import.meta.env.VITE_API_URL || 'https://readsync.org/api';

// Connection mode: 'local-only', 'cloud-only', 'dual' (try local first, fallback to cloud)
type ConnectionMode = 'local-only' | 'cloud-only' | 'dual';

interface QueuedRequest {
  id: string;
  timestamp: number;
  endpoint: string;
  options: RequestInit;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  maxRetries: number;
}

interface OfflineQueueState {
  requests: QueuedRequest[];
  isOnline: boolean;
  connectionMode: ConnectionMode;
  localServerAvailable: boolean;
  cloudAvailable: boolean;
}

const QUEUE_STORAGE_KEY = 'incrementum_offline_queue';
const CONNECTION_MODE_KEY = 'incrementum_connection_mode';

// Storage keys for auth
const TOKEN_KEY = 'incrementum_auth_token';
const USER_KEY = 'incrementum_user';

/**
 * Get stored auth token
 */
function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user
 */
function getUser(): { id: string; email: string; subscriptionTier: string } | null {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Offline queue manager
 */
class OfflineQueueManager {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private listeners: ((state: OfflineQueueState) => void)[] = [];

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  private setupOnlineListener(): void {
    const handleOnline = () => {
      console.log('[OfflineQueue] Browser online, processing queue...');
      this.processQueue();
    };

    const handleOffline = () => {
      console.log('[OfflineQueue] Browser offline');
      this.notifyState({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  subscribe(listener: (state: OfflineQueueState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyState(updates: Partial<OfflineQueueState>): void {
    const state = this.getState();
    const updatedState = { ...state, ...updates };
    this.listeners.forEach((listener) => listener(updatedState));
  }

  private getState(): OfflineQueueState {
    return {
      requests: this.queue,
      isOnline: navigator.onLine,
      connectionMode: this.getConnectionMode(),
      localServerAvailable: true, // Will be detected
      cloudAvailable: isAuthenticated(),
    };
  }

  private getConnectionMode(): ConnectionMode {
    const stored = localStorage.getItem(CONNECTION_MODE_KEY);
    if (stored === 'local-only' || stored === 'cloud-only' || stored === 'dual') {
      return stored;
    }
    return 'dual'; // Default mode
  }

  /**
   * Add a request to the offline queue
   */
  async enqueue(
    endpoint: string,
    options: RequestInit,
    priority: QueuedRequest['priority'] = 'normal'
  ): Promise<void> {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      endpoint,
      options,
      priority,
      retries: 0,
      maxRetries: priority === 'high' ? 5 : 3,
    };

    this.queue.push(request);
    this.saveQueue();
    this.notifyState({});

    // Try to process immediately if online
    if (navigator.onLine) {
      await this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.processing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests`);

    try {
      const connectionMode = this.getConnectionMode();

      // Sort by priority and timestamp
      const sortedQueue = [...this.queue].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp; // Older requests first
      });

      for (const request of sortedQueue) {
        if (!navigator.onLine) break;

        try {
          await this.executeRequest(request, connectionMode);
          // Remove successful request from queue
          this.queue = this.queue.filter((r) => r.id !== request.id);
          this.saveQueue();
          this.notifyState({});
        } catch (error) {
          console.error(`[OfflineQueue] Failed to process request ${request.id}:`, error);
          request.retries++;

          // Remove request if max retries exceeded
          if (request.retries >= request.maxRetries) {
            console.error(`[OfflineQueue] Max retries exceeded for request ${request.id}, removing`);
            this.queue = this.queue.filter((r) => r.id !== request.id);
            this.saveQueue();
          }
        }
      }
    } finally {
      this.processing = false;
      this.notifyState({});
    }
  }

  /**
   * Execute a single request with dual-connection mode
   */
  private async executeRequest(
    request: QueuedRequest,
    connectionMode: ConnectionMode
  ): Promise<Response> {
    const { endpoint, options } = request;

    // Determine which endpoints to try based on connection mode
    const attempts: Array<{ url: string; isLocal: boolean }> = [];

    if (connectionMode === 'local-only' || connectionMode === 'dual') {
      // Try local server for extension requests
      if (endpoint.startsWith('/')) {
        attempts.push({ url: LOCAL_SERVER_URL + endpoint, isLocal: true });
      }
    }

    if (connectionMode === 'cloud-only' || connectionMode === 'dual') {
      // Try cloud API
      attempts.push({ url: CLOUD_API_BASE + endpoint, isLocal: false });
    }

    // Try each endpoint until one succeeds
    for (const attempt of attempts) {
      try {
        // Check if local server is available (skip health check for cloud)
        if (attempt.isLocal) {
          const isLocalAvailable = await this.checkLocalServer();
          if (!isLocalAvailable) {
            console.log(`[DualConnection] Local server unavailable, skipping`);
            continue;
          }
        }

        // Add auth header for cloud requests
        const augmentedOptions: RequestInit = {
          ...options,
          headers: {
            ...(options.headers as Record<string, string>),
            ...(attempt.isLocal ? {} : this.getAuthHeaders()),
          },
        };

        const response = await fetch(attempt.url, augmentedOptions);

        if (response.ok) {
          console.log(`[DualConnection] Success via ${attempt.isLocal ? 'local' : 'cloud'}: ${endpoint}`);
          return response;
        }

        // If this was our preferred attempt and it failed, continue to fallback
        console.warn(`[DualConnection] Failed via ${attempt.isLocal ? 'local' : 'cloud'}: ${response.status}`);
      } catch (error) {
        console.warn(`[DualConnection] Error via ${attempt.isLocal ? 'local' : 'cloud'}:`, error);
        // Continue to next attempt
      }
    }

    throw new Error(`All connection attempts failed for ${endpoint}`);
  }

  /**
   * Check if local server is available
   */
  private async checkLocalServer(): Promise<boolean> {
    try {
      const response = await fetch(`${LOCAL_SERVER_URL}/`, {
        method: 'POST',
        body: JSON.stringify({ test: true }),
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get auth headers for cloud requests
   */
  private getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      total: this.queue.length,
      byPriority: {
        high: this.queue.filter((r) => r.priority === 'high').length,
        normal: this.queue.filter((r) => r.priority === 'normal').length,
        low: this.queue.filter((r) => r.priority === 'low').length,
      },
      processing: this.processing,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyState({});
  }
}

// Global queue manager instance
const queueManager = new OfflineQueueManager();

/**
 * Dual-connection mode fetch wrapper
 * Automatically tries local server first, falls back to cloud API
 */
export async function dualFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const connectionMode = queueManager['getConnectionMode']();

  // For extension endpoints, try local first
  if (endpoint.startsWith('/') && (connectionMode === 'local-only' || connectionMode === 'dual')) {
    try {
      const isLocalAvailable = await queueManager['checkLocalServer']();
      if (isLocalAvailable) {
        const response = await fetch(LOCAL_SERVER_URL + endpoint, options);
        if (response.ok) {
          console.log(`[DualConnection] Used local server for: ${endpoint}`);
          return response;
        }
      }
    } catch (error) {
      console.warn(`[DualConnection] Local server failed:`, error);
    }
  }

  // Fall back to cloud or use cloud directly
  if (connectionMode === 'cloud-only' || connectionMode === 'dual') {
    const cloudUrl = endpoint.startsWith('/') ? CLOUD_API_BASE + endpoint : endpoint;
    const cloudOptions = {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        ...queueManager['getAuthHeaders'](),
      },
    };
    console.log(`[DualConnection] Using cloud API for: ${endpoint}`);
    return fetch(cloudUrl, cloudOptions);
  }

  // Local-only mode but local unavailable - queue the request
  console.warn(`[DualConnection] No connection available, queuing: ${endpoint}`);
  await queueManager['enqueue'](endpoint, options);
  throw new Error('No connection available');
}

/**
 * Send content to Incrementum (from browser extension)
 * Automatically handles offline queue and dual-connection mode
 */
export async function sendToIncrementum(
  type: 'page' | 'extract' | 'video',
  data: {
    url: string;
    title: string;
    text?: string;
    html_content?: string;
    source?: string;
    timestamp?: string;
    context?: string;
    tags?: string[];
    priority?: number;
    analysis?: any;
    fsrs_data?: any;
    test?: boolean;
  }
): Promise<{ success: boolean; document_id?: string; extract_id?: string; error?: string }> {
  const payload = {
    ...data,
    type,
  };

  try {
    const response = await dualFetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[Extension] Content sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[Extension] Failed to send content:', error);
    // Request was queued automatically by dualFetch
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send content',
    };
  }
}

/**
 * Subscribe to offline queue state changes
 */
export function subscribeOfflineQueue(
  listener: (state: OfflineQueueState) => void
): () => void {
  return queueManager.subscribe(listener);
}

/**
 * Get connection mode
 */
export function getConnectionMode(): ConnectionMode {
  return queueManager['getConnectionMode']();
}

/**
 * Set connection mode
 */
export function setConnectionMode(mode: ConnectionMode): void {
  localStorage.setItem(CONNECTION_MODE_KEY, mode);
  console.log('[DualConnection] Connection mode changed to:', mode);
  queueManager.notifyState({ connectionMode: mode });
}

/**
 * Manually trigger queue processing
 */
export async function processOfflineQueue(): Promise<void> {
  await queueManager.processQueue();
}

/**
 * Get offline queue statistics
 */
export function getOfflineQueueStats() {
  return queueManager.getStats();
}

/**
 * Clear offline queue
 */
export function clearOfflineQueue(): void {
  queueManager.clear();
}

// Re-export sync functions from original sync-client
export * from './sync-client.js';
