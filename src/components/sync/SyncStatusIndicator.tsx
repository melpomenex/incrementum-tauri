/**
 * Sync Status Indicator - shows sync state in the UI
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import * as syncClient from '../../lib/sync-client';

interface SyncStatusIndicatorProps {
    isAuthenticated?: boolean;
    onLoginClick?: () => void;
}

export function SyncStatusIndicator({ isAuthenticated = false, onLoginClick }: SyncStatusIndicatorProps) {
    const [syncState, setSyncState] = useState<syncClient.SyncState>({
        isSyncing: false,
        lastSyncTime: null,
        error: null,
    });

    useEffect(() => {
        // Subscribe to sync state changes
        const unsubscribe = syncClient.subscribeSyncState(setSyncState);
        return unsubscribe;
    }, []);

    const handleClick = async () => {
        if (!isAuthenticated) {
            if (onLoginClick) {
                onLoginClick();
            }
            return;
        }
        await syncClient.triggerSync();
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

    return (
        <button
            onClick={handleClick}
            disabled={syncState.isSyncing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                syncState.error
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : isAuthenticated
                        ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title={syncState.error || (isAuthenticated ? `Last sync: ${formatLastSync(syncState.lastSyncTime)}` : 'Sign in to sync your data across devices')}
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
                'Demo Mode'
            )}
        </button>
    );
}
