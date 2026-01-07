//! Database connection management

use sqlx::{Pool, Sqlite, SqlitePool, sqlite::SqliteConnectOptions};
use std::path::PathBuf;
use std::str::FromStr;

use crate::error::{IncrementumError, Result};

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Create a new database connection pool
    pub async fn new(path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Create connection options
        let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", path.display()))
            .map_err(|e| IncrementumError::Internal(format!("Invalid database path: {}", e)))?
            .create_if_missing(true);

        // Create connection pool
        let pool = SqlitePool::connect_with(options).await?;

        Ok(Self { pool })
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Run migrations - simplified version without sqlx::migrate! macro
    pub async fn migrate(&self) -> Result<()> {
        // For now, we'll just check if tables exist
        // In production, you'd want to use sqlx migrate or run migrations manually
        let result = sqlx::query(
            r#"
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='documents'
            "#,
        )
        .fetch_optional(self.pool())
        .await?;

        if result.is_none() {
            // Initialize schema
            self.init_schema().await?;
        }

        Ok(())
    }

    async fn init_schema(&self) -> Result<()> {
        // Create file types enum
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                content TEXT,
                content_hash TEXT,
                total_pages INTEGER,
                current_page INTEGER,
                category TEXT,
                tags TEXT NOT NULL DEFAULT '[]',
                date_added TEXT NOT NULL,
                date_modified TEXT NOT NULL,
                date_last_reviewed TEXT,
                extract_count INTEGER NOT NULL DEFAULT 0,
                learning_item_count INTEGER NOT NULL DEFAULT 0,
                priority_score REAL NOT NULL DEFAULT 0,
                is_archived INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                metadata TEXT
            )
            "#,
        )
        .execute(self.pool())
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS extracts (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                content TEXT NOT NULL,
                page_title TEXT,
                page_number INTEGER,
                highlight_color TEXT,
                notes TEXT,
                progressive_disclosure_level INTEGER NOT NULL DEFAULT 0,
                max_disclosure_level INTEGER NOT NULL DEFAULT 3,
                date_created TEXT NOT NULL,
                date_modified TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '[]',
                category TEXT,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(self.pool())
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS learning_items (
                id TEXT PRIMARY KEY,
                extract_id TEXT,
                document_id TEXT,
                item_type TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT,
                cloze_text TEXT,
                cloze_ranges TEXT,
                difficulty INTEGER NOT NULL DEFAULT 3,
                interval INTEGER NOT NULL DEFAULT 0,
                ease_factor REAL NOT NULL DEFAULT 2.5,
                due_date TEXT NOT NULL,
                date_created TEXT NOT NULL,
                date_modified TEXT NOT NULL,
                last_review_date TEXT,
                review_count INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                state TEXT NOT NULL DEFAULT 'new',
                is_suspended INTEGER NOT NULL DEFAULT 0,
                tags TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (extract_id) REFERENCES extracts(id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    /// Close the database connection
    pub async fn close(self) {
        self.pool.close().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_creation() {
        let db = Database::new(PathBuf::from(":memory:")).await;
        assert!(db.is_ok());
    }
}
