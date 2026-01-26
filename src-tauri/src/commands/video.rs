//! Video import and features commands
//! Handles importing local video files and video-specific features

use tauri::State;
use crate::database::Repository;
use crate::models::{Document, DocumentMetadata, FileType};

/// Video bookmark data structure
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VideoBookmark {
    pub id: String,
    pub document_id: String,
    pub title: String,
    pub time: f64,
    pub thumbnail_url: Option<String>,
    pub created_at: String,
}

/// Video chapter data structure
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VideoChapter {
    pub id: String,
    pub document_id: String,
    pub title: String,
    pub start_time: f64,
    pub end_time: f64,
    pub order: i32,
}

/// Video transcript segment
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VideoTranscriptSegment {
    pub time: f64,
    pub text: String,
}

/// Video transcript data structure
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VideoTranscript {
    pub document_id: String,
    pub transcript: String,
    pub segments: Vec<VideoTranscriptSegment>,
}

/// Import a local video file into the document system
#[tauri::command]
pub async fn import_video_file(
    filename: String,
    title: String,
    content: Vec<u8>,
    repo: State<'_, Repository>,
) -> Result<Document, String> {
    let now = chrono::Utc::now();

    // Get the video storage directory
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("incrementum")
        .join("videos");

    // Create the videos directory if it doesn't exist
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create video directory: {}", e))?;

    // Generate a unique filename to avoid conflicts
    let timestamp = now.timestamp();
    let safe_filename = filename
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_");
    let stored_filename = format!("{}-{}", timestamp, safe_filename);
    let file_path = data_dir.join(&stored_filename);

    // Write the video file to disk
    std::fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write video file: {}", e))?;

    // Create document for the video file
    let metadata = DocumentMetadata {
        author: None,
        subject: None,
        keywords: None,
        created_at: None,
        modified_at: None,
        file_size: Some(content.len() as i64),
        language: None,
        page_count: None,
        word_count: None,
    };

    let mut document = Document::new(title, file_path.to_string_lossy().to_string(), FileType::Video);
    document.category = Some("Videos".to_string());
    document.metadata = Some(metadata);
    document.current_page = Some(0);

    let created = repo.create_document(&document)
        .await
        .map_err(|e| format!("Failed to create document: {}", e))?;

    Ok(created)
}

/// Get the video storage directory path
#[tauri::command]
pub async fn get_video_storage_path() -> Result<String, String> {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("incrementum")
        .join("videos");

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create video directory: {}", e))?;

    Ok(data_dir.to_string_lossy().to_string())
}

/// Add a bookmark to a video
#[tauri::command]
pub async fn add_video_bookmark(
    document_id: String,
    title: Option<String>,
    time: f64,
    repo: State<'_, Repository>,
) -> Result<VideoBookmark, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let bookmark_title = title.unwrap_or_else(|| format!("Bookmark at {}", format_time(time)));

    repo.create_video_bookmark(&id, &document_id, &bookmark_title, time, None)
        .await
        .map_err(|e| format!("Failed to create bookmark: {}", e))?;

    Ok(VideoBookmark {
        id,
        document_id,
        title: bookmark_title,
        time,
        thumbnail_url: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Get all bookmarks for a video
#[tauri::command]
pub async fn get_video_bookmarks(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<VideoBookmark>, String> {
    repo.get_video_bookmarks(&document_id)
        .await
        .map_err(|e| format!("Failed to get bookmarks: {}", e))
}

/// Delete a video bookmark
#[tauri::command]
pub async fn delete_video_bookmark(
    bookmark_id: String,
    repo: State<'_, Repository>,
) -> Result<(), String> {
    repo.delete_video_bookmark(&bookmark_id)
        .await
        .map_err(|e| format!("Failed to delete bookmark: {}", e))
}

/// Set chapters for a video
#[tauri::command]
pub async fn set_video_chapters(
    document_id: String,
    chapters: Vec<VideoChapter>,
    repo: State<'_, Repository>,
) -> Result<(), String> {
    repo.set_video_chapters(&document_id, &chapters)
        .await
        .map_err(|e| format!("Failed to set chapters: {}", e))
}

/// Get all chapters for a video
#[tauri::command]
pub async fn get_video_chapters(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Vec<VideoChapter>, String> {
    repo.get_video_chapters(&document_id)
        .await
        .map_err(|e| format!("Failed to get chapters: {}", e))
}

/// Set transcript for a video
#[tauri::command]
pub async fn set_video_transcript(
    document_id: String,
    transcript: String,
    segments: Vec<VideoTranscriptSegment>,
    repo: State<'_, Repository>,
) -> Result<(), String> {
    let segments_json = serde_json::to_string(&segments)
        .map_err(|e| format!("Failed to serialize segments: {}", e))?;

    repo.set_video_transcript(&document_id, &transcript, &segments_json)
        .await
        .map_err(|e| format!("Failed to set transcript: {}", e))
}

/// Get transcript for a video
#[tauri::command]
pub async fn get_video_transcript(
    document_id: String,
    repo: State<'_, Repository>,
) -> Result<Option<VideoTranscript>, String> {
    let result = repo.get_video_transcript(&document_id)
        .await
        .map_err(|e| format!("Failed to get transcript: {}", e))?;

    match result {
        Some((transcript, segments_json)) => {
            let segments: Vec<VideoTranscriptSegment> = serde_json::from_str(&segments_json)
                .map_err(|e| format!("Failed to parse segments: {}", e))?;

            Ok(Some(VideoTranscript {
                document_id,
                transcript,
                segments,
            }))
        }
        None => Ok(None),
    }
}

/// Format time in seconds to MM:SS format
fn format_time(seconds: f64) -> String {
    let mins = (seconds / 60.0).floor() as i32;
    let secs = (seconds % 60.0).floor() as i32;
    format!("{}:{:02}", mins, secs)
}
