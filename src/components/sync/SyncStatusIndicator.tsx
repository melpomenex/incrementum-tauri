/**
 * Sync Status Indicator - shows sync state in the UI
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check, LogIn } from 'lucide-react';
import * as syncClient from '../../lib/sync-client';
import { LoginModal } from '../auth/LoginModal';
import { isTauri } from '../../lib/tauri';

export function SyncStatusIndicator() {
    const [syncState, setSyncState] = useState<syncClient.SyncState>({
        isSyncing: false,
        lastSyncTime: null,
        error: null,
    });
    const [isAuthenticated, setIsAuthenticated] = useState(syncClient.isAuthenticated());
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [user, setUser] = useState(syncClient.getUser());

    useEffect(() => {
        // Subscribe to sync state changes
        const unsubscribe = syncClient.subscribeSyncState(setSyncState);
        return unsubscribe;
    }, []);

    const handleSync = async () => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        await syncClient.triggerSync();
    };

    const handleAuthenticated = () => {
        setIsAuthenticated(true);
        setUser(syncClient.getUser());
        // Trigger initial sync after login
        syncClient.triggerSync();
    };

    const handleLogout = () => {
        syncClient.logout();
        setIsAuthenticated(false);
        setUser(null);
    };

    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    // Don't show in Tauri desktop for now (sync integration pending)
    if (isTauri()) {
        return null;
    }

    return (
        <>
            <div className="flex items-center gap-2">
                {/* Sync button */}
                <button
                    onClick={handleSync}
                    disabled={syncState.isSyncing}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${syncState.error
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : isAuthenticated
                                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    title={syncState.error || (isAuthenticated ? `Last sync: ${formatLastSync(syncState.lastSyncTime)}` : 'Click to sign in')}
                >
                    {syncState.isSyncing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : syncState.error ? (
                        <AlertCircle className="w-4 h-4" />
                    ) : isAuthenticated ? (
                        syncState.lastSyncTime ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Cloud className="w-4 h-4" />
                        )
                    ) : (
                        <CloudOff className="w-4 h-4" />
                    )}
                    {isAuthenticated ? (
                        syncState.isSyncing ? 'Syncing...' : 'Synced'
                    ) : (
                        'Sign in to sync'
                    )}
                </button>

                {/* User menu (when authenticated) */}
                {isAuthenticated && user && (
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-sm">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                                {user.email[0].toUpperCase()}
                            </div>
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                            <div className="px-3 py-2 text-sm text-zinc-400 border-b border-zinc-700 truncate">
                                {user.email}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onAuthenticated={handleAuthenticated}
            />
        </>
    );
}
