//! Database migration system
//!
//! Tracks and applies database migrations in order.

use sqlx::{Pool, Sqlite};
use std::path::PathBuf;
use regex::Regex;

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

    // Migration 010: Convert interval to REAL for FSRS 6 fractional day support
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
    // Migration 015: Add document cover metadata
    Migration::new(
        "015_add_document_cover_metadata",
        r#"
        ALTER TABLE documents ADD COLUMN cover_image_url TEXT;
        ALTER TABLE documents ADD COLUMN cover_image_source TEXT;
        "#,
    ),
    // Migration 016: Add document view state
    Migration::new(
        "016_add_document_view_state",
        r#"
        ALTER TABLE documents ADD COLUMN current_view_state TEXT;
        "#,
    ),
    // Migration 017: Add rich HTML content support for extracts and documents
    Migration::new(
        "017_add_rich_html_content",
        r#"
        -- Add html_content field for preserving rich HTML with inline styles
        ALTER TABLE extracts ADD COLUMN html_content TEXT;

        -- Add source_url for tracking the origin of web extracts
        ALTER TABLE extracts ADD COLUMN source_url TEXT;

        -- Add html_content field for documents (full page HTML preservation)
        ALTER TABLE documents ADD COLUMN html_content TEXT;
        "#,
    ),
    // Migration 018: Add document progress tracking columns
    Migration::new(
        "018_add_document_progress_columns",
        r#"
        -- Add scroll percentage for tracking reading progress
        ALTER TABLE documents ADD COLUMN current_scroll_percent REAL;

        -- Add CFI (Canonical Fragment Identifier) for EPUB position tracking
        ALTER TABLE documents ADD COLUMN current_cfi TEXT;
        "#,
    ),

    // Migration 019: Add unified position tracking
    Migration::new(
        "019_add_unified_position_tracking",
        r#"
        -- Add position_json column for unified DocumentPosition storage
        -- This will store serialized position data for all document types
        ALTER TABLE documents ADD COLUMN position_json TEXT;

        -- Add progress_percent for quick progress queries (0.0 to 100.0)
        ALTER TABLE documents ADD COLUMN progress_percent REAL DEFAULT 0.0;

        -- Create index for progress-based queries (Continue Reading)
        CREATE INDEX IF NOT EXISTS idx_documents_progress ON documents(progress_percent, date_modified);
        "#,
    ),

    // Migration 020: Create bookmarks table
    Migration::new(
        "020_add_bookmarks_table",
        r#"
        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            name TEXT NOT NULL,
            position_json TEXT NOT NULL,
            position_type TEXT NOT NULL,
            thumbnail TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_document_id ON bookmarks(document_id);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);
        "#,
    ),

    // Migration 021: Create reading_sessions table
    Migration::new(
        "021_add_reading_sessions_table",
        r#"
        CREATE TABLE IF NOT EXISTS reading_sessions (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            duration_seconds INTEGER NOT NULL DEFAULT 0,
            pages_read INTEGER DEFAULT 0,
            progress_start REAL DEFAULT 0.0,
            progress_end REAL DEFAULT 0.0,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reading_sessions_document_id ON reading_sessions(document_id);
        CREATE INDEX IF NOT EXISTS idx_reading_sessions_started_at ON reading_sessions(started_at);

        -- Create view for daily reading stats (used for streaks and goals)
        CREATE VIEW IF NOT EXISTS daily_reading_stats AS
        SELECT
            DATE(started_at) as reading_date,
            SUM(duration_seconds) as total_seconds,
            COUNT(DISTINCT document_id) as documents_read,
            SUM(pages_read) as total_pages_read,
            COUNT(*) as session_count
        FROM reading_sessions
        WHERE ended_at IS NOT NULL
        GROUP BY DATE(started_at);
        "#,
    ),

    // Migration 022: Create reading_goals table
    Migration::new(
        "022_add_reading_goals_table",
        r#"
        CREATE TABLE IF NOT EXISTS reading_goals (
            id TEXT PRIMARY KEY,
            goal_type TEXT NOT NULL, -- 'daily_minutes', 'daily_pages', 'weekly_minutes'
            target_value INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_reading_goals_active ON reading_goals(is_active);

        -- Create goal progress tracking table
        CREATE TABLE IF NOT EXISTS goal_progress (
            id TEXT PRIMARY KEY,
            goal_id TEXT NOT NULL,
            date TEXT NOT NULL,
            current_value REAL NOT NULL DEFAULT 0.0,
            is_completed INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (goal_id) REFERENCES reading_goals(id) ON DELETE CASCADE,
            UNIQUE(goal_id, date)
        );

        CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_date ON goal_progress(goal_id, date);
        "#,
    ),

    // Migration 023: Create collections tables
    Migration::new(
        "023_add_collections_tables",
        r#"
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            collection_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'smart'
            filter_query TEXT, -- For smart collections
            icon TEXT,
            color TEXT,
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL,
            FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_collections_parent_id ON collections(parent_id);
        CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(collection_type);

        -- Document-collection junction table
        CREATE TABLE IF NOT EXISTS document_collections (
            document_id TEXT NOT NULL,
            collection_id TEXT NOT NULL,
            added_at TEXT NOT NULL,
            PRIMARY KEY (document_id, collection_id),
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_doc_collections_document ON document_collections(document_id);
        CREATE INDEX IF NOT EXISTS idx_doc_collections_collection ON document_collections(collection_id);
        "#,
    ),

    // Migration 024: Create full-text search index
    Migration::new(
        "024_add_fulltext_search",
        r#"
        -- Create FTS5 virtual table for document search
        CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
            document_id UNINDEXED,
            title,
            content,
            content_type,
            tokenize = 'porter unicode61'
        );

        -- Create triggers to keep search index in sync
        CREATE TRIGGER IF NOT EXISTS document_search_insert AFTER INSERT ON documents BEGIN
            INSERT INTO document_search(document_id, title, content, content_type)
            VALUES (NEW.id, NEW.title, COALESCE(NEW.content, ''), NEW.file_type);
        END;

        CREATE TRIGGER IF NOT EXISTS document_search_update AFTER UPDATE OF title, content, file_type ON documents BEGIN
            UPDATE document_search SET
                title = NEW.title,
                content = COALESCE(NEW.content, ''),
                content_type = NEW.file_type
            WHERE document_id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS document_search_delete AFTER DELETE ON documents BEGIN
            DELETE FROM document_search WHERE document_id = OLD.id;
        END;

        -- Index extracts for search as well
        CREATE VIRTUAL TABLE IF NOT EXISTS extract_search USING fts5(
            extract_id UNINDEXED,
            document_id UNINDEXED,
            content,
            tokenize = 'porter unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS extract_search_insert AFTER INSERT ON extracts BEGIN
            INSERT INTO extract_search(extract_id, document_id, content)
            VALUES (NEW.id, NEW.document_id, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS extract_search_update AFTER UPDATE OF content ON extracts BEGIN
            UPDATE extract_search SET content = NEW.content WHERE extract_id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS extract_search_delete AFTER DELETE ON extracts BEGIN
            DELETE FROM extract_search WHERE extract_id = OLD.id;
        END;
        "#,
    ),

    // Migration 025: Backfill position_json from existing fields
    Migration::new(
        "025_backfill_position_json",
        r#"
        -- Backfill position_json from existing position fields for documents
        -- This ensures existing data is migrated to the new unified format
        UPDATE documents
        SET position_json = json_object(
            'type', CASE
                WHEN file_type = 'pdf' THEN 'page'
                WHEN file_type = 'epub' THEN 'cfi'
                WHEN file_type IN ('youtube', 'video') THEN 'time'
                ELSE 'scroll'
            END,
            'page', COALESCE(current_page, 0),
            'cfi', COALESCE(current_cfi, ''),
            'percent', COALESCE(current_scroll_percent, 0.0)
        )
        WHERE position_json IS NULL
        AND (current_page IS NOT NULL OR current_scroll_percent IS NOT NULL OR current_cfi IS NOT NULL);

        -- Calculate progress_percent for PDF documents
        UPDATE documents
        SET progress_percent = CASE
            WHEN total_pages > 0 AND current_page > 0 THEN (CAST(current_page AS REAL) / CAST(total_pages AS REAL)) * 100.0
            WHEN current_scroll_percent > 0 THEN current_scroll_percent
            ELSE 0.0
        END
        WHERE progress_percent = 0.0
        AND (current_page IS NOT NULL OR current_scroll_percent IS NOT NULL);
        "#,
    ),

    // Migration 026: Add video features tables
    Migration::new(
        "026_add_video_features",
        r#"
        -- Video bookmarks table for timestamped bookmarks
        CREATE TABLE IF NOT EXISTS video_bookmarks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            title TEXT NOT NULL,
            time REAL NOT NULL,
            thumbnail TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_video_bookmarks_document_id ON video_bookmarks(document_id);
        CREATE INDEX IF NOT EXISTS idx_video_bookmarks_time ON video_bookmarks(time);

        -- Video chapters table for chapter navigation
        CREATE TABLE IF NOT EXISTS video_chapters (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            title TEXT NOT NULL,
            start_time REAL NOT NULL,
            end_time REAL NOT NULL,
            order_index INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_video_chapters_document_id ON video_chapters(document_id);
        CREATE INDEX IF NOT EXISTS idx_video_chapters_order ON video_chapters(order_index);

        -- Video transcripts table for transcript storage
        CREATE TABLE IF NOT EXISTS video_transcripts (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            transcript TEXT NOT NULL,
            segments_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_video_transcripts_document_id ON video_transcripts(document_id);
        "#,
    ),

    // Migration 027: Add YouTube playlist subscriptions for auto-import
    Migration::new(
        "027_add_youtube_playlist_subscriptions",
        r#"
        -- YouTube playlist subscriptions table
        -- Tracks playlists that users want to auto-import from
        CREATE TABLE IF NOT EXISTS youtube_playlist_subscriptions (
            id TEXT PRIMARY KEY,
            playlist_id TEXT NOT NULL UNIQUE,  -- YouTube playlist ID (e.g., PL...)
            playlist_url TEXT NOT NULL,
            title TEXT,
            channel_name TEXT,
            channel_id TEXT,
            description TEXT,
            thumbnail_url TEXT,
            total_videos INTEGER,
            
            -- Auto-import settings
            is_active INTEGER NOT NULL DEFAULT 1,
            auto_import_new INTEGER NOT NULL DEFAULT 1,  -- Auto-import new videos when refreshing
            queue_intersperse_interval INTEGER NOT NULL DEFAULT 5,  -- Add to queue every N items
            priority_rating INTEGER NOT NULL DEFAULT 5,  -- Default priority for imported videos
            
            -- Refresh tracking
            last_refreshed_at TEXT,
            refresh_interval_hours INTEGER NOT NULL DEFAULT 24,  -- How often to check for new videos
            
            -- Metadata
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_subs_active ON youtube_playlist_subscriptions(is_active);
        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_subs_id ON youtube_playlist_subscriptions(playlist_id);

        -- Track which videos from playlists have been imported
        CREATE TABLE IF NOT EXISTS youtube_playlist_videos (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            video_id TEXT NOT NULL,  -- YouTube video ID (11 chars)
            video_title TEXT,
            video_duration INTEGER,  -- in seconds
            thumbnail_url TEXT,
            position INTEGER,  -- Position in playlist (0-indexed)
            
            -- Import status
            is_imported INTEGER NOT NULL DEFAULT 0,
            document_id TEXT,  -- Reference to documents table when imported
            
            -- Queue interspersion tracking
            added_to_queue INTEGER NOT NULL DEFAULT 0,
            queue_position INTEGER,  -- Position in queue (for interspersion calculation)
            
            -- Metadata
            published_at TEXT,
            discovered_at TEXT NOT NULL,
            imported_at TEXT,
            
            FOREIGN KEY (subscription_id) REFERENCES youtube_playlist_subscriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
            UNIQUE(subscription_id, video_id)
        );

        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_videos_sub ON youtube_playlist_videos(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_videos_imported ON youtube_playlist_videos(is_imported);
        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_videos_queue ON youtube_playlist_videos(added_to_queue);
        CREATE INDEX IF NOT EXISTS idx_youtube_playlist_videos_video_id ON youtube_playlist_videos(video_id);

        -- Queue interspersion settings table (global settings)
        CREATE TABLE IF NOT EXISTS youtube_playlist_settings (
            id TEXT PRIMARY KEY DEFAULT 'global',
            enabled INTEGER NOT NULL DEFAULT 1,
            default_intersperse_interval INTEGER NOT NULL DEFAULT 5,
            default_priority INTEGER NOT NULL DEFAULT 5,
            max_consecutive_playlist_videos INTEGER NOT NULL DEFAULT 1,  -- Never add more than N consecutive
            prefer_new_videos INTEGER NOT NULL DEFAULT 1,  -- Prioritize newer videos
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );

        -- Insert default settings
        INSERT OR IGNORE INTO youtube_playlist_settings (id, enabled, default_intersperse_interval, default_priority, max_consecutive_playlist_videos, prefer_new_videos, created_at, modified_at)
        VALUES ('global', 1, 5, 5, 1, 1, datetime('now'), datetime('now'));
        "#,
    ),

    // Migration 028: Add document scheduling columns for incremental reading
    Migration::new(
        "028_add_document_scheduling_columns",
        r#"
        -- Number of times this document has been read
        ALTER TABLE documents ADD COLUMN reading_count INTEGER NOT NULL DEFAULT 0;

        -- FSRS stability (how long memory lasts, in days)
        ALTER TABLE documents ADD COLUMN stability REAL;

        -- FSRS difficulty (1-10 scale)
        ALTER TABLE documents ADD COLUMN difficulty REAL;

        -- Total repetitions/reviews
        ALTER TABLE documents ADD COLUMN reps INTEGER;

        -- Total time spent reading (in seconds)
        ALTER TABLE documents ADD COLUMN total_time_spent INTEGER;

        -- Consecutive rating count for incremental scheduler
        -- Positive = consecutive good/easy ratings, Negative = consecutive again/hard ratings
        ALTER TABLE documents ADD COLUMN consecutive_count INTEGER;
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

/// Split SQL into individual statements, respecting CREATE TRIGGER ... BEGIN ... END blocks
fn split_sql_statements(sql: &str) -> Vec<String> {
    eprintln!("=== split_sql_statements called, SQL length: {} ===", sql.len());
    let first_500 = sql.chars().take(500).collect::<String>();
    eprintln!("First 500 chars:\n{}", first_500);
    let mut statements = Vec::new();
    let mut in_trigger = false;
    let mut trigger_depth: usize = 0;
    let mut current_stmt = String::new();

    for line in sql.lines() {
        let trimmed = line.trim();

        // Check if this line starts a CREATE TRIGGER
        if trimmed.to_uppercase().starts_with("CREATE TRIGGER") {
            // Save any accumulated statement before starting trigger
            if !current_stmt.is_empty() {
                let stmt = current_stmt.trim();
                if !stmt.is_empty() {
                    statements.push(stmt.to_string());
                }
                current_stmt.clear();
            }
            in_trigger = true;
            trigger_depth = 0;
            current_stmt.push_str(line);
        } else if in_trigger {
            current_stmt.push('\n');
            current_stmt.push_str(line);

            // Track BEGIN/END depth
            trigger_depth = trigger_depth.saturating_add(line.matches("BEGIN").count())
                .saturating_sub(line.matches("END").count());

            // Check if trigger ends (END; at depth 0)
            if trimmed.ends_with("END;") && trigger_depth == 0 {
                in_trigger = false;
                let trigger_sql = current_stmt.trim();
                if !trigger_sql.is_empty() {
                    statements.push(trigger_sql.to_string());
                }
                current_stmt.clear();
            }
        } else {
            // Regular statement - accumulate until semicolon
            // Add newline between lines to preserve structure
            if !current_stmt.is_empty() {
                current_stmt.push('\n');
            }
            current_stmt.push_str(line);

            // Check for statement terminator (semicolon at end of line)
            if trimmed.ends_with(';') {
                let stmt = current_stmt.trim();
                if !stmt.is_empty() {
                    eprintln!("Processing statement ending with ';', length: {}", stmt.len());
                    eprintln!("Raw statement (first 200 chars): {}", stmt.chars().take(200).collect::<String>());
                    // Remove inline SQL comments (-- comments) from the statement
                    let cleaned: String = stmt.lines()
                        .filter(|l| !l.trim().starts_with("--"))
                        .collect::<Vec<_>>()
                        .join("\n");
                    eprintln!("After cleaning, length: {}, first 200 chars: {}", cleaned.len(), cleaned.chars().take(200).collect::<String>());
                    if !cleaned.trim().is_empty() {
                        eprintln!("Adding regular statement: {} chars, first 80 chars: {}", cleaned.len(), cleaned.chars().take(80).collect::<String>());
                        statements.push(cleaned);
                    } else {
                        eprintln!("Skipping empty statement after cleaning");
                    }
                }
                current_stmt.clear();
            }
        }
    }

    // Handle any remaining content
    let stmt = current_stmt.trim();
    if !stmt.is_empty() {
        let cleaned: String = stmt.lines()
            .filter(|l| !l.trim().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n");
        if !cleaned.trim().is_empty() {
            eprintln!("Adding remaining statement: {} chars, first 80 chars: {}", cleaned.len(), cleaned.chars().take(80).collect::<String>());
            statements.push(cleaned);
        }
    }

    eprintln!("=== Total statements extracted: {} ===", statements.len());
    statements
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
        // Split statements while respecting BEGIN...END blocks (for triggers)
        let statements = split_sql_statements(migration.sql);
        eprintln!("  Executing {} statements", statements.len());
        for (i, statement) in statements.iter().enumerate() {
            eprintln!("  Statement {}: {} bytes", i + 1, statement.len());
            eprintln!("  First 100 chars: {}", &statement.chars().take(100).collect::<String>());
            sqlx::query(statement)
                .execute(&mut *tx)
                .await
                .map_err(|e| {
                    IncrementumError::Internal(format!("Migration {} failed at statement {}: {}", migration.name, i + 1, e))
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
