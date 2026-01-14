/**
 * Backup & Restore Panel Component
 * Provides UI for creating backups and restoring from cloud storage
 */

import { useState, useEffect } from "react";
import { invokeCommand as invoke } from "../../lib/tauri";
import {
  HardDrive,
  RefreshCw,
  Download,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Calendar,
  Database,
  FileText,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react";
import type {
  CloudProviderType,
  BackupInfo,
  BackupOptions,
  RestoreResult,
  RestoreConflict,
  ConflictResolution,
} from "@/types/cloud";

interface BackupRestorePanelProps {
  provider: CloudProviderType | null;
  isAuthenticated: boolean;
  onBackupComplete?: (backup: BackupInfo) => void;
  onRestoreComplete?: () => void;
}

const BACKUP_PRESETS: {
  name: string;
  description: string;
  options: BackupOptions;
  icon: React.ReactNode;
}[] = [
    {
      name: "Full Backup",
      description: "Database, documents, and settings",
      options: {
        include_database: true,
        include_documents: true,
        include_settings: true,
        compress: true,
        encrypt: true,
      },
      icon: <HardDrive className="w-5 h-5" />,
    },
    {
      name: "Database Only",
      description: "Just your learning database",
      options: {
        include_database: true,
        include_documents: false,
        include_settings: false,
        compress: true,
        encrypt: true,
      },
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: "Documents Only",
      description: "Document files without database",
      options: {
        include_database: false,
        include_documents: true,
        include_settings: false,
        compress: true,
        encrypt: true,
      },
      icon: <FileText className="w-5 h-5" />,
    },
  ];

export function BackupRestorePanel({
  provider,
  isAuthenticated,
  onBackupComplete,
  onRestoreComplete,
}: BackupRestorePanelProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [restoreConflicts, setRestoreConflicts] = useState<RestoreConflict[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Load backups when component mounts or provider changes
  useEffect(() => {
    if (isAuthenticated && provider) {
      loadBackups();
    } else {
      setBackups([]);
    }
  }, [isAuthenticated, provider]);

  const loadBackups = async () => {
    if (!provider) return;

    setLoading(true);
    setError(null);

    try {
      const result = await invoke<BackupInfo[]>("backup_list", {
        providerType: provider,
      });
      setBackups(result.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!provider) return;

    setBackupInProgress(true);
    setError(null);
    setSuccess(null);
    setBackupProgress({ current: 0, total: 100, message: "Initializing backup..." });

    try {
      const options = BACKUP_PRESETS[selectedPreset].options;

      // Simulate progress (in real implementation, this would come from events)
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => {
          if (!prev || prev.current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            current: prev.current + 10,
            message: getProgressMessage(prev.current + 10),
          };
        });
      }, 500);

      const result = await invoke<BackupInfo>("backup_create", {
        providerType: provider,
        options,
      });

      clearInterval(progressInterval);
      setBackupProgress({ current: 100, total: 100, message: "Backup complete!" });

      setBackups((prev) => [result, ...prev]);
      setSuccess(`Backup created successfully at ${new Date(result.created_at).toLocaleString()}`);
      onBackupComplete?.(result);

      setTimeout(() => {
        setBackupProgress(null);
      }, 2000);
    } catch (err) {
      setError(err as string);
      setBackupProgress(null);
    } finally {
      setBackupInProgress(false);
    }
  };

  const getProgressMessage = (progress: number): string => {
    if (progress < 20) return "Exporting database...";
    if (progress < 40) return "Copying document files...";
    if (progress < 60) return "Compressing backup...";
    if (progress < 80) return "Uploading to cloud...";
    if (progress < 100) return "Finalizing backup...";
    return "Backup complete!";
  };

  const handleRestoreClick = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    if (!provider || !selectedBackup) return;

    setRestoreInProgress(true);
    setError(null);
    setShowRestoreConfirm(false);

    try {
      const result = await invoke<RestoreResult>("backup_restore", {
        providerType: provider,
        backupId: selectedBackup.id,
      });

      if (result.conflicts.length > 0) {
        setRestoreConflicts(result.conflicts);
        setSuccess(
          `Restore completed with ${result.conflicts.length} conflicts. Please review below.`
        );
      } else {
        setSuccess(
          `Restore completed successfully! ${result.restored_items} items restored.`
        );
        onRestoreComplete?.();
      }

      // Reload backups to update any changes
      await loadBackups();
    } catch (err) {
      setError(err as string);
    } finally {
      setRestoreInProgress(false);
      setSelectedBackup(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!provider) return;

    setError(null);

    try {
      await invoke("backup_delete", {
        providerType: provider,
        backupId,
      });

      setBackups((prev) => prev.filter((b) => b.id !== backupId));
      setSuccess("Backup deleted successfully.");
    } catch (err) {
      setError(err as string);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getBackupTypeLabel = (backup: BackupInfo): string => {
    const parts: string[] = [];
    if (backup.includes.database) parts.push("Database");
    if (backup.includes.documents) parts.push("Documents");
    if (backup.includes.settings) parts.push("Settings");
    return parts.join(" + ");
  };

  if (!isAuthenticated || !provider) {
    return (
      <div className="p-6 bg-muted/30 rounded-lg border border-border text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          Connect to a cloud storage provider to manage backups.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Backup Section */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Create Backup
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {BACKUP_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => setSelectedPreset(index)}
              disabled={backupInProgress}
              className={`p-4 border-2 rounded-lg transition-all text-left ${selectedPreset === index
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary">{preset.icon}</div>
                <span className="font-medium text-foreground">{preset.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={backupInProgress}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {backupInProgress ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Backup...
            </>
          ) : (
            <>
              <HardDrive className="w-5 h-5" />
              Create Backup Now
            </>
          )}
        </button>

        {/* Backup Progress */}
        {backupProgress && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {backupProgress.message}
              </span>
              <span className="text-sm text-muted-foreground">
                {backupProgress.current}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${backupProgress.current}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Backup History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Backup History
          </h3>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading && backups.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center bg-muted/30 rounded-lg border border-border">
            <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">No backups found</p>
            <p className="text-sm text-muted-foreground">
              Create your first backup to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="p-4 bg-card border border-border rounded-lg hover:border-muted-foreground transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {new Date(backup.created_at).toLocaleString()}
                      </span>
                      {backup.encrypted && (
                        <Shield
                          className="w-4 h-4 text-primary"
                          title="Encrypted backup"
                        />
                      )}
                      {backup.compressed && (
                        <FileText
                          className="w-4 h-4 text-muted-foreground"
                          title="Compressed backup"
                        />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {getBackupTypeLabel(backup)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatBytes(backup.size)}</span>
                      <span>{backup.file_count} files</span>
                      <span>{backup.device_id}</span>
                      <span>v{backup.app_version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRestoreClick(backup)}
                      disabled={restoreInProgress}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Restore from this backup"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete this backup"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts Section */}
      {restoreConflicts.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
            Restore Conflicts
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            The following items were found in both your local data and the backup.
            Choose how to resolve each conflict:
          </p>
          <div className="space-y-2">
            {restoreConflicts.map((conflict, index) => (
              <div
                key={index}
                className="p-3 bg-background border border-border rounded-lg"
              >
                <div className="text-sm font-medium text-foreground mb-1">
                  {conflict.item_type}: {conflict.item_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  Local: {conflict.local_version} | Backup: {conflict.backup_version}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Conflict resolution UI will be implemented in a future update.
            Currently, all conflicts are automatically resolved by keeping the backup version.
          </p>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Confirm Restore
            </h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to restore from backup created on{" "}
              {new Date(selectedBackup.created_at).toLocaleString()}?
            </p>
            <div className="p-3 bg-muted rounded-lg mb-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground">Type:</span>
                <span className="text-muted-foreground">
                  {getBackupTypeLabel(selectedBackup)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground">Size:</span>
                <span className="text-muted-foreground">
                  {formatBytes(selectedBackup.size)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Files:</span>
                <span className="text-muted-foreground">
                  {selectedBackup.file_count}
                </span>
              </div>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-4">
              <strong>Warning:</strong> Restoring will replace your current data.
              Consider creating a backup first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                disabled={restoreInProgress}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={restoreInProgress}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {restoreInProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-300 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Success</h4>
              <p className="text-sm text-muted-foreground">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive-foreground mb-1">Error</h4>
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
    </div>
  );
}
