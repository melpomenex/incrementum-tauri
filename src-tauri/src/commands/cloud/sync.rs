//! Cloud sync commands
//!
//! Tauri commands for cloud synchronization

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

use crate::cloud::{SyncResult, ConflictResolution, SyncConflict};
use crate::database::{Database, Repository};
use crate::cloud_sync::CloudSyncManager;

// Global cloud sync manager - use tokio Mutex for async safety
static CLOUD_SYNC_MANAGER: tokio::sync::Mutex<Option<CloudSyncManager>> =
    tokio::sync::Mutex::const_new(None);

/// Initialize cloud sync manager
#[tauri::command]
pub async fn cloud_sync_init(repo: State<'_, Repository>) -> Result<(), String> {
    let db = Database::from_pool(repo.pool().clone());

    // Create manager from database
    let manager = CloudSyncManager::new(db)
        .map_err(|e| e.to_string())?;

    let mut guard = CLOUD_SYNC_MANAGER.lock().await;
    *guard = Some(manager);

    Ok(())
}

/// Perform two-way sync
#[tauri::command]
pub async fn cloud_sync_now() -> Result<SyncResult, String> {
    let mut guard = CLOUD_SYNC_MANAGER.lock().await;
    let manager = guard.as_mut()
        .ok_or_else(|| "Cloud sync not initialized".to_string())?;

    manager.two_way_sync().await
        .map_err(|e| e.to_string())
}

/// Get sync status
#[tauri::command]
pub async fn cloud_sync_get_status() -> Result<crate::cloud_sync::SyncStatus, String> {
    let guard = CLOUD_SYNC_MANAGER.lock().await;
    let manager = guard.as_ref()
        .ok_or_else(|| "Cloud sync not initialized".to_string())?;

    manager.get_sync_status().await
        .map_err(|e| e.to_string())
}

/// Resolve sync conflicts
#[tauri::command]
pub async fn cloud_sync_resolve_conflicts(
    resolutions: Vec<ConflictResolution>,
) -> Result<(), String> {
    let mut guard = CLOUD_SYNC_MANAGER.lock().await;
    let manager = guard.as_mut()
        .ok_or_else(|| "Cloud sync not initialized".to_string())?;

    manager.resolve_conflicts(resolutions).await
        .map_err(|e| e.to_string())
}

/// List cloud files for import
#[tauri::command]
pub async fn cloud_list_files(
    provider_type: String,
    path: String,
) -> Result<Vec<crate::cloud::FileInfo>, String> {
    use crate::cloud::{CloudProvider, CloudProviderType};

    let provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // TODO: Get authenticated provider instance
    // For now, return error
    Err("Cloud provider not authenticated".to_string())
}

/// Import files from cloud
#[tauri::command]
pub async fn cloud_import_files(
    provider_type: String,
    files: Vec<String>,
    repo: State<'_, Repository>,
) -> Result<ImportResult, String> {
    use crate::cloud::{CloudProvider, CloudProviderType};

    let provider_type = CloudProviderType::from_str(&provider_type)
        .ok_or_else(|| format!("Unknown provider type: {}", provider_type))?;

    // TODO: Implement file import
    Ok(ImportResult {
        imported: 0,
        failed: 0,
        errors: vec![],
    })
}

/// Import result
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}
