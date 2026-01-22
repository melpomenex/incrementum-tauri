//! Repository pattern for database operations

use sqlx::{Pool, Sqlite, Row};
use chrono::Utc;
use crate::error::Result;
use crate::models::{Document, DocumentMetadata, Extract, LearningItem, FileType, ItemType, ItemState};

pub struct Repository {
    pool: Pool<Sqlite>,
}

impl Repository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    // Helper to parse file type from string
    fn parse_file_type(s: &str) -> FileType {
        match s {
            "pdf" => FileType::Pdf,
            "epub" => FileType::Epub,
            "markdown" => FileType::Markdown,
            "html" => FileType::Html,
            "youtube" => FileType::Youtube,
            "audio" => FileType::Audio,
            "video" => FileType::Video,
            _ => FileType::Other,
        }
    }

    // Helper to parse item type from string
    fn parse_item_type(s: &str) -> ItemType {
        match s {
            "flashcard" => ItemType::Flashcard,
            "cloze" => ItemType::Cloze,
            "qa" => ItemType::Qa,
            _ => ItemType::Basic,
        }
    }

    // Helper to parse item state from string
    fn parse_item_state(s: &str) -> ItemState {
        match s {
            "new" => ItemState::New,
            "learning" => ItemState::Learning,
            "review" => ItemState::Review,
            _ => ItemState::Relearning,
        }
    }

    // Helper to parse memory state from optional stability and difficulty
    fn parse_memory_state(stability: Option<f64>, difficulty: Option<f64>) -> Option<crate::models::MemoryState> {
        match (stability, difficulty) {
            (Some(s), Some(d)) => Some(crate::models::MemoryState { stability: s, difficulty: d }),
            _ => None,
        }
    }

    // Document operations
    pub async fn create_document(&self, document: &Document) -> Result<Document> {
        let file_type_str = format!("{:?}", document.file_type).to_lowercase();
        let tags_json = serde_json::to_string(&document.tags)?;
        let metadata_json = document.metadata.as_ref().map(serde_json::to_string).transpose()?;

        sqlx::query(
            r#"
            INSERT INTO documents (
                id, title, file_path, file_type, content, content_hash,
                total_pages, current_page, current_scroll_percent, current_cfi, current_view_state, category, tags,
                date_added, date_modified, date_last_reviewed,
                extract_count, learning_item_count, priority_rating, priority_slider, priority_score,
                is_archived, is_favorite, metadata, cover_image_url, cover_image_source
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)
            "#,
        )
        .bind(&document.id)
        .bind(&document.title)
        .bind(&document.file_path)
        .bind(&file_type_str)
        .bind(&document.content)
        .bind(&document.content_hash)
        .bind(document.total_pages)
        .bind(document.current_page)
        .bind(document.current_scroll_percent)
        .bind(&document.current_cfi)
        .bind(&document.current_view_state)
        .bind(&document.category)
        .bind(&tags_json)
        .bind(document.date_added)
        .bind(document.date_modified)
        .bind(document.date_last_reviewed)
        .bind(document.extract_count)
        .bind(document.learning_item_count)
        .bind(document.priority_rating)
        .bind(document.priority_slider)
        .bind(document.priority_score)
        .bind(document.is_archived)
        .bind(document.is_favorite)
        .bind(metadata_json)
        .bind(&document.cover_image_url)
        .bind(&document.cover_image_source)
        .execute(&self.pool)
        .await?;

        Ok(document.clone())
    }

    pub async fn get_document(&self, id: &str) -> Result<Option<Document>> {
        let row = sqlx::query("SELECT * FROM documents WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => {
                let file_type: String = row.get("file_type");
                let tags_json: String = row.get("tags");
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                // Parse metadata if present
                let metadata_json: Option<String> = row.try_get("metadata")?;
                let metadata: Option<crate::models::DocumentMetadata> = metadata_json
                    .and_then(|json| serde_json::from_str(&json).ok());

                Ok(Some(Document {
                    id: row.get("id"),
                    title: row.get("title"),
                    file_path: row.get("file_path"),
                    file_type: Self::parse_file_type(&file_type),
                    content: row.get("content"),
                    content_hash: row.get("content_hash"),
                    total_pages: row.get("total_pages"),
                    current_page: row.get("current_page"),
                    current_scroll_percent: row.try_get("current_scroll_percent").ok(),
                    current_cfi: row.try_get("current_cfi").ok(),
                    current_view_state: row.try_get("current_view_state").ok(),
                    category: row.get("category"),
                    tags,
                    date_added: row.get("date_added"),
                    date_modified: row.get("date_modified"),
                    date_last_reviewed: row.get("date_last_reviewed"),
                    extract_count: row.get("extract_count"),
                    learning_item_count: row.get("learning_item_count"),
                    priority_rating: row.get("priority_rating"),
                    priority_slider: row.get("priority_slider"),
                    priority_score: row.get("priority_score"),
                    is_archived: row.get("is_archived"),
                    is_favorite: row.get("is_favorite"),
                    metadata,
                    cover_image_url: row.try_get("cover_image_url").ok(),
                    cover_image_source: row.try_get("cover_image_source").ok(),
                    // Scheduling fields - use try_get for compatibility with existing databases
                    next_reading_date: row.try_get("next_reading_date").ok(),
                    reading_count: row.try_get("reading_count").unwrap_or(0),
                    stability: row.try_get("stability").ok(),
                    difficulty: row.try_get("difficulty").ok(),
                    reps: row.try_get("reps").ok(),
                    total_time_spent: row.try_get("total_time_spent").ok(),
                    consecutive_count: row.try_get("consecutive_count").ok(),
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn find_document_by_url(&self, url: &str) -> Result<Option<Document>> {
        let row = sqlx::query("SELECT * FROM documents WHERE file_path = ? LIMIT 1")
            .bind(url)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => {
                let file_type: String = row.get("file_type");
                let tags_json: String = row.get("tags");
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                // Parse metadata if present
                let metadata_json: Option<String> = row.try_get("metadata")?;
                let metadata: Option<crate::models::DocumentMetadata> = metadata_json
                    .and_then(|json| serde_json::from_str(&json).ok());

                Ok(Some(Document {
                    id: row.get("id"),
                    title: row.get("title"),
                    file_path: row.get("file_path"),
                    file_type: Self::parse_file_type(&file_type),
                    content: row.get("content"),
                    content_hash: row.get("content_hash"),
                    total_pages: row.get("total_pages"),
                    current_page: row.get("current_page"),
                    current_scroll_percent: row.try_get("current_scroll_percent").ok(),
                    current_cfi: row.try_get("current_cfi").ok(),
                    current_view_state: row.try_get("current_view_state").ok(),
                    category: row.get("category"),
                    tags,
                    date_added: row.get("date_added"),
                    date_modified: row.get("date_modified"),
                    date_last_reviewed: row.get("date_last_reviewed"),
                    extract_count: row.get("extract_count"),
                    learning_item_count: row.get("learning_item_count"),
                    priority_rating: row.get("priority_rating"),
                    priority_slider: row.get("priority_slider"),
                    priority_score: row.get("priority_score"),
                    is_archived: row.get("is_archived"),
                    is_favorite: row.get("is_favorite"),
                    metadata,
                    cover_image_url: row.try_get("cover_image_url").ok(),
                    cover_image_source: row.try_get("cover_image_source").ok(),
                    // Scheduling fields - use try_get for compatibility with existing databases
                    next_reading_date: row.try_get("next_reading_date").ok(),
                    reading_count: row.try_get("reading_count").unwrap_or(0),
                    stability: row.try_get("stability").ok(),
                    difficulty: row.try_get("difficulty").ok(),
                    reps: row.try_get("reps").ok(),
                    total_time_spent: row.try_get("total_time_spent").ok(),
                    consecutive_count: row.try_get("consecutive_count").ok(),
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn list_documents(&self) -> Result<Vec<Document>> {
        let rows = sqlx::query("SELECT * FROM documents ORDER BY date_added DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut docs = Vec::new();
        for row in rows {
            let file_type: String = row.get("file_type");
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            // Parse metadata if present
            let metadata_json: Option<String> = row.try_get("metadata")?;
            let metadata: Option<crate::models::DocumentMetadata> = metadata_json
                .and_then(|json| serde_json::from_str(&json).ok());

            docs.push(Document {
                id: row.get("id"),
                title: row.get("title"),
                file_path: row.get("file_path"),
                file_type: Self::parse_file_type(&file_type),
                content: row.get("content"),
                content_hash: row.get("content_hash"),
                total_pages: row.get("total_pages"),
                current_page: row.get("current_page"),
                current_scroll_percent: row.try_get("current_scroll_percent").ok(),
                current_cfi: row.try_get("current_cfi").ok(),
                current_view_state: row.try_get("current_view_state").ok(),
                category: row.get("category"),
                tags,
                date_added: row.get("date_added"),
                date_modified: row.get("date_modified"),
                date_last_reviewed: row.get("date_last_reviewed"),
                extract_count: row.get("extract_count"),
                learning_item_count: row.get("learning_item_count"),
                priority_rating: row.get("priority_rating"),
                priority_slider: row.get("priority_slider"),
                priority_score: row.get("priority_score"),
                is_archived: row.get("is_archived"),
                is_favorite: row.get("is_favorite"),
                metadata,
                cover_image_url: row.try_get("cover_image_url").ok(),
                cover_image_source: row.try_get("cover_image_source").ok(),
                // Scheduling fields - use try_get for compatibility with existing databases
                next_reading_date: row.try_get("next_reading_date").ok(),
                reading_count: row.try_get("reading_count").unwrap_or(0),
                stability: row.try_get("stability").ok(),
                difficulty: row.try_get("difficulty").ok(),
                reps: row.try_get("reps").ok(),
                total_time_spent: row.try_get("total_time_spent").ok(),
                consecutive_count: row.try_get("consecutive_count").ok(),
            });
        }

        Ok(docs)
    }

    pub async fn update_document(&self, id: &str, updates: &Document) -> Result<Document> {
        let tags_json = serde_json::to_string(&updates.tags)?;

        sqlx::query(
            r#"
            UPDATE documents SET
                title = ?1, file_path = ?2, current_page = ?3, category = ?4,
                tags = ?5, date_modified = ?6, priority_rating = ?7,
                priority_slider = ?8, priority_score = ?9,
                is_archived = ?10, is_favorite = ?11
            WHERE id = ?12
            "#,
        )
        .bind(&updates.title)
        .bind(&updates.file_path)
        .bind(updates.current_page)
        .bind(&updates.category)
        .bind(&tags_json)
        .bind(updates.date_modified)
        .bind(updates.priority_rating)
        .bind(updates.priority_slider)
        .bind(updates.priority_score)
        .bind(updates.is_archived)
        .bind(updates.is_favorite)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_document(id).await?.ok_or_else(|| {
            crate::error::IncrementumError::NotFound(format!("Document {}", id))
        })
    }

    pub async fn update_document_cover(
        &self,
        id: &str,
        cover_image_url: Option<String>,
        cover_image_source: Option<String>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE documents SET
                cover_image_url = ?1,
                cover_image_source = ?2,
                date_modified = ?3
            WHERE id = ?4
            "#,
        )
        .bind(cover_image_url)
        .bind(cover_image_source)
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_document_content(
        &self,
        id: &str,
        content: &str,
        content_hash: Option<String>,
        total_pages: Option<i32>,
        metadata: Option<DocumentMetadata>,
    ) -> Result<()> {
        let metadata_json = metadata
            .as_ref()
            .map(serde_json::to_string)
            .transpose()?;

        sqlx::query(
            r#"
            UPDATE documents SET
                content = ?1,
                content_hash = ?2,
                total_pages = ?3,
                metadata = ?4,
                date_modified = ?5
            WHERE id = ?6
            "#,
        )
        .bind(content)
        .bind(content_hash)
        .bind(total_pages)
        .bind(metadata_json)
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_document_priority(
        &self,
        id: &str,
        priority_rating: i32,
        priority_slider: i32,
        priority_score: f64,
    ) -> Result<Document> {
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE documents SET
                priority_rating = ?1,
                priority_slider = ?2,
                priority_score = ?3,
                date_modified = ?4
            WHERE id = ?5
            "#,
        )
        .bind(priority_rating)
        .bind(priority_slider)
        .bind(priority_score)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_document(id).await?.ok_or_else(|| {
            crate::error::IncrementumError::NotFound(format!("Document {}", id))
        })
    }

    pub async fn update_document_progress(
        &self,
        id: &str,
        current_page: Option<i32>,
        current_scroll_percent: Option<f64>,
        current_cfi: Option<String>,
        current_view_state: Option<String>,
    ) -> Result<Document> {
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE documents SET
                current_page = COALESCE(?1, current_page),
                current_scroll_percent = COALESCE(?2, current_scroll_percent),
                current_cfi = COALESCE(?3, current_cfi),
                current_view_state = COALESCE(?4, current_view_state),
                date_modified = ?5
            WHERE id = ?6
            "#,
        )
        .bind(current_page)
        .bind(current_scroll_percent)
        .bind(current_cfi)
        .bind(current_view_state)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_document(id).await?.ok_or_else(|| {
            crate::error::IncrementumError::NotFound(format!("Document {}", id))
        })
    }

    pub async fn update_document_scheduling(
        &self,
        id: &str,
        next_reading_date: Option<chrono::DateTime<Utc>>,
        stability: Option<f64>,
        difficulty: Option<f64>,
        reps: Option<i32>,
        total_time_spent: Option<i32>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE documents SET
                next_reading_date = ?1,
                stability = ?2,
                difficulty = ?3,
                reps = ?4,
                total_time_spent = ?5,
                date_modified = ?6
            WHERE id = ?7
            "#,
        )
        .bind(next_reading_date)
        .bind(stability)
        .bind(difficulty)
        .bind(reps)
        .bind(total_time_spent)
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_document_scheduling_with_consecutive(
        &self,
        id: &str,
        next_reading_date: Option<chrono::DateTime<Utc>>,
        stability: Option<f64>,
        difficulty: Option<f64>,
        reps: Option<i32>,
        total_time_spent: Option<i32>,
        consecutive_count: Option<i32>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE documents SET
                next_reading_date = ?1,
                stability = ?2,
                difficulty = ?3,
                reps = ?4,
                total_time_spent = ?5,
                consecutive_count = ?6,
                date_modified = ?7
            WHERE id = ?8
            "#,
        )
        .bind(next_reading_date)
        .bind(stability)
        .bind(difficulty)
        .bind(reps)
        .bind(total_time_spent)
        .bind(consecutive_count)
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete_document(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM documents WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // Extract operations
    pub async fn create_extract(&self, extract: &Extract) -> Result<Extract> {
        let tags_json = serde_json::to_string(&extract.tags)?;
        let (stability, difficulty) = extract.memory_state.as_ref()
            .map(|s| (Some(s.stability), Some(s.difficulty)))
            .unwrap_or((None, None));

        sqlx::query(
            r#"
            INSERT INTO extracts (
                id, document_id, content, page_title, page_number,
                highlight_color, notes, progressive_disclosure_level,
                max_disclosure_level, date_created, date_modified,
                tags, category, memory_state_stability, memory_state_difficulty,
                next_review_date, last_review_date, review_count, reps
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
            "#,
        )
        .bind(&extract.id)
        .bind(&extract.document_id)
        .bind(&extract.content)
        .bind(&extract.page_title)
        .bind(extract.page_number)
        .bind(&extract.highlight_color)
        .bind(&extract.notes)
        .bind(extract.progressive_disclosure_level)
        .bind(extract.max_disclosure_level)
        .bind(extract.date_created)
        .bind(extract.date_modified)
        .bind(&tags_json)
        .bind(&extract.category)
        .bind(stability)
        .bind(difficulty)
        .bind(extract.next_review_date)
        .bind(extract.last_review_date)
        .bind(extract.review_count)
        .bind(extract.reps)
        .execute(&self.pool)
        .await?;

        Ok(extract.clone())
    }

    pub async fn get_extract(&self, id: &str) -> Result<Option<Extract>> {
        let row = sqlx::query("SELECT * FROM extracts WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => {
                let tags_json: String = row.try_get("tags")?;
                let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

                let stability: Option<f64> = row.try_get("memory_state_stability").ok();
                let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
                let memory_state = Self::parse_memory_state(stability, difficulty);

                Ok(Some(Extract {
                    id: row.try_get("id")?,
                    document_id: row.try_get("document_id")?,
                    content: row.try_get("content")?,
                    page_title: row.try_get("page_title")?,
                    page_number: row.try_get("page_number")?,
                    highlight_color: row.try_get("highlight_color")?,
                    notes: row.try_get("notes")?,
                    progressive_disclosure_level: row.try_get("progressive_disclosure_level")?,
                    max_disclosure_level: row.try_get("max_disclosure_level")?,
                    date_created: row.try_get("date_created")?,
                    date_modified: row.try_get("date_modified")?,
                    tags,
                    category: row.try_get("category")?,
                    memory_state,
                    next_review_date: row.try_get("next_review_date").ok(),
                    last_review_date: row.try_get("last_review_date").ok(),
                    review_count: row.try_get("review_count").unwrap_or(0),
                    reps: row.try_get("reps").unwrap_or(0),
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn list_extracts_by_document(&self, document_id: &str) -> Result<Vec<Extract>> {
        let rows = sqlx::query("SELECT * FROM extracts WHERE document_id = ? ORDER BY page_number")
            .bind(document_id)
            .fetch_all(&self.pool)
            .await?;

        let mut extracts = Vec::new();
        for row in rows {
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            extracts.push(Extract {
                id: row.try_get("id")?,
                document_id: row.try_get("document_id")?,
                content: row.try_get("content")?,
                page_title: row.try_get("page_title")?,
                page_number: row.try_get("page_number")?,
                highlight_color: row.try_get("highlight_color")?,
                notes: row.try_get("notes")?,
                progressive_disclosure_level: row.try_get("progressive_disclosure_level")?,
                max_disclosure_level: row.try_get("max_disclosure_level")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                tags,
                category: row.try_get("category")?,
                memory_state,
                next_review_date: row.try_get("next_review_date").ok(),
                last_review_date: row.try_get("last_review_date").ok(),
                review_count: row.try_get("review_count").unwrap_or(0),
                reps: row.try_get("reps").unwrap_or(0),
            });
        }

        Ok(extracts)
    }

    pub async fn update_extract(&self, extract: &Extract) -> Result<Extract> {
        let tags_json = serde_json::to_string(&extract.tags)?;
        let (stability, difficulty) = extract.memory_state.as_ref()
            .map(|s| (Some(s.stability), Some(s.difficulty)))
            .unwrap_or((None, None));

        sqlx::query(
            r#"
            UPDATE extracts SET
                content = ?1, notes = ?2, highlight_color = ?3,
                tags = ?4, category = ?5, date_modified = ?6,
                memory_state_stability = ?7, memory_state_difficulty = ?8,
                next_review_date = ?9, last_review_date = ?10,
                review_count = ?11, reps = ?12
            WHERE id = ?13
            "#,
        )
        .bind(&extract.content)
        .bind(&extract.notes)
        .bind(&extract.highlight_color)
        .bind(&tags_json)
        .bind(&extract.category)
        .bind(extract.date_modified)
        .bind(stability)
        .bind(difficulty)
        .bind(extract.next_review_date)
        .bind(extract.last_review_date)
        .bind(extract.review_count)
        .bind(extract.reps)
        .bind(&extract.id)
        .execute(&self.pool)
        .await?;

        Ok(extract.clone())
    }

    pub async fn delete_extract(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM extracts WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_due_extracts(&self, before: &chrono::DateTime<chrono::Utc>) -> Result<Vec<Extract>> {
        let rows = sqlx::query("SELECT * FROM extracts WHERE next_review_date IS NOT NULL AND next_review_date <= ? ORDER BY next_review_date")
            .bind(before)
            .fetch_all(&self.pool)
            .await?;

        let mut extracts = Vec::new();
        for row in rows {
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            extracts.push(Extract {
                id: row.try_get("id")?,
                document_id: row.try_get("document_id")?,
                content: row.try_get("content")?,
                page_title: row.try_get("page_title")?,
                page_number: row.try_get("page_number")?,
                highlight_color: row.try_get("highlight_color")?,
                notes: row.try_get("notes")?,
                progressive_disclosure_level: row.try_get("progressive_disclosure_level")?,
                max_disclosure_level: row.try_get("max_disclosure_level")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                tags,
                category: row.try_get("category")?,
                memory_state,
                next_review_date: row.try_get("next_review_date").ok(),
                last_review_date: row.try_get("last_review_date").ok(),
                review_count: row.try_get("review_count").unwrap_or(0),
                reps: row.try_get("reps").unwrap_or(0),
            });
        }

        Ok(extracts)
    }

    /// Get extracts that have never been reviewed (new extracts without next_review_date)
    pub async fn get_new_extracts(&self) -> Result<Vec<Extract>> {
        let rows = sqlx::query("SELECT * FROM extracts WHERE next_review_date IS NULL ORDER BY date_created DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut extracts = Vec::new();
        for row in rows {
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            extracts.push(Extract {
                id: row.try_get("id")?,
                document_id: row.try_get("document_id")?,
                content: row.try_get("content")?,
                page_title: row.try_get("page_title")?,
                page_number: row.try_get("page_number")?,
                highlight_color: row.try_get("highlight_color")?,
                notes: row.try_get("notes")?,
                progressive_disclosure_level: row.try_get("progressive_disclosure_level")?,
                max_disclosure_level: row.try_get("max_disclosure_level")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                tags,
                category: row.try_get("category")?,
                memory_state,
                next_review_date: row.try_get("next_review_date").ok(),
                last_review_date: row.try_get("last_review_date").ok(),
                review_count: row.try_get("review_count").unwrap_or(0),
                reps: row.try_get("reps").unwrap_or(0),
            });
        }

        Ok(extracts)
    }

    pub async fn update_extract_scheduling(
        &self,
        id: &str,
        next_review_date: Option<chrono::DateTime<Utc>>,
        stability: Option<f64>,
        difficulty: Option<f64>,
        review_count: Option<i32>,
        reps: Option<i32>,
        last_review_date: Option<chrono::DateTime<Utc>>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE extracts SET
                next_review_date = ?1,
                memory_state_stability = ?2,
                memory_state_difficulty = ?3,
                review_count = ?4,
                reps = ?5,
                last_review_date = ?6,
                date_modified = ?7
            WHERE id = ?8
            "#,
        )
        .bind(next_review_date)
        .bind(stability)
        .bind(difficulty)
        .bind(review_count)
        .bind(reps)
        .bind(last_review_date)
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Learning item operations
    pub async fn create_learning_item(&self, item: &LearningItem) -> Result<LearningItem> {
        let item_type_str = format!("{:?}", item.item_type).to_lowercase();
        let state_str = format!("{:?}", item.state).to_lowercase();
        let tags_json = serde_json::to_string(&item.tags)?;

        let (stability, difficulty) = item.memory_state.as_ref()
            .map(|s| (Some(s.stability), Some(s.difficulty)))
            .unwrap_or((None, None));

        sqlx::query(
            r#"
            INSERT INTO learning_items (
                id, extract_id, document_id, item_type, question,
                answer, cloze_text, difficulty, interval,
                ease_factor, due_date, date_created, date_modified,
                last_review_date, review_count, lapses, state,
                is_suspended, tags, memory_state_stability, memory_state_difficulty
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
            "#,
        )
        .bind(&item.id)
        .bind(&item.extract_id)
        .bind(&item.document_id)
        .bind(&item_type_str)
        .bind(&item.question)
        .bind(&item.answer)
        .bind(&item.cloze_text)
        .bind(item.difficulty)
        .bind(item.interval)
        .bind(item.ease_factor)
        .bind(item.due_date)
        .bind(item.date_created)
        .bind(item.date_modified)
        .bind(item.last_review_date)
        .bind(item.review_count)
        .bind(item.lapses)
        .bind(&state_str)
        .bind(item.is_suspended)
        .bind(&tags_json)
        .bind(stability)
        .bind(difficulty)
        .execute(&self.pool)
        .await?;

        Ok(item.clone())
    }

    pub async fn get_due_learning_items(&self, before: &chrono::DateTime<chrono::Utc>) -> Result<Vec<LearningItem>> {
        let rows = sqlx::query("SELECT * FROM learning_items WHERE due_date <= ? AND is_suspended = false ORDER BY due_date")
            .bind(before)
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let item_type_str: String = row.try_get("item_type")?;
            let state_str: String = row.try_get("state")?;
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            items.push(LearningItem {
                id: row.try_get("id")?,
                extract_id: row.try_get("extract_id")?,
                document_id: row.try_get("document_id")?,
                item_type: Self::parse_item_type(&item_type_str),
                question: row.try_get("question")?,
                answer: row.try_get("answer")?,
                cloze_text: row.try_get("cloze_text")?,
                cloze_ranges: None,
                difficulty: row.try_get("difficulty")?,
                interval: row.try_get("interval")?,
                ease_factor: row.try_get("ease_factor")?,
                due_date: row.try_get("due_date")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                last_review_date: row.try_get("last_review_date")?,
                review_count: row.try_get("review_count")?,
                lapses: row.try_get("lapses")?,
                state: Self::parse_item_state(&state_str),
                is_suspended: row.try_get("is_suspended")?,
                tags,
                memory_state,
            });
        }

        Ok(items)
    }

    pub async fn get_learning_items_by_document(&self, document_id: &str) -> Result<Vec<LearningItem>> {
        let rows = sqlx::query("SELECT * FROM learning_items WHERE document_id = ? ORDER BY date_created DESC")
            .bind(document_id)
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let item_type_str: String = row.try_get("item_type")?;
            let state_str: String = row.try_get("state")?;
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            items.push(LearningItem {
                id: row.try_get("id")?,
                extract_id: row.try_get("extract_id")?,
                document_id: row.try_get("document_id")?,
                item_type: Self::parse_item_type(&item_type_str),
                question: row.try_get("question")?,
                answer: row.try_get("answer")?,
                cloze_text: row.try_get("cloze_text")?,
                cloze_ranges: None,
                difficulty: row.try_get("difficulty")?,
                interval: row.try_get("interval")?,
                ease_factor: row.try_get("ease_factor")?,
                due_date: row.try_get("due_date")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                last_review_date: row.try_get("last_review_date")?,
                review_count: row.try_get("review_count")?,
                lapses: row.try_get("lapses")?,
                state: Self::parse_item_state(&state_str),
                is_suspended: row.try_get("is_suspended")?,
                tags,
                memory_state,
            });
        }

        Ok(items)
    }

    pub async fn get_learning_items_by_extract(&self, extract_id: &str) -> Result<Vec<LearningItem>> {
        let rows = sqlx::query("SELECT * FROM learning_items WHERE extract_id = ? ORDER BY date_created DESC")
            .bind(extract_id)
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let item_type_str: String = row.try_get("item_type")?;
            let state_str: String = row.try_get("state")?;
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            items.push(LearningItem {
                id: row.try_get("id")?,
                extract_id: row.try_get("extract_id")?,
                document_id: row.try_get("document_id")?,
                item_type: Self::parse_item_type(&item_type_str),
                question: row.try_get("question")?,
                answer: row.try_get("answer")?,
                cloze_text: row.try_get("cloze_text")?,
                cloze_ranges: None,
                difficulty: row.try_get("difficulty")?,
                interval: row.try_get("interval")?,
                ease_factor: row.try_get("ease_factor")?,
                due_date: row.try_get("due_date")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                last_review_date: row.try_get("last_review_date")?,
                review_count: row.try_get("review_count")?,
                lapses: row.try_get("lapses")?,
                state: Self::parse_item_state(&state_str),
                is_suspended: row.try_get("is_suspended")?,
                tags,
                memory_state,
            });
        }

        Ok(items)
    }

    pub async fn update_learning_item(&self, item: &LearningItem) -> Result<LearningItem> {
        let _item_type_str = format!("{:?}", item.item_type).to_lowercase();
        let state_str = format!("{:?}", item.state).to_lowercase();
        let _tags_json = serde_json::to_string(&item.tags)?;

        let (stability, difficulty) = item.memory_state.as_ref()
            .map(|s| (Some(s.stability), Some(s.difficulty)))
            .unwrap_or((None, None));

        sqlx::query(
            r#"
            UPDATE learning_items SET
                due_date = ?1, interval = ?2, ease_factor = ?3,
                state = ?4, review_count = ?5, lapses = ?6,
                last_review_date = ?7, date_modified = ?8,
                memory_state_stability = ?9, memory_state_difficulty = ?10
            WHERE id = ?11
            "#,
        )
        .bind(item.due_date)
        .bind(item.interval)
        .bind(item.ease_factor)
        .bind(&state_str)
        .bind(item.review_count)
        .bind(item.lapses)
        .bind(item.last_review_date)
        .bind(item.date_modified)
        .bind(stability)
        .bind(difficulty)
        .bind(&item.id)
        .execute(&self.pool)
        .await?;

        Ok(item.clone())
    }

    pub async fn get_all_learning_items(&self) -> Result<Vec<LearningItem>> {
        let rows = sqlx::query("SELECT * FROM learning_items WHERE is_suspended = false ORDER BY due_date ASC")
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let item_type_str: String = row.try_get("item_type")?;
            let state_str: String = row.try_get("state")?;
            let tags_json: String = row.try_get("tags")?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            let stability: Option<f64> = row.try_get("memory_state_stability").ok();
            let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
            let memory_state = Self::parse_memory_state(stability, difficulty);

            items.push(LearningItem {
                id: row.try_get("id")?,
                extract_id: row.try_get("extract_id")?,
                document_id: row.try_get("document_id")?,
                item_type: Self::parse_item_type(&item_type_str),
                question: row.try_get("question")?,
                answer: row.try_get("answer")?,
                cloze_text: row.try_get("cloze_text")?,
                cloze_ranges: None,
                difficulty: row.try_get("difficulty")?,
                interval: row.try_get("interval")?,
                ease_factor: row.try_get("ease_factor")?,
                due_date: row.try_get("due_date")?,
                date_created: row.try_get("date_created")?,
                date_modified: row.try_get("date_modified")?,
                last_review_date: row.try_get("last_review_date")?,
                review_count: row.try_get("review_count")?,
                lapses: row.try_get("lapses")?,
                state: Self::parse_item_state(&state_str),
                is_suspended: row.try_get("is_suspended")?,
                tags,
                memory_state,
            });
        }

        Ok(items)
    }

    // Review session operations

    /// Create a new review session
    pub async fn create_review_session(&self, id: &str) -> Result<()> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO review_sessions (id, start_time, items_reviewed, correct_answers, total_time)
            VALUES (?1, ?2, 0, 0, 0)
            "#,
        )
        .bind(id)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update a review session (increment counters, optionally set end_time)
    pub async fn update_review_session(
        &self,
        id: &str,
        items_reviewed: i32,
        correct_answers: i32,
        total_time: i32,
        end_session: bool,
    ) -> Result<()> {
        let end_time = if end_session { Some(Utc::now()) } else { None };

        if end_session {
            sqlx::query(
                r#"
                UPDATE review_sessions SET
                    items_reviewed = items_reviewed + ?1,
                    correct_answers = correct_answers + ?2,
                    total_time = total_time + ?3,
                    end_time = ?4
                WHERE id = ?5
                "#,
            )
            .bind(items_reviewed)
            .bind(correct_answers)
            .bind(total_time)
            .bind(end_time)
            .bind(id)
            .execute(&self.pool)
            .await?;
        } else {
            sqlx::query(
                r#"
                UPDATE review_sessions SET
                    items_reviewed = items_reviewed + ?1,
                    correct_answers = correct_answers + ?2,
                    total_time = total_time + ?3
                WHERE id = ?4
                "#,
            )
            .bind(items_reviewed)
            .bind(correct_answers)
            .bind(total_time)
            .bind(id)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// Create a review result record for a single card review
    pub async fn create_review_result(
        &self,
        id: &str,
        session_id: Option<&str>,
        item_id: &str,
        rating: i32,
        time_taken: i32,
        new_due_date: &chrono::DateTime<chrono::Utc>,
        new_interval: f64,
        new_ease_factor: f64,
    ) -> Result<()> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO review_results (id, session_id, item_id, rating, time_taken, new_due_date, new_interval, new_ease_factor, timestamp)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
        )
        .bind(id)
        .bind(session_id)
        .bind(item_id)
        .bind(rating)
        .bind(time_taken)
        .bind(new_due_date)
        .bind(new_interval)
        .bind(new_ease_factor)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get or create study statistics for a specific date
    pub async fn get_study_statistics(&self, date: &str) -> Result<Option<StudyStatsRow>> {
        let row = sqlx::query_as::<_, StudyStatsRow>(
            "SELECT * FROM study_statistics WHERE date = ?1"
        )
        .bind(date)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    /// Create study statistics for a specific date
    pub async fn create_study_statistics(&self, date: &str) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO study_statistics (id, date, cards_reviewed, correct_reviews, total_study_time, new_cards, learning_cards, review_cards)
            VALUES (?1, ?2, 0, 0, 0, 0, 0, 0)
            "#,
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(date)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update study statistics for a specific date
    pub async fn update_study_statistics(
        &self,
        date: &str,
        cards_reviewed: i32,
        correct_reviews: i32,
        study_time: i32,
        new_cards: i32,
        learning_cards: i32,
        review_cards: i32,
    ) -> Result<()> {
        // First try to get existing stats
        let existing = self.get_study_statistics(date).await?;

        if existing.is_some() {
            // Update existing record
            sqlx::query(
                r#"
                UPDATE study_statistics SET
                    cards_reviewed = cards_reviewed + ?1,
                    correct_reviews = correct_reviews + ?2,
                    total_study_time = total_study_time + ?3,
                    new_cards = new_cards + ?4,
                    learning_cards = learning_cards + ?5,
                    review_cards = review_cards + ?6
                WHERE date = ?7
                "#,
            )
            .bind(cards_reviewed)
            .bind(correct_reviews)
            .bind(study_time)
            .bind(new_cards)
            .bind(learning_cards)
            .bind(review_cards)
            .bind(date)
            .execute(&self.pool)
            .await?;
        } else {
            // Create new record
            self.create_study_statistics(date).await?;
            // Then update it
            sqlx::query(
                r#"
                UPDATE study_statistics SET
                    cards_reviewed = cards_reviewed + ?1,
                    correct_reviews = correct_reviews + ?2,
                    total_study_time = total_study_time + ?3,
                    new_cards = new_cards + ?4,
                    learning_cards = learning_cards + ?5,
                    review_cards = review_cards + ?6
                WHERE date = ?7
                "#,
            )
            .bind(cards_reviewed)
            .bind(correct_reviews)
            .bind(study_time)
            .bind(new_cards)
            .bind(learning_cards)
            .bind(review_cards)
            .bind(date)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn get_youtube_transcript_by_video_id(
        &self,
        video_id: &str,
    ) -> Result<Option<(String, String)>> {
        let row = sqlx::query(
            "SELECT transcript, segments_json FROM youtube_transcripts WHERE video_id = ?1 LIMIT 1",
        )
        .bind(video_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|row| {
            let transcript: String = row.get("transcript");
            let segments_json: String = row.get("segments_json");
            (transcript, segments_json)
        }))
    }

    pub async fn get_youtube_transcript_by_document_id(
        &self,
        document_id: &str,
    ) -> Result<Option<(String, String)>> {
        let row = sqlx::query(
            "SELECT transcript, segments_json FROM youtube_transcripts WHERE document_id = ?1 LIMIT 1",
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|row| {
            let transcript: String = row.get("transcript");
            let segments_json: String = row.get("segments_json");
            (transcript, segments_json)
        }))
    }

    pub async fn upsert_youtube_transcript(
        &self,
        document_id: Option<&str>,
        video_id: &str,
        transcript: &str,
        segments_json: &str,
    ) -> Result<()> {
        let now = Utc::now();
        let id = uuid::Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO youtube_transcripts (
                id, document_id, video_id, transcript, segments_json, date_created, date_modified
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(video_id) DO UPDATE SET
                document_id = COALESCE(excluded.document_id, youtube_transcripts.document_id),
                transcript = excluded.transcript,
                segments_json = excluded.segments_json,
                date_modified = excluded.date_modified
            "#,
        )
        .bind(id)
        .bind(document_id)
        .bind(video_id)
        .bind(transcript)
        .bind(segments_json)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // ============================================================================
    // RSS Feed operations
    // ============================================================================

    /// Get the count of unread articles for a specific RSS feed
    pub async fn get_rss_feed_unread_count(&self, feed_id: &str) -> Result<i32> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM rss_articles WHERE feed_id = ?1 AND is_read = 0")
            .bind(feed_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("count"))
    }

    // ============================================================================
    // RSS User Preferences operations
    // ============================================================================

    /// Get RSS user preferences for a specific feed or user
    pub async fn get_rss_user_preferences(
        &self,
        feed_id: Option<&str>,
        user_id: Option<&str>,
    ) -> Result<Option<crate::commands::rss::RssUserPreference>> {
        let row = match (feed_id, user_id) {
            (Some(fid), Some(uid)) => {
                sqlx::query(
                    "SELECT * FROM rss_user_preferences WHERE feed_id = ?1 AND user_id = ?2 LIMIT 1"
                )
                .bind(fid)
                .bind(uid)
                .fetch_optional(&self.pool)
                .await?
            }
            (Some(fid), None) => {
                sqlx::query(
                    "SELECT * FROM rss_user_preferences WHERE feed_id = ?1 LIMIT 1"
                )
                .bind(fid)
                .fetch_optional(&self.pool)
                .await?
            }
            (None, Some(uid)) => {
                sqlx::query(
                    "SELECT * FROM rss_user_preferences WHERE user_id = ?1 LIMIT 1"
                )
                .bind(uid)
                .fetch_optional(&self.pool)
                .await?
            }
            (None, None) => {
                sqlx::query("SELECT * FROM rss_user_preferences LIMIT 1")
                .fetch_optional(&self.pool)
                .await?
            }
        };

        Ok(row.map(|r| self.row_to_rss_user_preference(r)))
    }

    /// Set or update RSS user preferences
    pub async fn set_rss_user_preferences(
        &self,
        feed_id: Option<&str>,
        user_id: Option<&str>,
        prefs: crate::commands::rss::RssUserPreferenceUpdate,
    ) -> Result<crate::commands::rss::RssUserPreference> {
        let now = Utc::now().to_rfc3339();

        // Check if preferences already exist
        let existing = self.get_rss_user_preferences(feed_id, user_id).await?;

        let pref = if let Some(existing) = existing {
            // Update existing preferences
            let id = existing.id;
            sqlx::query(
                r#"
                UPDATE rss_user_preferences SET
                    keyword_include = COALESCE(?1, keyword_include),
                    keyword_exclude = COALESCE(?2, keyword_exclude),
                    author_whitelist = COALESCE(?3, author_whitelist),
                    author_blacklist = COALESCE(?4, author_blacklist),
                    category_filter = COALESCE(?5, category_filter),
                    view_mode = COALESCE(?6, view_mode),
                    theme_mode = COALESCE(?7, theme_mode),
                    density = COALESCE(?8, density),
                    column_count = COALESCE(?9, column_count),
                    show_thumbnails = COALESCE(?10, show_thumbnails),
                    excerpt_length = COALESCE(?11, excerpt_length),
                    show_author = COALESCE(?12, show_author),
                    show_date = COALESCE(?13, show_date),
                    show_feed_icon = COALESCE(?14, show_feed_icon),
                    sort_by = COALESCE(?15, sort_by),
                    sort_order = COALESCE(?16, sort_order),
                    date_modified = ?17
                WHERE id = ?18
                "#,
            )
            .bind(&prefs.keyword_include)
            .bind(&prefs.keyword_exclude)
            .bind(&prefs.author_whitelist)
            .bind(&prefs.author_blacklist)
            .bind(&prefs.category_filter)
            .bind(&prefs.view_mode)
            .bind(&prefs.theme_mode)
            .bind(&prefs.density)
            .bind(prefs.column_count)
            .bind(prefs.show_thumbnails)
            .bind(prefs.excerpt_length)
            .bind(prefs.show_author)
            .bind(prefs.show_date)
            .bind(prefs.show_feed_icon)
            .bind(&prefs.sort_by)
            .bind(&prefs.sort_order)
            .bind(&now)
            .bind(&id)
            .execute(&self.pool)
            .await?;

            self.get_rss_user_preferences_by_id(&id).await?.unwrap()
        } else {
            // Create new preferences
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(
                r#"
                INSERT INTO rss_user_preferences (
                    id, user_id, feed_id,
                    keyword_include, keyword_exclude, author_whitelist, author_blacklist, category_filter,
                    view_mode, theme_mode, density, column_count,
                    show_thumbnails, excerpt_length, show_author, show_date, show_feed_icon,
                    sort_by, sort_order,
                    date_created, date_modified
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
                "#,
            )
            .bind(&id)
            .bind(user_id)
            .bind(feed_id)
            .bind(&prefs.keyword_include)
            .bind(&prefs.keyword_exclude)
            .bind(&prefs.author_whitelist)
            .bind(&prefs.author_blacklist)
            .bind(&prefs.category_filter)
            .bind(&prefs.view_mode)
            .bind(&prefs.theme_mode)
            .bind(&prefs.density)
            .bind(prefs.column_count)
            .bind(prefs.show_thumbnails)
            .bind(prefs.excerpt_length)
            .bind(prefs.show_author)
            .bind(prefs.show_date)
            .bind(prefs.show_feed_icon)
            .bind(&prefs.sort_by)
            .bind(&prefs.sort_order)
            .bind(&now)
            .bind(&now)
            .execute(&self.pool)
            .await?;

            self.get_rss_user_preferences_by_id(&id).await?.unwrap()
        };

        Ok(pref)
    }

    /// Get RSS user preferences by ID
    async fn get_rss_user_preferences_by_id(
        &self,
        id: &str,
    ) -> Result<Option<crate::commands::rss::RssUserPreference>> {
        let row = sqlx::query("SELECT * FROM rss_user_preferences WHERE id = ?1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| self.row_to_rss_user_preference(r)))
    }

    /// Get all RSS user preferences for a user
    pub async fn get_all_rss_user_preferences(
        &self,
        user_id: &str,
    ) -> Result<Vec<crate::commands::rss::RssUserPreference>> {
        let rows = sqlx::query("SELECT * FROM rss_user_preferences WHERE user_id = ?1")
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|r| self.row_to_rss_user_preference(r)).collect())
    }

    /// Helper to convert database row to RssUserPreference
    fn row_to_rss_user_preference(&self, row: sqlx::sqlite::SqliteRow) -> crate::commands::rss::RssUserPreference {
        crate::commands::rss::RssUserPreference {
            id: row.get("id"),
            user_id: row.try_get("user_id").ok(),
            feed_id: row.try_get("feed_id").ok(),
            keyword_include: row.try_get("keyword_include").ok(),
            keyword_exclude: row.try_get("keyword_exclude").ok(),
            author_whitelist: row.try_get("author_whitelist").ok(),
            author_blacklist: row.try_get("author_blacklist").ok(),
            category_filter: row.try_get("category_filter").ok(),
            view_mode: row.try_get("view_mode").ok(),
            theme_mode: row.try_get("theme_mode").ok(),
            density: row.try_get("density").ok(),
            column_count: row.try_get("column_count").ok(),
            show_thumbnails: row.try_get("show_thumbnails").ok(),
            excerpt_length: row.try_get("excerpt_length").ok(),
            show_author: row.try_get("show_author").ok(),
            show_date: row.try_get("show_date").ok(),
            show_feed_icon: row.try_get("show_feed_icon").ok(),
            sort_by: row.try_get("sort_by").ok(),
            sort_order: row.try_get("sort_order").ok(),
            date_created: row.get("date_created"),
            date_modified: row.get("date_modified"),
        }
    }
}

// Helper struct for study statistics rows
#[derive(sqlx::FromRow)]
struct StudyStatsRow {
    id: String,
    date: String,
    cards_reviewed: i32,
    correct_reviews: i32,
    total_study_time: i32,
    new_cards: i32,
    learning_cards: i32,
    review_cards: i32,
}
