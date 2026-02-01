import { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Settings as SettingsIcon,
  Lock,
  Clock,
  AlertTriangle,
  Check,
  X,
  FileText,
  History,
  Shield,
} from "lucide-react";
import {
  syncNow,
  getSyncStatus,
  getSyncLog,
  getSyncConfig,
  saveSyncConfig,
  disableSync,
  isSyncEnabled,
  formatSyncStatus,
  getSyncStatusColor,
  formatLastSync,
  getNextSyncTime,
  SyncStatus,
  SyncConfig,
  SyncConflict,
  ConflictResolution,
  SyncResult,
  SyncLogEntry,
} from "../../api/sync";
import { createNewSyncRoomId, getSyncRoomId, setSyncRoomId } from "../../lib/yjsSync";

type ViewMode = "status" | "config" | "conflicts" | "log";

export function SyncSettings() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.Idle);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("status");
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomMessage, setRoomMessage] = useState<string | null>(null);

  // Settings inputs
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadSyncLog();
    setRoomId(getSyncRoomId());
    const interval = setInterval(loadSyncLog, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = () => {
    setConfig(getSyncConfig());
    const loaded = getSyncConfig();
    if (loaded) {
      setEndpoint(loaded.endpoint);
      setApiKey(loaded.api_key || "");
      setAutoSync(loaded.auto_sync);
      setSyncInterval(loaded.sync_interval_minutes);
    }
  };

  const loadSyncLog = async () => {
    try {
      const log = await getSyncLog();
      setSyncLog(log);
    } catch {
      // Ignore errors
    }
  };

  const handleEnableSync = () => {
    if (!endpoint || !apiKey) {
      alert("Please enter both endpoint URL and API key");
      return;
    }

    enableSync(endpoint, apiKey, autoSync);
    loadConfig();
    setViewMode("status");
  };

  const handleDisableSync = () => {
    if (confirm("Are you sure you want to disable sync?")) {
      disableSync();
      loadConfig();
    }
  };

  const handleSyncNow = async () => {
    if (!config?.api_key || !config?.endpoint) {
      alert("Sync is not configured properly");
      return;
    }

    setIsSyncing(true);
    setStatus(SyncStatus.Syncing);

    try {
      const result = await syncNow(config.api_key, config.endpoint);
      setLastResult(result);
      setStatus(result.status);

      if (result.status === SyncStatus.Conflict) {
        setViewMode("conflicts");
      }
    } catch (error) {
      setStatus(SyncStatus.Failed);
    } finally {
      setIsSyncing(false);
      loadConfig();
      loadSyncLog();
    }
  };

  const handleCopyRoom = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setRoomMessage("Copied sync code to clipboard.");
    } catch {
      setRoomMessage("Failed to copy. You can still select and copy it manually.");
    }
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setRoomMessage("Enter a sync code to join.");
      return;
    }
    const nextRoom = joinRoomId.trim();
    setSyncRoomId(nextRoom);
    setRoomId(nextRoom);
    setRoomMessage("Sync code updated. Reload to connect.");
  };

  const handleRotateRoom = () => {
    if (!confirm("Create a new sync code? This will stop syncing with devices on the old code.")) {
      return;
    }
    const next = createNewSyncRoomId();
    setRoomId(next);
    setRoomMessage("New sync code created. Share it with your other devices.");
  };

  const nextSyncTime = config ? getNextSyncTime(config) : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config?.enabled ? (
            <Cloud className="w-8 h-8 text-primary" />
          ) : (
            <CloudOff className="w-8 h-8 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-foreground">Sync Settings</h2>
            <p className="text-sm text-muted-foreground">
              {config?.enabled ? "Cloud sync enabled" : "Cloud sync disabled"}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("status")}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              viewMode === "status"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setViewMode("config")}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              viewMode === "config"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Config
          </button>
          <button
            onClick={() => setViewMode("log")}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              viewMode === "log"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log
          </button>
        </div>
      </div>

      {/* Status View */}
      {viewMode === "status" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Device Sync (No Login)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use this sync code to connect your own devices. Anyone with the code can sync the
              same data.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Your sync code</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs font-mono"
                    value={roomId}
                    readOnly
                  />
                  <button
                    onClick={handleCopyRoom}
                    className="px-3 py-2 bg-muted text-foreground rounded text-xs"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleRotateRoom}
                    className="px-3 py-2 bg-destructive text-destructive-foreground rounded text-xs"
                  >
                    New
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Join another code</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs font-mono"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Paste sync code..."
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded text-xs"
                  >
                    Join
                  </button>
                </div>
              </div>
              {roomMessage && <div className="text-xs text-muted-foreground">{roomMessage}</div>}
              <div className="text-xs text-muted-foreground">
                After joining a code, reload the app on this device.
              </div>
            </div>
          </div>

          {/* Sync status card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Sync Status</h3>
              {config?.enabled && (
                <div className={`flex items-center gap-2 ${getSyncStatusColor(status)}`}>
                  {status === SyncStatus.Syncing && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  <span className="text-sm font-medium">{formatSyncStatus(status)}</span>
                </div>
              )}
            </div>

            {config?.enabled ? (
              <div className="space-y-4">
                {/* Last sync info */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Last sync:</span>
                  <span className="text-foreground">{formatLastSync(config)}</span>
                </div>

                {autoSync && nextSyncTime && (
                  <div className="flex items-center gap-4 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next sync:</span>
                    <span className="text-foreground">{nextSyncTime.toLocaleString()}</span>
                  </div>
                )}

                {/* Device ID */}
                <div className="flex items-center gap-4 text-sm">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Device ID:</span>
                  <span className="text-foreground font-mono text-xs">{config.device_id}</span>
                </div>

                {/* Encryption status */}
                <div className="flex items-center gap-4 text-sm">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Encryption:</span>
                  <span className="text-foreground">
                    {config.encryption_enabled ? "End-to-end enabled" : "Disabled"}
                  </span>
                </div>

                {/* Sync button */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sync Now
                      </>
                    )}
                  </button>
                </div>

                {/* Last result */}
                {lastResult && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-foreground">{lastResult.uploaded}</div>
                        <div className="text-xs text-muted-foreground">Uploaded</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{lastResult.downloaded}</div>
                        <div className="text-xs text-muted-foreground">Downloaded</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{lastResult.conflicts}</div>
                        <div className="text-xs text-muted-foreground">Conflicts</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CloudOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Cloud sync is disabled</p>
                <button
                  onClick={() => setViewMode("config")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Enable Sync
                </button>
              </div>
            )}
          </div>

          {/* Quick settings */}
          {config?.enabled && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">Auto-sync</span>
                    <p className="text-xs text-muted-foreground">Automatically sync at intervals</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => {
                      setAutoSync(e.target.checked);
                      if (config) {
                        config.auto_sync = e.target.checked;
                        saveSyncConfig(config);
                      }
                    }}
                    className="rounded"
                  />
                </label>

                {autoSync && (
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground">Sync interval:</label>
                    <select
                      value={syncInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSyncInterval(val);
                        if (config) {
                          config.sync_interval_minutes = val;
                          saveSyncConfig(config);
                        }
                      }}
                      className="px-3 py-1 bg-background border border-border rounded text-sm"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={360}>6 hours</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  onClick={handleDisableSync}
                  className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90"
                >
                  Disable Sync
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config View */}
      {viewMode === "config" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sync Configuration</h3>

            {config?.enabled ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-500 mb-4">
                <Check className="w-4 h-4" />
                <span className="text-sm">Sync is currently enabled</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Configure your cloud sync settings below
              </p>
            )}

            <div className="space-y-4">
              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sync Endpoint
                </label>
                <input
                  type="url"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://sync.example.com/api"
                  disabled={config?.enabled}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your sync API key"
                  disabled={config?.enabled}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              {/* Auto-sync option */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  disabled={config?.enabled}
                  className="rounded disabled:opacity-50"
                />
                <span className="text-sm text-foreground">Enable automatic sync</span>
              </label>

              {/* Enable button */}
              {!config?.enabled && (
                <button
                  onClick={handleEnableSync}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  Enable Cloud Sync
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">End-to-End Encryption</p>
                <p>
                  Your data is encrypted locally before syncing. The encryption key never leaves
                  your device, ensuring your privacy even if the sync server is compromised.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log View */}
      {viewMode === "log" && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Sync Log</h3>
            <History className="w-5 h-5 text-muted-foreground" />
          </div>

          {syncLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sync history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncLog.map((entry, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    entry.status === SyncStatus.Synced
                      ? "border-green-500/20 bg-green-500/10"
                      : entry.status === SyncStatus.Failed
                      ? "border-destructive/20 bg-destructive/10"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className={`text-xs font-medium ${getSyncStatusColor(entry.status)}`}>
                      {formatSyncStatus(entry.status)}
                    </span>
                  </div>
                  {entry.status === SyncStatus.Synced && (
                    <div className="text-xs text-muted-foreground">
                      ↑ {entry.uploaded} • ↓ {entry.downloaded}
                    </div>
                  )}
                  {entry.error && (
                    <div className="text-xs text-destructive mt-1">{entry.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
