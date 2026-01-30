//! YouTube playlist auto-import commands

use tauri::State;
use sqlx::Row;
use crate::database::Repository;
use crate::models::{PlaylistSubscription, PlaylistVideo, PlaylistSettings, Document, FileType};
use crate::youtube::{get_playlist_info, extract_video_info};
use crate::error::{Result, IncrementumError};

/// Import a YouTube video as a document (helper function)
async fn import_youtube_video_as_document(
    url: String,
    repo: &Repository,
) -> Result<Document> {
    // First, verify yt-dlp is available
    let ytdlp_available = crate::youtube::check_ytdlp_installed()
        .map_err(|e| IncrementumError::Internal(format!("Failed to check yt-dlp: {}", e)))?;

    if !ytdlp_available {
        return Err(IncrementumError::Internal("yt-dlp is not installed".to_string()));
    }

    // Extract video info
    let info = extract_video_info(&url)
        .map_err(|e| IncrementumError::Internal(format!("Failed to fetch video info: {}", e)))?;

    // Extract video ID for the file path
    let video_id = &info.id;

    // Create document record for YouTube video
    let mut doc = Document::new(info.title.clone(), format!("https://www.youtube.com/watch?v={}", video_id), FileType::Youtube);

    // Set YouTube-specific fields
    doc.category = Some("YouTube Videos".to_string());
    doc.tags = vec!["youtube".to_string(), "video".to_string()];
    doc.total_pages = Some(info.duration as i32);
    doc.priority_score = 7.0; // YouTube videos get higher priority
    if !info.thumbnail.is_empty() {
        doc.cover_image_url = Some(info.thumbnail.clone());
        doc.cover_image_source = Some("youtube".to_string());
    }

    // Set metadata with YouTube info
    // Use current time if publish_date is not available or invalid
    let created_at = chrono::Utc::now();

    doc.metadata = Some(crate::models::DocumentMetadata {
        author: Some(info.channel),
        subject: None,
        keywords: if info.tags.is_empty() { None } else { Some(info.tags) },
        created_at: Some(created_at),
        modified_at: None,
        file_size: None,
        language: Some("en".to_string()),
        page_count: None,
        word_count: None,
    });

    // Save to database
    let created = repo.create_document(&doc).await
        .map_err(|e| IncrementumError::Internal(format!("Failed to save document: {}", e)))?;

    Ok(created)
}

/// Subscribe to a YouTube playlist for auto-import
#[tauri::command]
pub async fn subscribe_to_playlist(
    playlist_url: String,
    repo: State<'_, Repository>,
) -> Result<PlaylistSubscription> {
    eprintln!("[YouTube Playlist] Subscribing to: {}", playlist_url);
    
    // Extract playlist ID from URL
    let playlist_id = extract_playlist_id(&playlist_url)
        .ok_or_else(|| IncrementumError::Internal(
            format!("Invalid YouTube playlist URL: {}", playlist_url)
        ))?;
    
    eprintln!("[YouTube Playlist] Extracted playlist ID: {}", playlist_id);

    // Check if already subscribed
    if let Some(existing) = repo.get_playlist_subscription_by_playlist_id(&playlist_id).await? {
        eprintln!("[YouTube Playlist] Already subscribed, returning existing");
        return Ok(existing);
    }

    // Check yt-dlp availability first
    let ytdlp_available = crate::youtube::check_ytdlp_installed()
        .map_err(|e| IncrementumError::Internal(format!("Failed to check yt-dlp: {}", e)))?;
    
    if !ytdlp_available {
        return Err(IncrementumError::Internal(
            "yt-dlp is not installed or not in PATH. Please install yt-dlp: https://github.com/yt-dlp/yt-dlp#installation".to_string()
        ));
    }
    
    eprintln!("[YouTube Playlist] yt-dlp is available, fetching playlist info...");

    // Fetch playlist info from YouTube
    let playlist_info = get_playlist_info(&playlist_url)
        .map_err(|e| IncrementumError::Internal(format!("yt-dlp error: {}", e)))?;
    
    eprintln!("[YouTube Playlist] Got playlist info: title={:?}, entries={:?}", 
        playlist_info["title"].as_str(),
        playlist_info["entries"].as_array().map(|a| a.len())
    );

    let id = uuid::Uuid::new_v4().to_string();
    let title = playlist_info["title"].as_str().map(|s| s.to_string());
    let channel = playlist_info["channel"].as_str().map(|s| s.to_string());
    let channel_id = playlist_info["channel_id"].as_str().map(|s| s.to_string());
    let description = playlist_info["description"].as_str().map(|s| s.to_string());
    
    // Count videos
    let total_videos = playlist_info["entries"]
        .as_array()
        .map(|arr| arr.len() as i32);

    // Create subscription
    repo.create_playlist_subscription(
        &id,
        &playlist_id,
        &playlist_url,
        title.as_deref(),
        channel.as_deref(),
        channel_id.as_deref(),
        description.as_deref(),
        None, // thumbnail_url
        total_videos,
    ).await?;

    // Fetch videos and add to tracking
    if let Some(entries) = playlist_info["entries"].as_array() {
        eprintln!("[YouTube Playlist] Processing {} entries", entries.len());
        for (position, entry) in entries.iter().enumerate() {
            // With --flat-playlist, the ID might be in different fields
            let video_id = entry["id"].as_str()
                .or_else(|| entry["url"].as_str());
            
            if let Some(video_id) = video_id {
                eprintln!("[YouTube Playlist] Entry {}: video_id = {}", position, video_id);
                let video_uuid = uuid::Uuid::new_v4().to_string();
                let video_title = entry["title"].as_str().map(|s| s.to_string());
                let duration = entry["duration"].as_i64().map(|d| d as i32);
                
                // Check if video already exists as a document
                let video_url = format!("https://www.youtube.com/watch?v={}", video_id);
                let existing_doc = repo.find_document_by_url(&video_url).await?;
                
                match repo.add_playlist_video(
                    &video_uuid,
                    &id,
                    video_id,
                    video_title.as_deref(),
                    duration,
                    None, // thumbnail_url
                    Some(position as i32),
                    None, // published_at
                ).await {
                    Ok(_) => eprintln!("[YouTube Playlist] Added video {} to tracking", video_id),
                    Err(e) => eprintln!("[YouTube Playlist] Failed to add video {}: {}", video_id, e),
                }

                // If video already exists as document, mark it as imported
                if let Some(doc) = existing_doc {
                    let _ = repo.mark_video_imported(&video_uuid, &doc.id).await;
                }
            } else {
                eprintln!("[YouTube Playlist] Entry {}: No video ID found. Entry keys: {:?}", 
                    position, 
                    entry.as_object().map(|o| o.keys().cloned().collect::<Vec<_>>()));
            }
        }
    } else {
        eprintln!("[YouTube Playlist] No entries array found in playlist_info");
    }

    // Return the created subscription
    repo.get_playlist_subscription(&id)
        .await?
        .ok_or_else(|| IncrementumError::Internal("Subscription not found".to_string()))
}

/// Get all playlist subscriptions
#[tauri::command]
pub async fn get_playlist_subscriptions(
    repo: State<'_, Repository>,
) -> Result<Vec<PlaylistSubscription>> {
    repo.get_playlist_subscriptions().await
}

/// Get a single playlist subscription with its videos
#[tauri::command]
pub async fn get_playlist_subscription(
    subscription_id: String,
    repo: State<'_, Repository>,
) -> Result<PlaylistSubscriptionDetail> {
    let subscription = repo.get_playlist_subscription(&subscription_id)
        .await?
        .ok_or_else(|| crate::error::IncrementumError::NotFound("Subscription".to_string()))?;

    let videos = repo.get_playlist_videos(&subscription_id, false).await?;

    Ok(PlaylistSubscriptionDetail {
        subscription,
        videos,
    })
}

/// Update playlist subscription settings
#[tauri::command]
pub async fn update_playlist_subscription(
    subscription_id: String,
    title: Option<String>,
    is_active: Option<bool>,
    auto_import_new: Option<bool>,
    queue_intersperse_interval: Option<i32>,
    priority_rating: Option<i32>,
    refresh_interval_hours: Option<i32>,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.update_playlist_subscription(
        &subscription_id,
        title.as_deref(),
        is_active,
        auto_import_new,
        queue_intersperse_interval,
        priority_rating,
        refresh_interval_hours,
    ).await
}

/// Delete a playlist subscription
#[tauri::command]
pub async fn delete_playlist_subscription(
    subscription_id: String,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.delete_playlist_subscription(&subscription_id).await
}

/// Refresh a playlist - fetch latest videos and import new ones
#[tauri::command]
pub async fn refresh_playlist(
    subscription_id: String,
    auto_import: bool,
    repo: State<'_, Repository>,
) -> Result<PlaylistRefreshResult> {
    let subscription = repo.get_playlist_subscription(&subscription_id)
        .await?
        .ok_or_else(|| IncrementumError::Internal("Subscription not found".to_string()))?;

    // Fetch latest playlist info
    let playlist_info = get_playlist_info(&subscription.playlist_url)
        .map_err(|e| IncrementumError::Internal(format!("Failed to fetch playlist: {}", e)))?;

    let mut new_videos_found = 0;
    let mut imported_count = 0;

    // Process videos
    if let Some(entries) = playlist_info["entries"].as_array() {
        for (position, entry) in entries.iter().enumerate() {
            if let Some(video_id) = entry["id"].as_str() {
                let video_title = entry["title"].as_str().map(|s| s.to_string());
                let duration = entry["duration"].as_i64().map(|d| d as i32);
                
                let video_uuid = uuid::Uuid::new_v4().to_string();
                
                // Try to add video (will fail silently if already exists due to UNIQUE constraint)
                let added = repo.add_playlist_video(
                    &video_uuid,
                    &subscription_id,
                    video_id,
                    video_title.as_deref(),
                    duration,
                    None,
                    Some(position as i32),
                    None,
                ).await.is_ok();

                if added {
                    new_videos_found += 1;

                    // Auto-import if enabled
                    if auto_import && subscription.auto_import_new {
                        let video_url = format!("https://www.youtube.com/watch?v={}", video_id);
                        
                        // Check if already exists as document
                        match repo.find_document_by_url(&video_url).await? {
                            Some(doc) => {
                                // Mark as imported with existing document
                                let _ = repo.mark_video_imported(&video_uuid, &doc.id).await;
                            }
                            None => {
                                // Import as new document
                                match import_youtube_video_as_document(video_url, repo.inner()).await {
                                    Ok(doc) => {
                                        let _ = repo.mark_video_imported(&video_uuid, &doc.id).await;
                                        imported_count += 1;
                                    }
                                    Err(_) => {
                                        // Continue on import error
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Update last refreshed timestamp
    repo.update_playlist_last_refreshed(&subscription_id).await?;

    Ok(PlaylistRefreshResult {
        new_videos_found,
        imported_count,
    })
}

/// Import a specific video from a playlist
#[tauri::command]
pub async fn import_playlist_video(
    playlist_video_id: String,
    repo: State<'_, Repository>,
) -> Result<Document> {
    // Get the playlist video info
    let rows = sqlx::query(
        r#"
        SELECT pv.*, ps.playlist_id FROM youtube_playlist_videos pv
        JOIN youtube_playlist_subscriptions ps ON pv.subscription_id = ps.id
        WHERE pv.id = ?1
        "#
    )
    .bind(&playlist_video_id)
    .fetch_all(repo.pool())
    .await
    .map_err(IncrementumError::Database)?;

    if rows.is_empty() {
        return Err(IncrementumError::Internal("Playlist video not found".to_string()));
    }

    let row = &rows[0];
    let video_id: String = row.get("video_id");
    let is_imported: i32 = row.get("is_imported");
    let existing_doc_id: Option<String> = row.get("document_id");

    // If already imported, return existing document
    if is_imported != 0 {
        if let Some(doc_id) = existing_doc_id {
            if let Some(doc) = repo.get_document(&doc_id).await? {
                return Ok(doc);
            }
        }
    }

    // Import the video
    let video_url = format!("https://www.youtube.com/watch?v={}", video_id);
    let doc = import_youtube_video_as_document(video_url, repo.inner()).await?;

    // Mark as imported
    repo.mark_video_imported(&playlist_video_id, &doc.id).await?;

    Ok(doc)
}

/// Get all unimported videos from playlists
#[tauri::command]
pub async fn get_unimported_playlist_videos(
    repo: State<'_, Repository>,
) -> Result<Vec<PlaylistVideoWithInfo>> {
    let rows = sqlx::query(
        r#"
        SELECT pv.*, ps.title as subscription_title, ps.channel_name 
        FROM youtube_playlist_videos pv
        JOIN youtube_playlist_subscriptions ps ON pv.subscription_id = ps.id
        WHERE pv.is_imported = 0 AND ps.is_active = 1
        ORDER BY pv.discovered_at DESC
        "#
    )
    .fetch_all(repo.pool())
    .await
    .map_err(IncrementumError::Database)?;

    Ok(rows.into_iter().map(|row| {
        PlaylistVideoWithInfo {
            id: row.get("id"),
            subscription_id: row.get("subscription_id"),
            video_id: row.get("video_id"),
            video_title: row.try_get("video_title").ok(),
            video_duration: row.try_get("video_duration").ok(),
            thumbnail_url: row.try_get("thumbnail_url").ok(),
            position: row.try_get("position").ok(),
            is_imported: row.get::<i32, _>("is_imported") != 0,
            document_id: row.try_get("document_id").ok(),
            added_to_queue: row.get::<i32, _>("added_to_queue") != 0,
            queue_position: row.try_get("queue_position").ok(),
            published_at: row.try_get("published_at").ok(),
            discovered_at: row.get("discovered_at"),
            imported_at: row.try_get("imported_at").ok(),
            subscription_title: row.try_get("subscription_title").ok(),
            channel_name: row.try_get("channel_name").ok(),
        }
    }).collect())
}

/// Get playlist settings
#[tauri::command]
pub async fn get_playlist_settings(
    repo: State<'_, Repository>,
) -> Result<PlaylistSettings> {
    repo.get_playlist_settings().await
}

/// Update playlist settings
#[tauri::command]
pub async fn update_playlist_settings(
    enabled: Option<bool>,
    default_intersperse_interval: Option<i32>,
    default_priority: Option<i32>,
    max_consecutive_playlist_videos: Option<i32>,
    prefer_new_videos: Option<bool>,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.update_playlist_settings(
        enabled,
        default_intersperse_interval,
        default_priority,
        max_consecutive_playlist_videos,
        prefer_new_videos,
    ).await
}

/// Get queue items from playlist videos that need interspersion
/// This returns documents that should be inserted into the queue at specific positions
#[tauri::command]
pub async fn get_playlist_queue_items(
    limit: Option<i32>,
    repo: State<'_, Repository>,
) -> Result<Vec<PlaylistQueueItem>> {
    let settings = repo.get_playlist_settings().await?;
    
    if !settings.enabled {
        return Ok(vec![]);
    }

    let limit = limit.unwrap_or(10);

    let rows = sqlx::query(
        r#"
        SELECT 
            pv.id as playlist_video_id,
            pv.video_id,
            pv.video_title,
            pv.document_id,
            ps.id as subscription_id,
            ps.title as subscription_title,
            ps.queue_intersperse_interval,
            ps.priority_rating,
            d.title as document_title,
            d.file_path as document_url
        FROM youtube_playlist_videos pv
        JOIN youtube_playlist_subscriptions ps ON pv.subscription_id = ps.id
        JOIN documents d ON pv.document_id = d.id
        WHERE pv.is_imported = 1 
          AND pv.added_to_queue = 0
          AND ps.is_active = 1
        ORDER BY 
            CASE WHEN ?1 = 1 THEN pv.discovered_at END DESC,
            CASE WHEN ?1 = 0 THEN pv.position END ASC
        LIMIT ?2
        "#
    )
    .bind(settings.prefer_new_videos)
    .bind(limit)
    .fetch_all(repo.pool())
    .await
    .map_err(IncrementumError::Database)?;

    Ok(rows.into_iter().map(|row| {
        PlaylistQueueItem {
            playlist_video_id: row.get("playlist_video_id"),
            video_id: row.get("video_id"),
            video_title: row.try_get("video_title").ok(),
            document_id: row.get("document_id"),
            document_title: row.get("document_title"),
            document_url: row.get("document_url"),
            subscription_id: row.get("subscription_id"),
            subscription_title: row.try_get("subscription_title").ok(),
            intersperse_interval: row.get("queue_intersperse_interval"),
            priority_rating: row.get("priority_rating"),
        }
    }).collect())
}

/// Mark a playlist video as added to the queue at a specific position
#[tauri::command]
pub async fn mark_playlist_video_queued(
    playlist_video_id: String,
    queue_position: i32,
    repo: State<'_, Repository>,
) -> Result<()> {
    repo.mark_video_added_to_queue(&playlist_video_id, queue_position).await
}

// Helper functions

fn extract_playlist_id(url: &str) -> Option<String> {
    // Handle various YouTube playlist URL formats
    let patterns = [
        r"[?&]list=([a-zA-Z0-9_-]+)",
    ];

    for pattern in &patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            if let Some(caps) = re.captures(url) {
                if let Some(id) = caps.get(1) {
                    return Some(id.as_str().to_string());
                }
            }
        }
    }

    None
}

// Response types

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaylistSubscriptionDetail {
    pub subscription: PlaylistSubscription,
    pub videos: Vec<PlaylistVideo>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaylistRefreshResult {
    pub new_videos_found: i32,
    pub imported_count: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaylistVideoWithInfo {
    pub id: String,
    pub subscription_id: String,
    pub video_id: String,
    pub video_title: Option<String>,
    pub video_duration: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub position: Option<i32>,
    pub is_imported: bool,
    pub document_id: Option<String>,
    pub added_to_queue: bool,
    pub queue_position: Option<i32>,
    pub published_at: Option<String>,
    pub discovered_at: String,
    pub imported_at: Option<String>,
    pub subscription_title: Option<String>,
    pub channel_name: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaylistQueueItem {
    pub playlist_video_id: String,
    pub video_id: String,
    pub video_title: Option<String>,
    pub document_id: String,
    pub document_title: String,
    pub document_url: String,
    pub subscription_id: String,
    pub subscription_title: Option<String>,
    pub intersperse_interval: i32,
    pub priority_rating: i32,
}
