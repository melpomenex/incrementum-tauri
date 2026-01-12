/**
 * Cloud Storage Settings Component
 * Configure cloud backup and sync providers (OneDrive, Google Drive, Dropbox)
 */

import { useState, useEffect } from "react";
import { invokeCommand as invoke, isTauri } from "../../lib/tauri";
import { useSearchParams } from "react-router-dom";
import {
  Cloud,
  CloudOff,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Settings,
  Clock,
  HardDrive,
} from "lucide-react";
import { BackupRestorePanel } from "./BackupRestorePanel";

// Types
type CloudProviderType = "onedrive" | "google-drive" | "dropbox";
type SyncMode = "backup" | "two-way";

interface CloudStorageState {
  provider: CloudProviderType | null;
  isAuthenticated: boolean;
  accountInfo: AccountInfo | null;
  syncMode: SyncMode;
  autoBackup: {
    enabled: boolean;
    schedule: "daily" | "weekly" | "monthly";
    time?: string;
  };
  lastBackupTime: string | null;
  lastSyncTime: string | null;
}

interface AccountInfo {
  account_id: string;
  account_name: string;
  email?: string;
  storage_quota?: {
    used: number;
    total: number;
  };
}

const PROVIDER_INFO = {
  onedrive: {
    name: "OneDrive",
    description: "Microsoft's cloud storage service",
    icon: "🔷",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  "google-drive": {
    name: "Google Drive",
    description: "Google's cloud storage service",
    icon: "🟢",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  dropbox: {
    name: "Dropbox",
    description: "Dropbox cloud storage",
    icon: "📦",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
};

export function CloudStorageSettings({ onChange }: { onChange: () => void }) {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CloudStorageState>({
    provider: null,
    isAuthenticated: false,
    accountInfo: null,
    syncMode: "backup",
    autoBackup: {
      enabled: false,
      schedule: "daily",
      time: "02:00",
    },
    lastBackupTime: null,
    lastSyncTime: null,
  });

  const [connectingProvider, setConnectingProvider] =
    useState<CloudProviderType | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback from URL query params
  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");
    const pendingProvider = sessionStorage.getItem("pending_oauth_provider") as CloudProviderType;

    if (oauthSuccess === "true" && pendingProvider) {
      // OAuth was successful
      setState(prev => ({
        ...prev,
        provider: pendingProvider,
        isAuthenticated: true,
        accountInfo: {
          account_id: "connected",
          account_name: "Connected User",
        },
      }));
      setConnectingProvider(null);
      setOauthUrl(null);
      sessionStorage.removeItem("pending_oauth_provider");

      // Clean up URL params
      window.history.replaceState({}, "", "/settings");

      onChange();
    } else if (oauthError && pendingProvider) {
      // OAuth failed
      setError(decodeURIComponent(oauthError));
      setConnectingProvider(null);
      setOauthUrl(null);
      sessionStorage.removeItem("pending_oauth_provider");

      // Clean up URL params
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, onChange]);

  const handleConnect = async (providerType: CloudProviderType) => {
    setConnectingProvider(providerType);
    setError(null);

    try {
      const url = await invoke<string>("oauth_start", {
        providerType,
      });

      // Store the expected provider type for callback
      sessionStorage.setItem("pending_oauth_provider", providerType);

      // Open the OAuth URL in a new window
      if (isTauri()) {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(url);
      } else {
        window.open(url, "_blank");
      }

      setOauthUrl(url);
    } catch (err) {
      setError(err as string);
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (providerType: CloudProviderType) => {
    try {
      await invoke("oauth_disconnect", { providerType });

      setState({
        ...state,
        isAuthenticated: false,
        accountInfo: null,
        lastBackupTime: null,
        lastSyncTime: null,
      });

      onChange();
    } catch (err) {
      setError(err as string);
    }
  };

  const handleSyncModeChange = (mode: SyncMode) => {
    setState({
      ...state,
      syncMode: mode,
    });
    onChange();
  };

  const handleAutoBackupChange = (enabled: boolean) => {
    setState({
      ...state,
      autoBackup: {
        ...state.autoBackup,
        enabled,
      },
    });
    onChange();
  };

  const handleScheduleChange = (
    schedule: "daily" | "weekly" | "monthly"
  ) => {
    setState({
      ...state,
      autoBackup: {
        ...state.autoBackup,
        schedule,
      },
    });
    onChange();
  };

  const formatStorageQuota = (quota: { used: number; total: number }) => {
    const usedGB = (quota.used / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (quota.total / (1024 * 1024 * 1024)).toFixed(2);
    const percentage = ((quota.used / quota.total) * 100).toFixed(1);

    return `${usedGB} GB / ${totalGB} GB (${percentage}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Cloud Storage Provider
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["onedrive", "google-drive", "dropbox"] as const).map(
            (providerType) => {
              const info = PROVIDER_INFO[providerType];
              const isConnecting = connectingProvider === providerType;
              const isConnected =
                state.provider === providerType && state.isAuthenticated;

              return (
                <div
                  key={providerType}
                  className={`p-4 border-2 rounded-lg transition-all ${isConnected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{info.icon}</div>
                      <div>
                        <div className="font-medium text-foreground">
                          {info.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {info.description}
                        </div>
                      </div>
                    </div>

                    {isConnected && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  {state.provider === providerType && state.accountInfo && (
                    <div className="mb-3 p-2 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-foreground">
                        {state.accountInfo.account_name}
                      </div>
                      {state.accountInfo.email && (
                        <div className="text-xs text-muted-foreground">
                          {state.accountInfo.email}
                        </div>
                      )}
                      {state.accountInfo.storage_quota && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatStorageQuota(state.accountInfo.storage_quota)}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      isConnected
                        ? handleDisconnect(providerType)
                        : handleConnect(providerType)
                    }
                    disabled={isConnecting}
                    className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isConnected
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : info.bgColor + " " + info.color
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : isConnected ? (
                      <>
                        <CloudOff className="w-4 h-4 inline-block mr-2" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 inline-block mr-2" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* OAuth Callback Info */}
      {oauthUrl && !state.isAuthenticated && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">
                Complete the sign-in process
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                A browser window should have opened. Complete the sign-in
                process, then return here.
              </p>
              <button
                onClick={() => setOauthUrl(null)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                I've completed the sign-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Settings (only show when authenticated) */}
      {state.isAuthenticated && (
        <>
          {/* Sync Mode */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Sync Mode
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleSyncModeChange("backup")}
                className={`p-4 border-2 rounded-lg transition-all text-left ${state.syncMode === "backup"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Cloud className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Backup Only</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  One-way backup from your computer to the cloud. Your local
                  data is never modified.
                </p>
              </button>

              <button
                onClick={() => handleSyncModeChange("two-way")}
                className={`p-4 border-2 rounded-lg transition-all text-left ${state.syncMode === "two-way"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Two-Way Sync</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Synchronize changes between your computer and the cloud.
                  Changes made on either device are synced.
                </p>
              </button>
            </div>
          </div>

          {/* Auto Backup */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Automatic Backups
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-foreground">
                      Enable automatic backups
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Automatically back up your collection on a schedule
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleAutoBackupChange(!state.autoBackup.enabled)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${state.autoBackup.enabled
                      ? "bg-primary"
                      : "bg-muted"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.autoBackup.enabled
                        ? "translate-x-6"
                        : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {state.autoBackup.enabled && (
                <div className="ml-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Backup Schedule
                    </label>

                    <select
                      value={state.autoBackup.schedule}
                      onChange={(e) =>
                        handleScheduleChange(
                          e.target.value as "daily" | "weekly" | "monthly"
                        )
                      }
                      className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Backup Time
                    </label>

                    <input
                      type="time"
                      value={state.autoBackup.time || "02:00"}
                      onChange={(e) =>
                        setState({
                          ...state,
                          autoBackup: {
                            ...state.autoBackup,
                            time: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          {(state.lastBackupTime || state.lastSyncTime) && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Status
              </h3>

              <div className="space-y-2">
                {state.lastBackupTime && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm text-foreground">Last backup:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(state.lastBackupTime).toLocaleString()}
                    </span>
                  </div>
                )}

                {state.lastSyncTime && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm text-foreground">Last sync:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(state.lastSyncTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Backup & Restore */}
          <div className="pt-6 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Backup & Restore
              </h3>
            </div>

            <BackupRestorePanel
              provider={state.provider}
              isAuthenticated={state.isAuthenticated}
              onBackupComplete={(backup) => {
                setState({
                  ...state,
                  lastBackupTime: backup.created_at,
                });
                onChange();
              }}
              onRestoreComplete={() => {
                onChange();
              }}
            />
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive-foreground mb-1">
                Error
              </h4>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-1">
              About Cloud Backup & Sync
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Connect to a cloud storage provider to back up your collection or
              sync across multiple devices.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Backup Only:</strong> One-way backup to cloud storage</li>
              <li>• <strong>Two-Way Sync:</strong> Sync changes between devices</li>
              <li>• All data is encrypted before uploading</li>
              <li>• Supports incremental backups to save bandwidth</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
