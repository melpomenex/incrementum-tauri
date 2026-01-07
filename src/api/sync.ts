/**
 * Cloud synchronization API
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * Sync status
 */
export enum SyncStatus {
  Idle = "Idle",
  Connecting = "Connecting",
  Syncing = "Syncing",
  Synced = "Synced",
  Failed = "Failed",
  Conflict = "Conflict",
}

/**
 * Type of sync conflict
 */
export enum ConflictType {
  Modified = "Modified",
  Deleted = "Deleted",
  BothModified = "BothModified",
  BothDeleted = "BothDeleted",
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  local_version: DataVersion;
  remote_version: DataVersion;
  conflict_type: ConflictType;
}

/**
 * Data version
 */
export interface DataVersion {
  version: number;
  timestamp: string;
  device_id: string;
  hash: string;
}

/**
 * Sync result
 */
export interface SyncResult {
  status: SyncStatus;
  uploaded: number;
  downloaded: number;
  conflicts: number;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  enabled: boolean;
  endpoint: string;
  api_key?: string;
  device_id: string;
  encryption_enabled: boolean;
  auto_sync: boolean;
  sync_interval_minutes: number;
  last_sync?: string;
}

/**
 * Sync log entry
 */
export interface SyncLogEntry {
  timestamp: string;
  status: SyncStatus;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  error?: string;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  KeepLocal = "KeepLocal",
  KeepRemote = "KeepRemote",
  Merge = "Merge",
}

/**
 * Trigger sync now
 */
export async function syncNow(apiKey: string, endpoint: string): Promise<SyncResult> {
  return await invoke<SyncResult>("sync_now", { apiKey, endpoint });
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return await invoke<SyncStatus>("get_sync_status");
}

/**
 * Resolve a sync conflict
 */
export async function resolveSyncConflict(
  conflict: SyncConflict,
  resolution: ConflictResolution
): Promise<void> {
  return await invoke("resolve_sync_conflict", { conflict, resolution });
}

/**
 * Get sync log
 */
export async function getSyncLog(): Promise<SyncLogEntry[]> {
  return await invoke<SyncLogEntry[]>("get_sync_log");
}

/**
 * Get sync config from localStorage
 */
export function getSyncConfig(): SyncConfig | null {
  const data = localStorage.getItem("sync_config");
  return data ? JSON.parse(data) : null;
}

/**
 * Save sync config
 */
export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem("sync_config", JSON.stringify(config));
}

/**
 * Format sync status for display
 */
export function formatSyncStatus(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.Idle:
      return "Not syncing";
    case SyncStatus.Connecting:
      return "Connecting...";
    case SyncStatus.Syncing:
      return "Syncing...";
    case SyncStatus.Synced:
      return "All synced";
    case SyncStatus.Failed:
      return "Sync failed";
    case SyncStatus.Conflict:
      return "Conflicts detected";
  }
}

/**
 * Get sync status color
 */
export function getSyncStatusColor(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.Idle:
      return "text-muted-foreground";
    case SyncStatus.Connecting:
      return "text-yellow-500";
    case SyncStatus.Syncing:
      return "text-blue-500";
    case SyncStatus.Synced:
      return "text-green-500";
    case SyncStatus.Failed:
      return "text-destructive";
    case SyncStatus.Conflict:
      return "text-orange-500";
  }
}

/**
 * Check if sync is enabled
 */
export function isSyncEnabled(): boolean {
  const config = getSyncConfig();
  return config?.enabled ?? false;
}

/**
 * Enable sync
 */
export function enableSync(endpoint: string, apiKey: string, autoSync: boolean = false): void {
  const config: SyncConfig = {
    enabled: true,
    endpoint,
    api_key: apiKey,
    device_id: generateDeviceId(),
    encryption_enabled: true,
    auto_sync: autoSync,
    sync_interval_minutes: 30,
    last_sync: undefined,
  };
  saveSyncConfig(config);
}

/**
 * Disable sync
 */
export function disableSync(): void {
  const config = getSyncConfig();
  if (config) {
    config.enabled = false;
    saveSyncConfig(config);
  }
}

/**
 * Generate device ID
 */
function generateDeviceId(): string {
  let deviceId = localStorage.getItem("sync_device_id");
  if (!deviceId) {
    deviceId = `${navigator.userAgent}-${Date.now()}`;
    localStorage.setItem("sync_device_id", deviceId);
  }
  return deviceId;
}

/**
 * Get device ID
 */
export function getDeviceId(): string {
  return generateDeviceId();
}

/**
 * Format last sync time
 */
export function formatLastSync(config: SyncConfig): string {
  if (!config.last_sync) return "Never synced";

  const lastSync = new Date(config.last_sync);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return lastSync.toLocaleDateString();
}

/**
 * Calculate next sync time
 */
export function getNextSyncTime(config: SyncConfig): Date | null {
  if (!config.enabled || !config.auto_sync || !config.last_sync) {
    return null;
  }

  const lastSync = new Date(config.last_sync);
  return new Date(lastSync.getTime() + config.sync_interval_minutes * 60000);
}

/**
 * Get sync progress percentage
 */
export function getSyncProgress(result: SyncResult): number {
  if (result.status === SyncStatus.Syncing) {
    // Would need actual progress from sync operation
    return 50;
  }
  if (result.status === SyncStatus.Synced) {
    return 100;
  }
  return 0;
}
