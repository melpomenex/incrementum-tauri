//! Backup commands for cloud storage
//!
//! Commands for creating and restoring backups

use tauri::State;

use crate::backup::BackupManager;
use crate::cloud::{
    BackupOptions, BackupInfo, CloudProvider, CloudProviderType,
    OneDriveProvider, GoogleDriveProvider, DropboxProvider,
    OneDriveConfig, GoogleDriveConfig, DropboxConfig,
    RestoreResult,
};
use crate::database::{Database, Repository};

/// Create a backup
#[tauri::command]
pub async fn backup_create(
    provider_type: String,
    options: BackupOptions,
    repo: State<'_, Repository>,
) -> Result<BackupInfo, String> {
    let provider: Box<dyn CloudProvider> = match CloudProviderType::from_str(&provider_type) {
        Some(CloudProviderType::OneDrive) => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        Some(CloudProviderType::GoogleDrive) => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        Some(CloudProviderType::Dropbox) => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
        None => return Err("Unknown provider type".to_string()),
    };

    let db = Database::from_pool(repo.pool().clone());
    let manager = BackupManager::new(db)
        .map_err(|e| e.to_string())?;

    manager
        .create_backup(provider.as_ref(), options)
        .await
        .map_err(|e| e.to_string())
}

/// Restore from a backup
#[tauri::command]
pub async fn backup_restore(
    provider_type: String,
    backup_id: String,
    repo: State<'_, Repository>,
) -> Result<RestoreResult, String> {
    let provider: Box<dyn CloudProvider> = match CloudProviderType::from_str(&provider_type) {
        Some(CloudProviderType::OneDrive) => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        Some(CloudProviderType::GoogleDrive) => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        Some(CloudProviderType::Dropbox) => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
        None => return Err("Unknown provider type".to_string()),
    };

    let db = Database::from_pool(repo.pool().clone());
    let manager = BackupManager::new(db)
        .map_err(|e| e.to_string())?;

    manager
        .restore_backup(provider.as_ref(), &backup_id)
        .await
        .map_err(|e| e.to_string())
}

/// List available backups
#[tauri::command]
pub async fn backup_list(
    provider_type: String,
) -> Result<Vec<BackupInfo>, String> {
    let _provider: Box<dyn CloudProvider> = match CloudProviderType::from_str(&provider_type) {
        Some(CloudProviderType::OneDrive) => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        Some(CloudProviderType::GoogleDrive) => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        Some(CloudProviderType::Dropbox) => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
        None => return Err("Unknown provider type".to_string()),
    };

    // Get database from somewhere - for now, use a placeholder
    // In a real implementation, you'd get this from app state
    Err("Backup listing not implemented yet".to_string())
}

/// Delete a backup
#[tauri::command]
pub async fn backup_delete(
    provider_type: String,
    backup_id: String,
) -> Result<(), String> {
    let provider: Box<dyn CloudProvider> = match CloudProviderType::from_str(&provider_type) {
        Some(CloudProviderType::OneDrive) => {
            Box::new(OneDriveProvider::new(OneDriveConfig::default()))
        }
        Some(CloudProviderType::GoogleDrive) => {
            Box::new(GoogleDriveProvider::new(GoogleDriveConfig::default()))
        }
        Some(CloudProviderType::Dropbox) => {
            Box::new(DropboxProvider::new(DropboxConfig::default()))
        }
        None => return Err("Unknown provider type".to_string()),
    };

    provider
        .delete_file(&format!("/backups/{}.zip", backup_id))
        .await
        .map_err(|e| e.to_string())
}
