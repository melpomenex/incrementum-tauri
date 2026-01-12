/**
 * Sync client for communicating with the sync server
 * Handles authentication, push/pull operations, and conflict resolution
 */

import * as db from './database.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface AuthResponse {
    token: string;
    user: { id: string; email: string };
}

interface SyncPullResponse {
    documents: db.Document[];
    extracts: db.Extract[];
    learningItems: db.LearningItem[];
    syncVersion: number;
}

interface SyncPushResponse {
    success: boolean;
    syncVersion: number;
    pushed: {
        documents: number;
        extracts: number;
        learningItems: number;
    };
}

// Storage keys
const TOKEN_KEY = 'incrementum_auth_token';
const USER_KEY = 'incrementum_user';
const LAST_SYNC_KEY = 'incrementum_last_sync_version';

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user
 */
export function getUser(): { id: string; email: string } | null {
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
 * Make authenticated API request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error?.message || error.message || 'API request failed');
    }

    return response.json();
}

/**
 * Register a new account
 */
export async function register(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    return response;
}

/**
 * Login to existing account
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    return response;
}

/**
 * Logout and clear stored credentials
 */
export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Verify current auth token
 */
export async function verifyAuth(): Promise<boolean> {
    try {
        await apiRequest('/auth/verify');
        return true;
    } catch {
        logout();
        return false;
    }
}

/**
 * Get last sync version
 */
function getLastSyncVersion(): number {
    const version = localStorage.getItem(LAST_SYNC_KEY);
    return version ? parseInt(version, 10) : 0;
}

/**
 * Set last sync version
 */
function setLastSyncVersion(version: number): void {
    localStorage.setItem(LAST_SYNC_KEY, version.toString());
}

/**
 * Pull changes from server
 */
export async function pullChanges(): Promise<SyncPullResponse> {
    const since = getLastSyncVersion();
    const response = await apiRequest<SyncPullResponse>(`/sync/pull?since=${since}`);

    // Apply changes to local database
    if (response.documents.length > 0) {
        await db.bulkPutDocuments(response.documents);
    }
    if (response.extracts.length > 0) {
        await db.bulkPutExtracts(response.extracts);
    }
    if (response.learningItems.length > 0) {
        await db.bulkPutLearningItems(response.learningItems);
    }

    // Update sync version
    setLastSyncVersion(response.syncVersion);

    return response;
}

/**
 * Push local changes to server
 */
export async function pushChanges(): Promise<SyncPushResponse> {
    const since = getLastSyncVersion();

    // Get local changes
    const documents = await db.getChangedDocuments(since);
    const extracts = await db.getChangedExtracts(since);
    const learningItems = await db.getChangedLearningItems(since);

    // If no changes, skip push
    if (documents.length === 0 && extracts.length === 0 && learningItems.length === 0) {
        return {
            success: true,
            syncVersion: since,
            pushed: { documents: 0, extracts: 0, learningItems: 0 },
        };
    }

    const response = await apiRequest<SyncPushResponse>('/sync/push', {
        method: 'POST',
        body: JSON.stringify({ documents, extracts, learningItems }),
    });

    // Update sync version
    setLastSyncVersion(response.syncVersion);

    return response;
}

/**
 * Full sync (push then pull)
 */
export async function sync(): Promise<{
    pushed: SyncPushResponse;
    pulled: SyncPullResponse;
}> {
    // Push local changes first
    const pushed = await pushChanges();

    // Then pull remote changes
    const pulled = await pullChanges();

    return { pushed, pulled };
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
    lastSyncVersion: number;
    lastSyncAt: string | null;
}> {
    return apiRequest('/sync/status');
}

/**
 * Upload a file to the server
 */
export async function uploadFile(file: File): Promise<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
}> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/files`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) {
        throw new Error('File upload failed');
    }

    return response.json();
}

/**
 * Download a file from the server
 */
export async function downloadFile(fileId: string): Promise<Blob> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
        throw new Error('File download failed');
    }

    return response.blob();
}

// Export sync state for UI
export interface SyncState {
    isSyncing: boolean;
    lastSyncTime: Date | null;
    error: string | null;
}

let syncState: SyncState = {
    isSyncing: false,
    lastSyncTime: null,
    error: null,
};

const syncListeners: ((state: SyncState) => void)[] = [];

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
    syncListeners.push(listener);
    listener(syncState);
    return () => {
        const index = syncListeners.indexOf(listener);
        if (index > -1) syncListeners.splice(index, 1);
    };
}

function updateSyncState(updates: Partial<SyncState>): void {
    syncState = { ...syncState, ...updates };
    syncListeners.forEach((listener) => listener(syncState));
}

/**
 * Trigger a sync with UI state updates
 */
export async function triggerSync(): Promise<void> {
    if (!isAuthenticated()) {
        updateSyncState({ error: 'Not authenticated' });
        return;
    }

    if (syncState.isSyncing) {
        return; // Already syncing
    }

    updateSyncState({ isSyncing: true, error: null });

    try {
        await sync();
        updateSyncState({
            isSyncing: false,
            lastSyncTime: new Date(),
            error: null,
        });
    } catch (error) {
        updateSyncState({
            isSyncing: false,
            error: error instanceof Error ? error.message : 'Sync failed',
        });
    }
}

// Auto-sync on visibility change (when tab becomes visible)
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isAuthenticated()) {
            triggerSync();
        }
    });
}
