/**
 * Cloud Storage Types
 * Types for cloud backup and sync functionality
 */

// Cloud provider type
export type CloudProviderType = "onedrive" | "google-drive" | "dropbox";

// Sync mode
export type SyncMode = "backup" | "two-way";

// Account information from cloud provider
export interface AccountInfo {
  account_id: string;
  account_name: string;
  email?: string;
  storage_quota?: StorageQuota;
}

// Storage quota information
export interface StorageQuota {
  used: number;
  total: number;
}

// File information
export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  modified_time: string;
  is_folder: boolean;
  mime_type?: string;
}

// File metadata
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  created_time?: string;
  modified_time: string;
  checksum?: string;
}

// Authentication token information
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
}

// OAuth callback result
export interface AuthResult {
  success: boolean;
  account_info?: AccountInfo;
  error?: string;
}

// Backup options
export interface BackupOptions {
  include_database: boolean;
  include_documents: boolean;
  include_settings: boolean;
  compress: boolean;
  encrypt: boolean;
}

// Backup includes
export interface BackupIncludes {
  database: boolean;
  documents: boolean;
  settings: boolean;
}

// Backup information
export interface BackupInfo {
  id: string;
  created_at: string;
  device_id: string;
  app_version: string;
  backup_type: string;
  size: number;
  file_count: number;
  includes: BackupIncludes;
  encrypted: boolean;
  compressed: boolean;
}

// Restore result
export interface RestoreResult {
  success: boolean;
  restored_items: number;
  conflicts: RestoreConflict[];
  error?: string;
}

// Restore conflict
export interface RestoreConflict {
  item_id: string;
  item_type: string;
  local_version: string;
  backup_version: string;
}

// Sync result
export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: SyncConflict[];
  error?: string;
  duration_secs: number;
}

// Sync conflict
export interface SyncConflict {
  item_id: string;
  item_type: string;
  local_modified: string;
  remote_modified: string;
}

// Conflict resolution strategy
export type ConflictResolution = "keep-local" | "keep-remote" | "keep-newest" | "keep-both";

// Cloud storage state
export interface CloudStorageState {
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

// Backup state
export interface BackupState {
  backups: BackupInfo[];
  activeBackup: BackupInfo | null;
  restoreInProgress: boolean;
  backupInProgress: boolean;
  backupProgress?: {
    current: number;
    total: number;
    message: string;
  };
}

// Restore state
export interface RestoreState {
  inProgress: boolean;
  selectedBackup: BackupInfo | null;
  conflicts: RestoreConflict[];
  resolvedConflicts: Map<string, ConflictResolution>;
}
