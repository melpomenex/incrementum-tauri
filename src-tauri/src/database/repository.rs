//! Repository pattern for database operations

use sqlx::{Pool, Sqlite, Row};
use crate::error::Result;
use crate::models::{Document, Extract, LearningItem, Category, FileType, ItemType, ItemState};

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
        let metadata_json = document.metadata.as_ref().map(|m| serde_json::to_string(m)).transpose()?;

        sqlx::query(
            r#"
            INSERT INTO documents (
                id, title, file_path, file_type, content, content_hash,
                total_pages, current_page, category, tags,
                date_added, date_modified, date_last_reviewed,
                extract_count, learning_item_count, priority_score,
                is_archived, is_favorite, metadata
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
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
        .bind(&document.category)
        .bind(&tags_json)
        .bind(&document.date_added)
        .bind(&document.date_modified)
        .bind(&document.date_last_reviewed)
        .bind(document.extract_count)
        .bind(document.learning_item_count)
        .bind(document.priority_score)
        .bind(document.is_archived)
        .bind(document.is_favorite)
        .bind(metadata_json)
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
                    category: row.get("category"),
                    tags,
                    date_added: row.get("date_added"),
                    date_modified: row.get("date_modified"),
                    date_last_reviewed: row.get("date_last_reviewed"),
                    extract_count: row.get("extract_count"),
                    learning_item_count: row.get("learning_item_count"),
                    priority_score: row.get("priority_score"),
                    is_archived: row.get("is_archived"),
                    is_favorite: row.get("is_favorite"),
                    metadata,
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
                category: row.get("category"),
                tags,
                date_added: row.get("date_added"),
                date_modified: row.get("date_modified"),
                date_last_reviewed: row.get("date_last_reviewed"),
                extract_count: row.get("extract_count"),
                learning_item_count: row.get("learning_item_count"),
                priority_score: row.get("priority_score"),
                is_archived: row.get("is_archived"),
                is_favorite: row.get("is_favorite"),
                metadata,
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
                tags = ?5, date_modified = ?6, priority_score = ?7,
                is_archived = ?8, is_favorite = ?9
            WHERE id = ?10
            "#,
        )
        .bind(&updates.title)
        .bind(&updates.file_path)
        .bind(updates.current_page)
        .bind(&updates.category)
        .bind(&tags_json)
        .bind(&updates.date_modified)
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

        sqlx::query(
            r#"
            INSERT INTO extracts (
                id, document_id, content, page_title, page_number,
                highlight_color, notes, progressive_disclosure_level,
                max_disclosure_level, date_created, date_modified,
                tags, category
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
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
        .bind(&extract.date_created)
        .bind(&extract.date_modified)
        .bind(&tags_json)
        .bind(&extract.category)
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
            });
        }

        Ok(extracts)
    }

    pub async fn update_extract(&self, extract: &Extract) -> Result<Extract> {
        let tags_json = serde_json::to_string(&extract.tags)?;

        sqlx::query(
            r#"
            UPDATE extracts SET
                content = ?1, notes = ?2, highlight_color = ?3,
                tags = ?4, category = ?5, date_modified = ?6
            WHERE id = ?7
            "#,
        )
        .bind(&extract.content)
        .bind(&extract.notes)
        .bind(&extract.highlight_color)
        .bind(&tags_json)
        .bind(&extract.category)
        .bind(&extract.date_modified)
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
        .bind(&item.due_date)
        .bind(&item.date_created)
        .bind(&item.date_modified)
        .bind(&item.last_review_date)
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

    pub async fn update_learning_item(&self, item: &LearningItem) -> Result<LearningItem> {
        let item_type_str = format!("{:?}", item.item_type).to_lowercase();
        let state_str = format!("{:?}", item.state).to_lowercase();
        let tags_json = serde_json::to_string(&item.tags)?;

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
        .bind(&item.due_date)
        .bind(item.interval)
        .bind(item.ease_factor)
        .bind(&state_str)
        .bind(item.review_count)
        .bind(item.lapses)
        .bind(&item.last_review_date)
        .bind(&item.date_modified)
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
}
