/**
 * Sync Status Indicator Component
 * Shows real-time sync status and allows manual sync trigger
 */

import { useState, useEffect } from "react";
import { invokeCommand } from "../../lib/tauri";
import {
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Upload,
  Download,
  AlertTriangle,
  X,
} from "lucide-react";
import type { SyncResult } from "@/types/cloud";

interface SyncStatusIndicatorProps {
  provider: string | null;
  isAuthenticated: boolean;
  syncMode: "backup" | "two-way";
  onSyncComplete?: (result: SyncResult) => void;
}

type SyncState = "idle" | "syncing" | "success" | "error" | "conflicts";

export function SyncStatusIndicator({
  provider,
  isAuthenticated,
  syncMode,
  onSyncComplete,
}: SyncStatusIndicatorProps) {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState({
    uploaded: 0,
    downloaded: 0,
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<number>(0);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    if (isAuthenticated && provider) {
      loadSyncStatus();
    }
  }, [isAuthenticated, provider]);

  const loadSyncStatus = async () => {
    try {
      const status = await invokeCommand<{
        last_sync: string | null;
        sync_version: number;
        pending_conflicts: number;
      }>("cloud_sync_get_status");

      setLastSync(status.last_sync);
      setConflicts(status.pending_conflicts);
    } catch (err) {
      console.error("Failed to load sync status:", err);
    }
  };

  const handleSyncNow = async () => {
    if (!isAuthenticated || !provider) return;

    setSyncState("syncing");
    setError(null);
    setSyncProgress({ uploaded: 0, downloaded: 0, message: "Starting sync..." });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev.uploaded === 0 && prev.downloaded === 0) {
            return { ...prev, message: "Checking for changes..." };
          }
          return prev;
        });
      }, 1000);

      const result = await invokeCommand<SyncResult>("cloud_sync_now");

      clearInterval(progressInterval);

      if (result.conflicts && result.conflicts.length > 0) {
        setSyncState("conflicts");
        setConflicts(result.conflicts.length);
        setSyncProgress({
          uploaded: result.uploaded,
          downloaded: result.downloaded,
          message: `Found ${result.conflicts.length} conflicts`,
        });
      } else if (result.success) {
        setSyncState("success");
        setLastSync(new Date().toISOString());
        setSyncProgress({
          uploaded: result.uploaded,
          downloaded: result.downloaded,
          message: `Synced ${result.uploaded} up, ${result.downloaded} down`,
        });
        onSyncComplete?.(result);

        // Auto-reset success state after 3 seconds
        setTimeout(() => setSyncState("idle"), 3000);
      } else {
        setSyncState("error");
        setError(result.error || "Sync failed");
      }
    } catch (err) {
      setSyncState("error");
      setError(err as string);
    }
  };

  if (!isAuthenticated || !provider) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncState) {
      case "syncing":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "conflicts":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        if (conflicts > 0) {
          return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        }
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (syncState) {
      case "syncing":
        return syncProgress.message;
      case "success":
        return syncProgress.message;
      case "error":
        return error || "Sync failed";
      case "conflicts":
        return `${conflicts} conflict${conflicts > 1 ? "s" : ""} detected`;
      default:
        if (lastSync) {
          const lastSyncDate = new Date(lastSync);
          const now = new Date();
          const diffMins = Math.floor((now.getTime() - lastSyncDate.getTime()) / 60000);

          if (diffMins < 1) return "Just synced";
          if (diffMins < 60) return `Synced ${diffMins}m ago`;
          if (diffMins < 1440) return `Synced ${Math.floor(diffMins / 60)}h ago`;
          return `Synced ${lastSyncDate.toLocaleDateString()}`;
        }
        return "Not synced yet";
    }
  };

  const showSyncButton = syncMode === "two-way" || syncState !== "idle";

  return (
    <div className="flex items-center gap-3">
      {/* Status Icon and Text */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        {getStatusIcon()}
        <span className="text-sm text-foreground">{getStatusText()}</span>
      </div>

      {/* Sync Button */}
      {(showSyncButton || syncMode === "two-way") && (
        <button
          onClick={handleSyncNow}
          disabled={syncState === "syncing"}
          className={`p-2 rounded-lg transition-colors ${syncState === "syncing"
              ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
              : "bg-background hover:bg-muted text-muted-foreground"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={
            syncMode === "backup"
              ? "Backup to cloud"
              : syncState === "syncing"
                ? "Syncing..."
                : "Sync now"
          }
        >
          {syncState === "syncing" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : syncMode === "backup" ? (
            <Upload className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Error Dismiss */}
      {syncState === "error" && (
        <button
          onClick={() => {
            setSyncState("idle");
            setError(null);
          }}
          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
          title="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Sync Details (when syncing) */}
      {syncState === "syncing" && (syncProgress.uploaded > 0 || syncProgress.downloaded > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {syncProgress.uploaded > 0 && (
            <div className="flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>{syncProgress.uploaded}</span>
            </div>
          )}
          {syncProgress.downloaded > 0 && (
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{syncProgress.downloaded}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
