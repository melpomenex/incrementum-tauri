/**
 * Queue Session Memory
 * 
 * Tracks which documents have been viewed in the current session
 * to avoid showing the same items repeatedly when restarting the queue.
 * Uses sessionStorage for persistence across refreshes.
 */

const SESSION_KEY = 'incrementum-queue-session';

export interface SessionViewedItem {
  id: string;
  viewedAt: string; // ISO timestamp
  wasRated: boolean;
}

export interface QueueSession {
  items: SessionViewedItem[];
  startedAt: string;
}

/**
 * Get or create the current queue session
 */
export function getQueueSession(): QueueSession {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore parse errors
  }
  
  // Create new session
  const session: QueueSession = {
    items: [],
    startedAt: new Date().toISOString(),
  };
  saveQueueSession(session);
  return session;
}

/**
 * Save the queue session
 */
export function saveQueueSession(session: QueueSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Mark an item as viewed in the current session
 */
export function markItemViewed(itemId: string, wasRated: boolean = false): void {
  const session = getQueueSession();
  
  // Remove if already exists (update timestamp)
  session.items = session.items.filter(item => item.id !== itemId);
  
  // Add to end
  session.items.push({
    id: itemId,
    viewedAt: new Date().toISOString(),
    wasRated,
  });
  
  saveQueueSession(session);
}

/**
 * Check if an item was viewed in the current session
 */
export function wasItemViewed(itemId: string): boolean {
  const session = getQueueSession();
  return session.items.some(item => item.id === itemId);
}

/**
 * Get recently viewed item IDs (within the last N items)
 */
export function getRecentlyViewedIds(count: number = 10): string[] {
  const session = getQueueSession();
  return session.items
    .slice(-count)
    .map(item => item.id);
}

/**
 * Get unrated items from this session (items user saw but didn't rate)
 */
export function getUnratedViewedItems(): string[] {
  const session = getQueueSession();
  return session.items
    .filter(item => !item.wasRated)
    .map(item => item.id);
}

/**
 * Clear the queue session (e.g., when explicitly requested by user)
 */
export function clearQueueSession(): void {
  const session: QueueSession = {
    items: [],
    startedAt: new Date().toISOString(),
  };
  saveQueueSession(session);
}

/**
 * Reset session if it's from a previous day (optional auto-cleanup)
 */
export function resetSessionIfStale(): boolean {
  const session = getQueueSession();
  const sessionDate = new Date(session.startedAt).toDateString();
  const today = new Date().toDateString();
  
  if (sessionDate !== today) {
    clearQueueSession();
    return true;
  }
  return false;
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalViewed: number;
  totalRated: number;
  unratedCount: number;
  sessionStarted: string;
} {
  const session = getQueueSession();
  const rated = session.items.filter(item => item.wasRated).length;
  
  return {
    totalViewed: session.items.length,
    totalRated: rated,
    unratedCount: session.items.length - rated,
    sessionStarted: session.startedAt,
  };
}
