//! Database migration system
//!
//! Tracks and applies database migrations in order.

use sqlx::{Pool, Sqlite};
use std::path::PathBuf;

use crate::error::{IncrementumError, Result};

/// Migration record stored in the database
#[derive(Debug)]
struct MigrationRecord {
    name: String,
    applied_at: String,
}

/// Migration that can be applied to the database
pub struct Migration {
    pub name: &'static str,
    pub sql: &'static str,
}

impl Migration {
    /// Create a new migration
    pub const fn new(name: &'static str, sql: &'static str) -> Self {
        Self { name, sql }
    }
}

/// All database migrations in order
pub const MIGRATIONS: &[Migration] = &[
    // Migration 001: Initial schema
    Migration::new(
        "001_initial_schema",
        r#"
        -- Create migration tracking table
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            color TEXT,
            icon TEXT,
            description TEXT,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL,
            document_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (parent_id) REFERENCES categories(id)
        );

        -- Documents table
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
            metadata TEXT,
            FOREIGN KEY (category) REFERENCES categories(id)
        );

        CREATE INDEX IF NOT EXISTS idx_documents_date_added ON documents(date_added);
        CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
        CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
        CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);

        -- Extracts table
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
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (category) REFERENCES categories(id)
        );

        CREATE INDEX IF NOT EXISTS idx_extracts_document_id ON extracts(document_id);
        CREATE INDEX IF NOT EXISTS idx_extracts_page_number ON extracts(page_number);

        -- Learning items table
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
        );

        CREATE INDEX IF NOT EXISTS idx_learning_items_due_date ON learning_items(due_date);
        CREATE INDEX IF NOT EXISTS idx_learning_items_state ON learning_items(state);
        CREATE INDEX IF NOT EXISTS idx_learning_items_extract_id ON learning_items(extract_id);
        CREATE INDEX IF NOT EXISTS idx_learning_items_document_id ON learning_items(document_id);

        -- Annotations table
        CREATE TABLE IF NOT EXISTS annotations (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            type TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            content TEXT,
            rect TEXT,
            color TEXT NOT NULL,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_annotations_document_id ON annotations(document_id);
        CREATE INDEX IF NOT EXISTS idx_annotations_page_number ON annotations(page_number);

        -- Review sessions table
        CREATE TABLE IF NOT EXISTS review_sessions (
            id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT,
            items_reviewed INTEGER NOT NULL DEFAULT 0,
            correct_answers INTEGER NOT NULL DEFAULT 0,
            total_time INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_review_sessions_start_time ON review_sessions(start_time);

        -- Review results table
        CREATE TABLE IF NOT EXISTS review_results (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            item_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            time_taken INTEGER NOT NULL,
            new_due_date TEXT NOT NULL,
            new_interval INTEGER NOT NULL,
            new_ease_factor REAL NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES review_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES learning_items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_review_results_session_id ON review_results(session_id);
        CREATE INDEX IF NOT EXISTS idx_review_results_item_id ON review_results(item_id);

        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            date_modified TEXT NOT NULL
        );

        -- RSS feeds table
        CREATE TABLE IF NOT EXISTS rss_feeds (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            update_interval INTEGER NOT NULL DEFAULT 3600,
            last_fetched TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            date_added TEXT NOT NULL,
            auto_queue INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_rss_feeds_is_active ON rss_feeds(is_active);

        -- RSS articles table
        CREATE TABLE IF NOT EXISTS rss_articles (
            id TEXT PRIMARY KEY,
            feed_id TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            author TEXT,
            published_date TEXT,
            content TEXT,
            summary TEXT,
            image_url TEXT,
            is_queued INTEGER NOT NULL DEFAULT 0,
            is_read INTEGER NOT NULL DEFAULT 0,
            date_added TEXT NOT NULL,
            FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_rss_articles_feed_id ON rss_articles(feed_id);
        CREATE INDEX IF NOT EXISTS idx_rss_articles_is_queued ON rss_articles(is_queued);
        "#,
    ),

    // Migration 002: Add FSRS memory state to learning_items
    Migration::new(
        "002_add_fsrs_memory_state",
        r#"
        ALTER TABLE learning_items ADD COLUMN memory_state_stability REAL;
        ALTER TABLE learning_items ADD COLUMN memory_state_difficulty REAL;
        "#,
    ),

    // Migration 003: Add AI conversations table
    Migration::new(
        "003_add_ai_conversations",
        r#"
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            title TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_ai_conversations_document_id ON ai_conversations(document_id);

        CREATE TABLE IF NOT EXISTS ai_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            tokens_used INTEGER,
            FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
        "#,
    ),

    // Migration 004: Add sync tables
    Migration::new(
        "004_add_sync_tables",
        r#"
        CREATE TABLE IF NOT EXISTS sync_config (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            endpoint TEXT,
            api_key TEXT,
            device_id TEXT NOT NULL UNIQUE,
            last_sync TEXT,
            auto_sync INTEGER NOT NULL DEFAULT 0,
            sync_interval INTEGER NOT NULL DEFAULT 3600,
            encryption_enabled INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            data TEXT,
            created_at TEXT NOT NULL,
            retrried_count INTEGER NOT NULL DEFAULT 0,
            last_error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
        "#,
    ),

    // Migration 005: Add document metadata
    Migration::new(
        "005_add_document_metadata",
        r#"
        -- Add language field to documents
        ALTER TABLE documents ADD COLUMN language TEXT;

        -- Add word count field
        ALTER TABLE documents ADD COLUMN word_count INTEGER;

        -- Add reading time estimate (in minutes)
        ALTER TABLE documents ADD COLUMN reading_time INTEGER;

        -- Add source URL for imported content
        ALTER TABLE documents ADD COLUMN source_url TEXT;

        -- Add author field
        ALTER TABLE documents ADD COLUMN author TEXT;

        -- Create index for language
        CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
        "#,
    ),

    // Migration 006: Add extract statistics
    Migration::new(
        "006_add_extract_statistics",
        r#"
        -- Add character count to extracts
        ALTER TABLE extracts ADD COLUMN char_count INTEGER;

        -- Add word count to extracts
        ALTER TABLE extracts ADD COLUMN word_count INTEGER;

        -- Add AI-generated summary
        ALTER TABLE extracts ADD COLUMN summary TEXT;

        -- Add AI-generated key points
        ALTER TABLE extracts ADD COLUMN key_points TEXT;
        "#,
    ),

    // Migration 007: Add study statistics
    Migration::new(
        "007_add_study_statistics",
        r#"
        CREATE TABLE IF NOT EXISTS study_statistics (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL UNIQUE,
            cards_reviewed INTEGER NOT NULL DEFAULT 0,
            correct_reviews INTEGER NOT NULL DEFAULT 0,
            total_study_time INTEGER NOT NULL DEFAULT 0,
            new_cards INTEGER NOT NULL DEFAULT 0,
            learning_cards INTEGER NOT NULL DEFAULT 0,
            review_cards INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_study_statistics_date ON study_statistics(date);
        "#,
    ),

    // Migration 008: Add notification settings
    Migration::new(
        "008_add_notification_settings",
        r#"
        CREATE TABLE IF NOT EXISTS notification_settings (
            id TEXT PRIMARY KEY,
            study_reminders INTEGER NOT NULL DEFAULT 1,
            cards_due INTEGER NOT NULL DEFAULT 1,
            review_completed INTEGER NOT NULL DEFAULT 1,
            document_imported INTEGER NOT NULL DEFAULT 1,
            sound_enabled INTEGER NOT NULL DEFAULT 1,
            reminder_hour INTEGER NOT NULL DEFAULT 9,
            reminder_minute INTEGER NOT NULL DEFAULT 0
        );
        "#,
    ),
    // Migration 009: Add document priority inputs
    Migration::new(
        "009_add_document_priority_inputs",
        r#"
        ALTER TABLE documents ADD COLUMN priority_rating INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE documents ADD COLUMN priority_slider INTEGER NOT NULL DEFAULT 0;
        "#,
    ),

    // Migration 010: Convert interval to REAL for FSRS 5.2 fractional day support
    Migration::new(
        "010_convert_interval_to_real",
        r#"
        -- Create a backup of existing intervals
        ALTER TABLE learning_items ADD COLUMN interval_backup REAL;

        -- Copy integer intervals to the new REAL column
        UPDATE learning_items SET interval_backup = CAST(interval AS REAL);

        -- Drop the old interval column
        ALTER TABLE learning_items DROP COLUMN interval;

        -- Rename the new column to interval
        ALTER TABLE learning_items RENAME COLUMN interval_backup TO interval;

        -- Set default value for new items
        UPDATE learning_items SET interval = 0.0 WHERE interval IS NULL;
        "#,
    ),

    // Migration 011: Add FSRS scheduling to extracts
    Migration::new(
        "011_add_extract_fsrs_scheduling",
        r#"
        -- FSRS memory state for extracts
        ALTER TABLE extracts ADD COLUMN memory_state_stability REAL;
        ALTER TABLE extracts ADD COLUMN memory_state_difficulty REAL;

        -- Scheduling fields for extracts
        ALTER TABLE extracts ADD COLUMN next_review_date TEXT;
        ALTER TABLE extracts ADD COLUMN last_review_date TEXT;
        ALTER TABLE extracts ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE extracts ADD COLUMN reps INTEGER NOT NULL DEFAULT 0;

        -- Create index for due extracts
        CREATE INDEX IF NOT EXISTS idx_extracts_next_review ON extracts(next_review_date);
        "#,
    ),
    // Migration 012: Add YouTube transcripts cache
    Migration::new(
        "012_add_youtube_transcripts",
        r#"
        CREATE TABLE IF NOT EXISTS youtube_transcripts (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            video_id TEXT NOT NULL,
            transcript TEXT NOT NULL,
            segments_json TEXT NOT NULL,
            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_transcripts_video_id ON youtube_transcripts(video_id);
        CREATE INDEX IF NOT EXISTS idx_youtube_transcripts_document_id ON youtube_transcripts(document_id);
        "#,
    ),

    // Migration 013: Add RSS user preferences for customization
    Migration::new(
        "013_add_rss_user_preferences",
        r#"
        -- RSS user preferences for customization
        CREATE TABLE IF NOT EXISTS rss_user_preferences (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            feed_id TEXT,

            -- Filter preferences
            keyword_include TEXT,
            keyword_exclude TEXT,
            author_whitelist TEXT,
            author_blacklist TEXT,
            category_filter TEXT,

            -- Display preferences
            view_mode TEXT DEFAULT 'card', -- 'card', 'list', 'compact'
            theme_mode TEXT DEFAULT 'system', -- 'system', 'light', 'dark'
            density TEXT DEFAULT 'normal', -- 'compact', 'normal', 'comfortable'
            column_count INTEGER DEFAULT 2,

            -- Display options
            show_thumbnails INTEGER DEFAULT 1,
            excerpt_length INTEGER DEFAULT 150, -- characters
            show_author INTEGER DEFAULT 1,
            show_date INTEGER DEFAULT 1,
            show_feed_icon INTEGER DEFAULT 1,

            -- Sorting preferences
            sort_by TEXT DEFAULT 'date', -- 'date', 'title', 'read_status', 'reading_time'
            sort_order TEXT DEFAULT 'desc', -- 'asc', 'desc'

            date_created TEXT NOT NULL,
            date_modified TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_rss_prefs_user_id ON rss_user_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_rss_prefs_feed_id ON rss_user_preferences(feed_id);
        "#,
    ),

    // Migration 014: Add FSRS queue performance indexes
    Migration::new(
        "014_add_fsrs_queue_index",
        r#"
        -- Add next_reading_date column to documents table if it doesn't exist
        -- This column is used for FSRS-based queue scheduling
        ALTER TABLE documents ADD COLUMN next_reading_date TEXT;

        -- Create index on documents.next_reading_date for efficient queue queries
        -- This improves performance for FSRS-based queue scheduling where we filter
        -- documents by next_reading_date <= now (due documents)
        CREATE INDEX IF NOT EXISTS idx_documents_next_reading_date ON documents(next_reading_date);

        -- Create composite index for common queue queries
        -- This optimizes queries that filter by is_archived and sort by next_reading_date
        CREATE INDEX IF NOT EXISTS idx_documents_archived_next_reading ON documents(is_archived, next_reading_date);
        "#,
    ),
];

/// Get the migrations directory path
fn get_migrations_dir() -> Result<PathBuf> {
    let mut exe_path = std::env::current_exe()
        .map_err(|e| IncrementumError::Internal(format!("Failed to get exe path: {}", e)))?;

    // Navigate from the executable to the migrations folder
    // Structure: target/debug/incrementum -> migrations/
    if let Some(parent) = exe_path.parent() {
        exe_path = parent.to_path_buf();
    }

    // Check if we're in development (running from cargo)
    let dev_migrations = exe_path.parent()
        .map(|p| p.join("src-tauri").join("migrations"));

    if let Some(ref path) = dev_migrations {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    // Production path: migrations/ next to the executable
    let prod_migrations = exe_path.join("migrations");
    if prod_migrations.exists() {
        return Ok(prod_migrations);
    }

    // Fallback: try current working directory
    let cwd_migrations = std::env::current_dir()
        .map_err(|e| IncrementumError::Internal(format!("Failed to get cwd: {}", e)))?
        .join("src-tauri")
        .join("migrations");

    if cwd_migrations.exists() {
        return Ok(cwd_migrations);
    }

    Err(IncrementumError::Internal("Could not locate migrations directory".to_string()))
}

/// Run all pending migrations
pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<()> {
    // Ensure migration tracking table exists
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| IncrementumError::Internal(format!("Failed to create migrations table: {}", e)))?;

    // Get applied migrations
    let applied: Vec<String> = sqlx::query_as::<_, (String,)>("SELECT name FROM _schema_migrations ORDER BY applied_at")
        .fetch_all(pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to fetch applied migrations: {}", e)))?
        .into_iter()
        .map(|(name,)| name)
        .collect();

    // Apply pending migrations
    for migration in MIGRATIONS {
        if applied.contains(&migration.name.to_string()) {
            continue;
        }

        eprintln!("Applying migration: {}", migration.name);

        // Start transaction
        let mut tx = pool.begin()
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to start transaction: {}", e)))?;

        // Execute migration
        for statement in migration.sql.split(';') {
            let statement = statement.trim();
            if statement.is_empty() {
                continue;
            }

            sqlx::query(statement)
                .execute(&mut *tx)
                .await
                .map_err(|e| {
                    IncrementumError::Internal(format!("Migration {} failed: {}", migration.name, e))
                })?;
        }

        // Record migration
        let applied_at = chrono::Utc::now().to_rfc3339();
        sqlx::query("INSERT INTO _schema_migrations (name, applied_at) VALUES (?1, ?2)")
            .bind(migration.name)
            .bind(&applied_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to record migration {}: {}", migration.name, e)))?;

        // Commit transaction
        tx.commit()
            .await
            .map_err(|e| IncrementumError::Internal(format!("Failed to commit migration {}: {}", migration.name, e)))?;

        eprintln!("Migration {} applied successfully", migration.name);
    }

    eprintln!("All migrations applied successfully");
    Ok(())
}

/// Get the current schema version
pub async fn get_current_version(pool: &Pool<Sqlite>) -> Result<Option<String>> {
    let result = sqlx::query_as::<_, (String,)>("SELECT name FROM _schema_migrations ORDER BY applied_at DESC LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to get schema version: {}", e)))?;

    Ok(result.map(|(name,)| name))
}

/// Check if database needs migration
pub async fn needs_migration(pool: &Pool<Sqlite>) -> Result<bool> {
    let (applied_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) as count FROM _schema_migrations")
        .fetch_one(pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to check migration status: {}", e)))?;

    Ok(applied_count < MIGRATIONS.len() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_defined() {
        assert!(!MIGRATIONS.is_empty(), "Should have at least one migration");
    }

    #[test]
    fn test_migration_names_unique() {
        let mut names = std::collections::HashSet::new();
        for migration in MIGRATIONS {
            assert!(
                names.insert(&migration.name),
                "Migration name '{}' is not unique",
                migration.name
            );
        }
    }

    #[test]
    fn test_migration_names_ordered() {
        for window in MIGRATIONS.windows(2) {
            assert!(
                window[0].name < window[1].name,
                "Migrations not ordered: {} should come before {}",
                window[0].name,
                window[1].name
            );
        }
    }
}
