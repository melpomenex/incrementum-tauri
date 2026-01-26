//! Position tracking service for unified document position management

use crate::error::{IncrementumError, Result};
use crate::models::position::{Bookmark, DocumentPosition, ReadingSession};
use sqlx::{Pool, Sqlite};
use uuid::Uuid;

/// Position service for managing document positions, bookmarks, and reading sessions
pub struct PositionService {
    pool: Pool<Sqlite>,
}

impl PositionService {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    // =========================================================================
    // Position Management
    // =========================================================================

    /// Save unified position for a document
    pub async fn save_position(
        &self,
        document_id: &str,
        position: &DocumentPosition,
    ) -> Result<()> {
        let position_json = serde_json::to_string(position)
            .map_err(|e| IncrementumError::Internal(format!("Failed to serialize position: {}", e)))?;

        let progress = position.progress_percent().unwrap_or(0.0);

        sqlx::query(
            r#"
            UPDATE documents
            SET position_json = ?1, progress_percent = ?2, date_modified = datetime('now')
            WHERE id = ?3
            "#,
        )
        .bind(&position_json)
        .bind(progress)
        .bind(document_id)
        .execute(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to save position: {}", e)))?;

        Ok(())
    }

    /// Get the saved position for a document
    pub async fn get_position(&self, document_id: &str) -> Result<Option<DocumentPosition>> {
        let row = sqlx::query_as::<_, (Option<String>,)>(
            "SELECT position_json FROM documents WHERE id = ?1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get position: {}", e)))?;

        if let Some((position_json,)) = row {
            if let Some(json) = position_json {
                let position: DocumentPosition = serde_json::from_str(&json)
                    .map_err(|e| IncrementumError::Internal(format!("Failed to deserialize position: {}", e)))?;
                Ok(Some(position))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    /// Get progress percentage for a document
    pub async fn get_progress(&self, document_id: &str) -> Result<Option<f32>> {
        let row = sqlx::query_as::<_, (Option<f64>,)>(
            "SELECT progress_percent FROM documents WHERE id = ?1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get progress: {}", e)))?;

        Ok(row.and_then(|(p,)| p.map(|v| v as f32)))
    }

    /// Calculate overall progress from legacy position fields
    /// This is used as a fallback when position_json is not available
    pub async fn calculate_progress_from_legacy(
        &self,
        document_id: &str,
    ) -> Result<f32> {
        let row = sqlx::query_as::<_, (Option<i32>, Option<f64>, Option<i32>)>(
            "SELECT current_page, current_scroll_percent, total_pages FROM documents WHERE id = ?1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get legacy position: {}", e)))?;

        if let Some((current_page, scroll_percent, total_pages)) = row {
            if let Some(page) = current_page {
                if let Some(total) = total_pages {
                    if total > 0 {
                        return Ok((page as f32 / total as f32) * 100.0);
                    }
                }
            }
            if let Some(scroll) = scroll_percent {
                return Ok(scroll as f32);
            }
        }

        Ok(0.0)
    }

    // =========================================================================
    // Bookmarks
    // =========================================================================

    /// Create a new bookmark
    pub async fn create_bookmark(
        &self,
        document_id: &str,
        name: &str,
        position: &DocumentPosition,
    ) -> Result<Bookmark> {
        let id = Uuid::new_v4().to_string();
        let position_json = serde_json::to_string(position)
            .map_err(|e| IncrementumError::Internal(format!("Failed to serialize position: {}", e)))?;
        let position_type = position.type_name().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO bookmarks (id, document_id, name, position_json, position_type, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
        )
        .bind(&id)
        .bind(document_id)
        .bind(name)
        .bind(&position_json)
        .bind(&position_type)
        .bind(&created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to create bookmark: {}", e)))?;

        Ok(Bookmark {
            id,
            document_id: document_id.to_string(),
            name: name.to_string(),
            position: position.clone(),
            thumbnail: None,
            created_at: chrono::Utc::now(),
        })
    }

    /// List all bookmarks for a document
    pub async fn list_bookmarks(&self, document_id: &str) -> Result<Vec<Bookmark>> {
        let rows = sqlx::query_as::<_, (String, String, String, String, String)>(
            "SELECT id, name, position_json, thumbnail, created_at FROM bookmarks WHERE document_id = ?1 ORDER BY created_at ASC"
        )
        .bind(document_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to list bookmarks: {}", e)))?;

        let mut bookmarks = Vec::new();
        for (id, name, position_json, thumbnail, created_at) in rows {
            let position: DocumentPosition = serde_json::from_str(&position_json)
                .map_err(|e| IncrementumError::Internal(format!("Failed to deserialize position: {}", e)))?;
            let created = chrono::DateTime::parse_from_rfc3339(&created_at)
                .map_err(|e| IncrementumError::Internal(format!("Failed to parse date: {}", e)))?
                .with_timezone(&chrono::Utc);

            bookmarks.push(Bookmark {
                id,
                document_id: document_id.to_string(),
                name,
                position,
                thumbnail: Some(thumbnail),
                created_at: created,
            });
        }

        Ok(bookmarks)
    }

    /// Delete a bookmark
    pub async fn delete_bookmark(&self, bookmark_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM bookmarks WHERE id = ?1")
            .bind(bookmark_id)
            .execute(&self.pool)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to delete bookmark: {}", e)))?;

        Ok(())
    }

    // =========================================================================
    // Reading Sessions
    // =========================================================================

    /// Start a new reading session
    pub async fn start_reading_session(
        &self,
        document_id: &str,
        progress_start: f32,
    ) -> Result<ReadingSession> {
        let id = Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO reading_sessions (id, document_id, started_at, progress_start, progress_end)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
        )
        .bind(&id)
        .bind(document_id)
        .bind(&started_at)
        .bind(progress_start)
        .bind(progress_start)
        .execute(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to start session: {}", e)))?;

        Ok(ReadingSession {
            id,
            document_id: document_id.to_string(),
            started_at: chrono::Utc::now(),
            ended_at: None,
            duration_seconds: 0,
            pages_read: None,
            progress_start,
            progress_end: progress_start,
        })
    }

    /// End a reading session
    pub async fn end_reading_session(
        &self,
        session_id: &str,
        progress_end: f32,
    ) -> Result<()> {
        let ended_at = chrono::Utc::now().to_rfc3339();

        // Calculate duration
        let session_info = sqlx::query_as::<_, (String,)>(
            "SELECT started_at FROM reading_sessions WHERE id = ?1"
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get session: {}", e)))?;

        if let Some((started_at,)) = session_info {
            let start = chrono::DateTime::parse_from_rfc3339(&started_at)
                .map_err(|e| IncrementumError::Internal(format!("Failed to parse date: {}", e)))?;
            let end = chrono::Utc::now();
            let duration = end.signed_duration_since(start.with_timezone(&chrono::Utc));
            let duration_seconds = duration.num_seconds() as u32;

            sqlx::query(
                r#"
                UPDATE reading_sessions
                SET ended_at = ?1, duration_seconds = ?2, progress_end = ?3
                WHERE id = ?4
                "#,
            )
            .bind(&ended_at)
            .bind(duration_seconds)
            .bind(progress_end)
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to end session: {}", e)))?;
        }

        Ok(())
    }

    /// Get active session for a document
    pub async fn get_active_session(&self, document_id: &str) -> Result<Option<ReadingSession>> {
        let row = sqlx::query_as::<_, (String, String, String, Option<String>, u32, Option<u32>, f64, f64)>(
            "SELECT id, document_id, started_at, ended_at, duration_seconds, pages_read, progress_start, progress_end
             FROM reading_sessions WHERE document_id = ?1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get active session: {}", e)))?;

        if let Some((id, doc_id, started_at, ended_at, duration, pages_read, progress_start, progress_end)) = row {
            let started = chrono::DateTime::parse_from_rfc3339(&started_at)
                .map_err(|e| IncrementumError::Internal(format!("Failed to parse date: {}", e)))?
                .with_timezone(&chrono::Utc);
            let ended = ended_at.and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok())
                .map(|d| d.with_timezone(&chrono::Utc));

            Ok(Some(ReadingSession {
                id,
                document_id: doc_id,
                started_at: started,
                ended_at: ended,
                duration_seconds: duration,
                pages_read: pages_read,
                progress_start: progress_start as f32,
                progress_end: progress_end as f32,
            }))
        } else {
            Ok(None)
        }
    }

    // =========================================================================
    // Statistics & Queries
    // =========================================================================

    /// Get documents with reading progress (for Continue Reading page)
    pub async fn get_documents_with_progress(
        &self,
        limit: Option<u32>,
    ) -> Result<Vec<(String, f32, String, i32)>> {
        let limit_val = limit.unwrap_or(50) as i64;
        let rows = sqlx::query_as::<_, (String, f64, String, i32)>(
            r#"
            SELECT id, COALESCE(progress_percent, 0) as progress, title, date_modified
            FROM documents
            WHERE progress_percent > 0 AND is_archived = 0
            ORDER BY date_modified DESC
            LIMIT ?1
            "#,
        )
        .bind(limit_val)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get documents with progress: {}", e)))?;

        Ok(rows.into_iter()
            .map(|(id, progress, title, date_modified)| {
                (id, progress as f32, title, date_modified)
            })
            .collect())
    }

    /// Get daily reading stats for streak calculation
    pub async fn get_daily_stats(&self, days: u32) -> Result<Vec<(String, u32, u32)>> {
        let rows = sqlx::query_as::<_, (String, u32, u32)>(
            r#"
            SELECT
                DATE(started_at) as date,
                SUM(duration_seconds) as total_seconds,
                COUNT(DISTINCT document_id) as documents_read
            FROM reading_sessions
            WHERE started_at >= date('now', '-' || ?1 || ' days')
            AND ended_at IS NOT NULL
            GROUP BY DATE(started_at)
            ORDER BY date DESC
            "#,
        )
        .bind(days as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get daily stats: {}", e)))?;

        Ok(rows)
    }
}
