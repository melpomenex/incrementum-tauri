//! Scheduler commands
//!
//! Tauri commands for backup scheduler management

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

use crate::scheduler::{BackupScheduler, SchedulerConfig, BackupSchedule, SchedulerResult};
use crate::database::{Database, Repository};
use crate::cloud::{CloudProvider, CloudProviderType, BackupOptions};

// Global scheduler instance - use tokio Mutex for async safety
static SCHEDULER: tokio::sync::Mutex<Option<BackupScheduler>> =
    tokio::sync::Mutex::const_new(None);

/// Initialize the backup scheduler
#[tauri::command]
pub async fn scheduler_init(repo: State<'_, Repository>) -> Result<(), String> {
    let db = Database::from_pool(repo.pool().clone());

    // TODO: Load config from settings
    let config = SchedulerConfig::default();

    let scheduler = BackupScheduler::new(db, config);

    let mut guard = SCHEDULER.lock().await;
    *guard = Some(scheduler);

    Ok(())
}

/// Start the scheduler
#[tauri::command]
pub async fn scheduler_start() -> Result<(), String> {
    let guard = SCHEDULER.lock().await;
    let scheduler = guard.as_ref()
        .ok_or_else(|| "Scheduler not initialized".to_string())?;

    // Clone needed data before dropping guard
    let result = scheduler.start().await;

    result.map_err(|e| e.to_string())
}

/// Stop the scheduler
#[tauri::command]
pub async fn scheduler_stop() -> Result<(), String> {
    let guard = SCHEDULER.lock().await;
    let scheduler = guard.as_ref()
        .ok_or_else(|| "Scheduler not initialized".to_string())?;

    let result = scheduler.stop().await;

    result.map_err(|e| e.to_string())
}

/// Update scheduler configuration
#[tauri::command]
pub async fn scheduler_update_config(config: SchedulerConfig) -> Result<(), String> {
    let mut guard = SCHEDULER.lock().await;
    let scheduler = guard.as_mut()
        .ok_or_else(|| "Scheduler not initialized".to_string())?;

    scheduler.update_config(config).await;
    Ok(())
}

/// Get scheduler status
#[tauri::command]
pub async fn scheduler_get_status() -> Result<SchedulerStatus, String> {
    let guard = SCHEDULER.lock().await;
    let scheduler = guard.as_ref()
        .ok_or_else(|| "Scheduler not initialized".to_string())?;

    let running = scheduler.is_running().await;
    let next_scheduled = scheduler.next_scheduled_time().await;

    Ok(SchedulerStatus {
        running,
        next_scheduled: next_scheduled.map(|d| d.to_rfc3339()),
    })
}

/// Trigger a manual backup
#[tauri::command]
pub async fn scheduler_trigger_backup(
    provider_type: String,
    repo: State<'_, Repository>,
) -> Result<SchedulerResult, String> {
    let guard = SCHEDULER.lock().await;
    let scheduler = guard.as_ref()
        .ok_or_else(|| "Scheduler not initialized".to_string())?;

    // TODO: Get authenticated provider
    // For now, return error
    Err("Cloud provider not authenticated".to_string())
}

/// Scheduler status
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SchedulerStatus {
    pub running: bool,
    pub next_scheduled: Option<String>,
}
