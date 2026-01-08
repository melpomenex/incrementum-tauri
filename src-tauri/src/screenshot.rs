//! Screenshot capture functionality
//!
//! NOTE: The screenshots crate API has changed. This module needs to be updated to use xcap
//! For now, returning placeholder data to allow compilation

use crate::error::{Result, IncrementumError};

/// Capture a screenshot of the primary screen
#[tauri::command]
pub async fn capture_screenshot() -> Result<String> {
    // TODO: Migrate to xcap crate (screenshots is deprecated)
    // For now, return a placeholder
    Err(IncrementumError::NotFound("Screenshot capture temporarily disabled - needs xcap migration".to_string()))
}

/// Capture a screenshot of a specific screen by index
#[tauri::command]
pub async fn capture_screen_by_index(_index: usize) -> Result<String> {
    // TODO: Migrate to xcap crate (screenshots is deprecated)
    Err(IncrementumError::NotFound("Screenshot capture temporarily disabled - needs xcap migration".to_string()))
}

/// Get information about all available screens
#[tauri::command]
pub fn get_screen_info() -> Vec<ScreenInfo> {
    // TODO: Migrate to xcap crate (screenshots is deprecated)
    // For now, return a placeholder
    vec![ScreenInfo {
        index: 0,
        width: 1920,
        height: 1080,
        scale_factor: 1.0,
        is_primary: true,
    }]
}

#[derive(Debug, serde::Serialize)]
pub struct ScreenInfo {
    pub index: usize,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
    pub is_primary: bool,
}
