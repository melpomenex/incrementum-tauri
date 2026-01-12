//! Screenshot capture functionality

#[cfg(feature = "screenshot")]
use crate::error::{IncrementumError, Result};
#[cfg(feature = "screenshot")]
use base64::{engine::general_purpose, Engine as _};
#[cfg(feature = "screenshot")]
use std::io::Cursor;
#[cfg(feature = "screenshot")]
use xcap::{Monitor, Window};

/// Capture a screenshot of the primary screen
#[cfg(feature = "screenshot")]
#[tauri::command]
pub async fn capture_screenshot() -> Result<String> {
    let monitors = Monitor::all()
        .map_err(|err| IncrementumError::Internal(format!("Failed to enumerate monitors: {err}")))?;
    let monitor = monitors
        .iter()
        .find(|m| m.is_primary())
        .or_else(|| monitors.first())
        .ok_or_else(|| IncrementumError::NotFound("No monitors available".to_string()))?;

    let image = monitor
        .capture_image()
        .map_err(|err| IncrementumError::Internal(format!("Failed to capture screen: {err}")))?;
    encode_image(image)
}

/// Capture a screenshot of a specific screen by index
#[cfg(feature = "screenshot")]
#[tauri::command]
pub async fn capture_screen_by_index(index: usize) -> Result<String> {
    let monitors = Monitor::all()
        .map_err(|err| IncrementumError::Internal(format!("Failed to enumerate monitors: {err}")))?;
    let monitor = monitors.get(index).ok_or_else(|| {
        IncrementumError::InvalidInput(format!("Screen index {index} out of range"))
    })?;

    let image = monitor
        .capture_image()
        .map_err(|err| IncrementumError::Internal(format!("Failed to capture screen: {err}")))?;
    encode_image(image)
}

/// Get information about all available screens
#[cfg(feature = "screenshot")]
#[tauri::command]
pub fn get_screen_info() -> Vec<ScreenInfo> {
    let monitors = Monitor::all().unwrap_or_default();

    monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| ScreenInfo {
            index,
            width: monitor.width(),
            height: monitor.height(),
            x: monitor.x(),
            y: monitor.y(),
            scale_factor: monitor.scale_factor(),
            is_primary: monitor.is_primary(),
        })
        .collect()
}

/// Capture a screenshot of the app window by title
#[cfg(feature = "screenshot")]
#[tauri::command]
pub async fn capture_app_window() -> Result<String> {
    let windows = Window::all()
        .map_err(|err| IncrementumError::Internal(format!("Failed to enumerate windows: {err}")))?;
    let window = windows
        .iter()
        .find(|w| w.title() == "Incrementum")
        .or_else(|| windows.first())
        .ok_or_else(|| IncrementumError::NotFound("No windows available".to_string()))?;

    let image = window
        .capture_image()
        .map_err(|err| IncrementumError::Internal(format!("Failed to capture window: {err}")))?;
    encode_image(image)
}

#[cfg(feature = "screenshot")]
fn encode_image(image: xcap::image::ImageBuffer<xcap::image::Rgba<u8>, Vec<u8>>) -> Result<String> {
    let mut buffer = Vec::new();
    // Convert xcap's image buffer to the project's image type
    let width = image.width();
    let height = image.height();
    let raw_data = image.into_raw();

    let image_buffer = image::ImageBuffer::from_raw(width, height, raw_data)
        .ok_or_else(|| IncrementumError::Internal("Failed to create image buffer".to_string()))?;
    let dynamic_image = image::DynamicImage::ImageRgba8(image_buffer);

    dynamic_image
        .write_to(&mut Cursor::new(&mut buffer), image::ImageOutputFormat::Png)
        .map_err(|err| IncrementumError::Internal(format!("Failed to encode screenshot: {err}")))?;
    Ok(general_purpose::STANDARD.encode(buffer))
}

#[cfg(feature = "screenshot")]
#[derive(Debug, serde::Serialize)]
pub struct ScreenInfo {
    pub index: usize,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f32,
    pub is_primary: bool,
}
