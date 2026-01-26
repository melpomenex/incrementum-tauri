//! Tauri commands for position tracking, bookmarks, and reading sessions

use crate::models::position::{DocumentPosition, Bookmark};
use crate::services::PositionService;
use tauri::State;

/// Get the current position for a document
#[tauri::command]
pub async fn get_document_position(
    document_id: String,
    repo: State<'_, crate::database::Repository>,
) -> Result<Option<DocumentPosition>, String> {
    let service = PositionService::new(repo.pool().clone());
    service.get_position(&document_id).await
        .map_err(|e| e.to_string())
}

/// Save position for a document
#[tauri::command]
pub async fn save_document_position(
    document_id: String,
    position: DocumentPosition,
    repo: State<'_, crate::database::Repository>,
) -> Result<(), String> {
    let service = PositionService::new(repo.pool().clone());
    service.save_position(&document_id, &position).await
        .map_err(|e| e.to_string())
}

/// Get progress percentage for a document
#[tauri::command]
pub async fn get_document_progress(
    document_id: String,
    repo: State<'_, crate::database::Repository>,
) -> Result<Option<f32>, String> {
    let service = PositionService::new(repo.pool().clone());
    // Try unified progress first, fall back to legacy calculation
    let progress = service.get_progress(&document_id).await
        .map_err(|e| e.to_string())?;
    if progress.is_none() {
        let legacy = service.calculate_progress_from_legacy(&document_id).await
            .map_err(|e| e.to_string())?;
        Ok(Some(legacy))
    } else {
        Ok(progress)
    }
}

/// Create a bookmark at the current position
#[tauri::command]
pub async fn create_bookmark(
    document_id: String,
    name: String,
    position: DocumentPosition,
    repo: State<'_, crate::database::Repository>,
) -> Result<Bookmark, String> {
    let service = PositionService::new(repo.pool().clone());
    service.create_bookmark(&document_id, &name, &position).await
        .map_err(|e| e.to_string())
}

/// List all bookmarks for a document
#[tauri::command]
pub async fn list_bookmarks(
    document_id: String,
    repo: State<'_, crate::database::Repository>,
) -> Result<Vec<Bookmark>, String> {
    let service = PositionService::new(repo.pool().clone());
    service.list_bookmarks(&document_id).await
        .map_err(|e| e.to_string())
}

/// Delete a bookmark
#[tauri::command]
pub async fn delete_bookmark(
    bookmark_id: String,
    repo: State<'_, crate::database::Repository>,
) -> Result<(), String> {
    let service = PositionService::new(repo.pool().clone());
    service.delete_bookmark(&bookmark_id).await
        .map_err(|e| e.to_string())
}

/// Start a reading session
#[tauri::command]
pub async fn start_reading_session(
    document_id: String,
    progress_start: f32,
    repo: State<'_, crate::database::Repository>,
) -> Result<crate::models::position::ReadingSession, String> {
    let service = PositionService::new(repo.pool().clone());
    service.start_reading_session(&document_id, progress_start).await
        .map_err(|e| e.to_string())
}

/// End a reading session
#[tauri::command]
pub async fn end_reading_session(
    session_id: String,
    progress_end: f32,
    repo: State<'_, crate::database::Repository>,
) -> Result<(), String> {
    let service = PositionService::new(repo.pool().clone());
    service.end_reading_session(&session_id, progress_end).await
        .map_err(|e| e.to_string())
}

/// Get active reading session for a document
#[tauri::command]
pub async fn get_active_session(
    document_id: String,
    repo: State<'_, crate::database::Repository>,
) -> Result<Option<crate::models::position::ReadingSession>, String> {
    let service = PositionService::new(repo.pool().clone());
    service.get_active_session(&document_id).await
        .map_err(|e| e.to_string())
}

/// Get documents with reading progress (for Continue Reading page)
#[tauri::command]
pub async fn get_documents_with_progress(
    limit: Option<u32>,
    repo: State<'_, crate::database::Repository>,
) -> Result<Vec<(String, f32, String, i32)>, String> {
    let service = PositionService::new(repo.pool().clone());
    service.get_documents_with_progress(limit).await
        .map_err(|e| e.to_string())
}

/// Get daily reading statistics
#[tauri::command]
pub async fn get_daily_reading_stats(
    days: Option<u32>,
    repo: State<'_, crate::database::Repository>,
) -> Result<Vec<(String, u32, u32)>, String> {
    let service = PositionService::new(repo.pool().clone());
    let days_to_fetch = days.unwrap_or(30);
    service.get_daily_stats(days_to_fetch).await
        .map_err(|e| e.to_string())
}
