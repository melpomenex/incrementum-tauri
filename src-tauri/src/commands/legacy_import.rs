//! Legacy Incrementum archive import

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::{fs, io};
use tauri::State;

use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{Row, SqlitePool, sqlite::SqliteConnectOptions};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::database::{migrations::MIGRATIONS, Repository};
use crate::error::{IncrementumError, Result};
use crate::models::{Document, Extract, FileType, ItemState, ItemType, LearningItem, MemoryState};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyImportSummary {
    pub documents: usize,
    pub extracts: usize,
    pub learning_items: usize,
    pub review_sessions: usize,
    pub review_results: usize,
}

#[tauri::command]
pub async fn import_legacy_archive(
    archive_path: String,
    repo: State<'_, Repository>,
) -> Result<LegacyImportSummary> {
    let archive_path = PathBuf::from(archive_path);
    if !archive_path.exists() {
        return Err(IncrementumError::NotFound("Archive file not found".to_string()));
    }

    let ext = archive_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if ext != "zip" && ext != "7z" {
        return Err(IncrementumError::InvalidInput(
            "Unsupported archive type. Use .zip or .7z".to_string(),
        ));
    }

    let import_root = std::env::temp_dir()
        .join("incrementum-legacy-import")
        .join(Uuid::new_v4().to_string());
    fs::create_dir_all(&import_root)?;

    if ext == "zip" {
        let archive_path = archive_path.clone();
        let import_root = import_root.clone();
        tokio::task::spawn_blocking(move || extract_zip(&archive_path, &import_root))
            .await
            .map_err(|e| IncrementumError::Internal(format!("ZIP extraction failed: {}", e)))??;
    } else {
        let archive_path = archive_path.clone();
        let import_root = import_root.clone();
        tokio::task::spawn_blocking(move || extract_7z(&archive_path, &import_root))
            .await
            .map_err(|e| IncrementumError::Internal(format!("7z extraction failed: {}", e)))??;
    }

    let legacy_db_path = find_legacy_db(&import_root)?;
    let legacy_pool = open_legacy_db(&legacy_db_path).await?;

    run_legacy_migrations(&legacy_pool).await?;

    let summary = merge_legacy_database(&legacy_pool, &repo).await?;

    let _ = fs::remove_dir_all(&import_root);

    Ok(summary)
}

fn extract_zip(archive_path: &Path, dest: &Path) -> Result<()> {
    let file = fs::File::open(archive_path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| IncrementumError::InvalidInput(format!("Invalid ZIP archive: {}", e)))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| IncrementumError::InvalidInput(format!("Invalid ZIP entry: {}", e)))?;
        let entry_path = match entry.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if entry.name().ends_with('/') {
            fs::create_dir_all(&entry_path)?;
            continue;
        }

        if let Some(parent) = entry_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut outfile = fs::File::create(&entry_path)?;
        io::copy(&mut entry, &mut outfile)?;
    }

    Ok(())
}

fn extract_7z(archive_path: &Path, dest: &Path) -> Result<()> {
    let archive_str = archive_path.to_string_lossy().to_string();
    let dest_str = dest.to_string_lossy().to_string();

    let status = std::process::Command::new("7z")
        .arg("x")
        .arg("-y")
        .arg(&archive_str)
        .arg(format!("-o{}", dest_str))
        .status()
        .or_else(|_| {
            std::process::Command::new("7za")
                .arg("x")
                .arg("-y")
                .arg(&archive_str)
                .arg(format!("-o{}", dest_str))
                .status()
        });

    match status {
        Ok(status) if status.success() => Ok(()),
        Ok(_) => Err(IncrementumError::Internal(
            "7z extraction failed. Ensure 7z is installed and the archive is valid.".to_string(),
        )),
        Err(_) => Err(IncrementumError::Internal(
            "7z executable not found. Install 7z to import .7z archives.".to_string(),
        )),
    }
}

fn find_legacy_db(root: &Path) -> Result<PathBuf> {
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if name == "incrementum.db" {
                return Ok(entry.path().to_path_buf());
            }
        }
    }

    Err(IncrementumError::NotFound(
        "Could not locate incrementum.db in archive".to_string(),
    ))
}

async fn open_legacy_db(path: &Path) -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false);

    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to open legacy DB: {}", e)))?;

    Ok(pool)
}

async fn run_legacy_migrations(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    let applied: Vec<String> = sqlx::query_as::<_, (String,)>(
        "SELECT name FROM _schema_migrations ORDER BY applied_at",
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(name,)| name)
    .collect();

    for migration in MIGRATIONS {
        if applied.contains(&migration.name.to_string()) {
            continue;
        }

        let mut tx = pool.begin().await?;
        for statement in migration.sql.split(';') {
            let statement = statement.trim();
            if statement.is_empty() {
                continue;
            }

            if let Err(err) = sqlx::query(statement).execute(&mut *tx).await {
                if is_ignorable_migration_error(&err) {
                    continue;
                }
                return Err(IncrementumError::Internal(format!(
                    "Migration {} failed: {}",
                    migration.name, err
                )));
            }
        }

        let applied_at = Utc::now().to_rfc3339();
        sqlx::query("INSERT INTO _schema_migrations (name, applied_at) VALUES (?1, ?2)")
            .bind(migration.name)
            .bind(&applied_at)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
    }

    Ok(())
}

fn is_ignorable_migration_error(err: &sqlx::Error) -> bool {
    let message = err.to_string().to_lowercase();
    message.contains("duplicate column")
        || message.contains("already exists")
        || message.contains("duplicate name")
}

async fn merge_legacy_database(
    legacy_pool: &SqlitePool,
    repo: &Repository,
) -> Result<LegacyImportSummary> {
    let existing_docs = repo.list_documents().await?;
    let mut content_hash_map: HashMap<String, String> = HashMap::new();
    let mut path_map: HashMap<String, String> = HashMap::new();
    let mut doc_id_set: HashSet<String> = HashSet::new();

    for doc in &existing_docs {
        if let Some(hash) = &doc.content_hash {
            content_hash_map.insert(hash.clone(), doc.id.clone());
        }
        path_map.insert(doc.file_path.clone(), doc.id.clone());
        doc_id_set.insert(doc.id.clone());
    }

    let mut extract_id_set = load_id_set(repo.pool(), "extracts").await?;
    let mut learning_item_id_set = load_id_set(repo.pool(), "learning_items").await?;
    let mut review_session_id_set = load_id_set(repo.pool(), "review_sessions").await?;
    let mut review_result_id_set = load_id_set(repo.pool(), "review_results").await?;

    let mut doc_id_map: HashMap<String, String> = HashMap::new();
    let mut extract_id_map: HashMap<String, String> = HashMap::new();
    let mut learning_item_id_map: HashMap<String, String> = HashMap::new();

    let mut documents_imported = 0;
    let mut extracts_imported = 0;
    let mut learning_items_imported = 0;
    let mut review_sessions_imported = 0;
    let mut review_results_imported = 0;

    let legacy_docs = sqlx::query("SELECT * FROM documents")
        .fetch_all(legacy_pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to read legacy documents: {}", e)))?;

    for row in legacy_docs {
        let legacy_id: String = row.try_get("id")?;
        let file_path: String = row.try_get("file_path")?;
        let content_hash: Option<String> = row.try_get("content_hash").ok();

        if let Some(existing_id) = content_hash
            .as_ref()
            .and_then(|hash| content_hash_map.get(hash))
            .or_else(|| path_map.get(&file_path))
            .cloned()
        {
            doc_id_map.insert(legacy_id, existing_id);
            continue;
        }

        let mut doc = parse_document_row(&row)?;
        if doc_id_set.contains(&doc.id) {
            doc.id = Uuid::new_v4().to_string();
        }

        let created = repo.create_document(&doc).await?;
        documents_imported += 1;
        doc_id_set.insert(created.id.clone());
        doc_id_map.insert(legacy_id, created.id.clone());
        if let Some(hash) = &created.content_hash {
            content_hash_map.insert(hash.clone(), created.id.clone());
        }
        path_map.insert(created.file_path.clone(), created.id.clone());
    }

    let legacy_extracts = sqlx::query("SELECT * FROM extracts")
        .fetch_all(legacy_pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to read legacy extracts: {}", e)))?;

    for row in legacy_extracts {
        let _legacy_id: String = row.try_get("id")?;
        let legacy_document_id: String = row.try_get("document_id")?;
        let target_document_id = match doc_id_map.get(&legacy_document_id) {
            Some(id) => id.clone(),
            None => continue,
        };

        let mut extract = parse_extract_row(&row)?;
        extract.document_id = target_document_id;
        if extract_id_set.contains(&extract.id) {
            let new_id = Uuid::new_v4().to_string();
            extract_id_map.insert(extract.id.clone(), new_id.clone());
            extract.id = new_id;
        } else {
            extract_id_map.insert(extract.id.clone(), extract.id.clone());
        }

        repo.create_extract(&extract).await?;
        extracts_imported += 1;
        extract_id_set.insert(extract.id.clone());
    }

    let legacy_learning_items = sqlx::query("SELECT * FROM learning_items")
        .fetch_all(legacy_pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to read legacy learning items: {}", e)))?;

    for row in legacy_learning_items {
        let legacy_id: String = row.try_get("id")?;
        let legacy_document_id: Option<String> = row.try_get("document_id").ok();
        let legacy_extract_id: Option<String> = row.try_get("extract_id").ok();

        let mapped_document_id = legacy_document_id
            .as_ref()
            .and_then(|id| doc_id_map.get(id))
            .cloned();

        let mapped_extract_id = legacy_extract_id
            .as_ref()
            .and_then(|id| extract_id_map.get(id))
            .cloned();

        let mut item = parse_learning_item_row(&row)?;
        item.document_id = mapped_document_id;
        item.extract_id = mapped_extract_id;

        if learning_item_id_set.contains(&item.id) {
            item.id = Uuid::new_v4().to_string();
        }

        let new_id = item.id.clone();
        repo.create_learning_item(&item).await?;
        learning_items_imported += 1;
        learning_item_id_set.insert(new_id.clone());
        learning_item_id_map.insert(legacy_id, new_id);
    }

    let legacy_sessions = sqlx::query("SELECT * FROM review_sessions")
        .fetch_all(legacy_pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to read legacy review sessions: {}", e)))?;

    let mut session_id_map: HashMap<String, String> = HashMap::new();
    for row in legacy_sessions {
        let legacy_id: String = row.try_get("id")?;
        let mut new_id = legacy_id.clone();
        if review_session_id_set.contains(&new_id) {
            new_id = Uuid::new_v4().to_string();
        }

        sqlx::query(
            r#"
            INSERT INTO review_sessions (
                id, start_time, end_time, items_reviewed, correct_answers, total_time
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
        )
        .bind(&new_id)
        .bind::<DateTime<Utc>>(row.try_get("start_time")?)
        .bind::<Option<DateTime<Utc>>>(row.try_get("end_time")?)
        .bind::<i32>(row.try_get("items_reviewed")?)
        .bind::<i32>(row.try_get("correct_answers")?)
        .bind::<i32>(row.try_get("total_time")?)
        .execute(repo.pool())
        .await?;

        review_session_id_set.insert(new_id.clone());
        session_id_map.insert(legacy_id, new_id);
        review_sessions_imported += 1;
    }

    let legacy_results = sqlx::query("SELECT * FROM review_results")
        .fetch_all(legacy_pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to read legacy review results: {}", e)))?;

    for row in legacy_results {
        let legacy_id: String = row.try_get("id")?;
        let legacy_session_id: Option<String> = row.try_get("session_id").ok();
        let legacy_item_id: String = row.try_get("item_id")?;

        let session_id = legacy_session_id
            .as_ref()
            .and_then(|id| session_id_map.get(id))
            .cloned();

        let item_id = match learning_item_id_map.get(&legacy_item_id) {
            Some(mapped) => mapped.clone(),
            None => continue,
        };

        let mut new_id = legacy_id.clone();
        if review_result_id_set.contains(&new_id) {
            new_id = Uuid::new_v4().to_string();
        }

        sqlx::query(
            r#"
            INSERT INTO review_results (
                id, session_id, item_id, rating, time_taken,
                new_due_date, new_interval, new_ease_factor, timestamp
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
        )
        .bind(&new_id)
        .bind(session_id)
        .bind(&item_id)
        .bind::<i32>(row.try_get("rating")?)
        .bind::<i32>(row.try_get("time_taken")?)
        .bind::<DateTime<Utc>>(row.try_get("new_due_date")?)
        .bind::<i32>(row.try_get("new_interval")?)
        .bind::<f64>(row.try_get("new_ease_factor")?)
        .bind::<DateTime<Utc>>(row.try_get("timestamp")?)
        .execute(repo.pool())
        .await?;

        review_result_id_set.insert(new_id);
        review_results_imported += 1;
    }

    refresh_document_counts(repo.pool()).await?;

    Ok(LegacyImportSummary {
        documents: documents_imported,
        extracts: extracts_imported,
        learning_items: learning_items_imported,
        review_sessions: review_sessions_imported,
        review_results: review_results_imported,
    })
}

async fn load_id_set(pool: &SqlitePool, table: &str) -> Result<HashSet<String>> {
    let query = format!("SELECT id FROM {}", table);
    let rows = sqlx::query(&query)
        .fetch_all(pool)
        .await
        .map_err(|e| IncrementumError::Internal(format!("Failed to query {} ids: {}", table, e)))?;

    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get("id").ok())
        .collect())
}

async fn refresh_document_counts(pool: &SqlitePool) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE documents
        SET extract_count = (
            SELECT COUNT(*) FROM extracts WHERE extracts.document_id = documents.id
        ),
        learning_item_count = (
            SELECT COUNT(*) FROM learning_items WHERE learning_items.document_id = documents.id
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

fn parse_document_row(row: &sqlx::sqlite::SqliteRow) -> Result<Document> {
    let file_type: String = row.try_get("file_type")?;
    let tags_json: String = row.try_get("tags").unwrap_or_else(|_| "[]".to_string());
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    let metadata_json: Option<String> = row.try_get("metadata").ok();
    let metadata = metadata_json
        .as_ref()
        .and_then(|json| serde_json::from_str(json).ok());

    Ok(Document {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        file_path: row.try_get("file_path")?,
        file_type: parse_file_type(&file_type),
        content: row.try_get::<Option<String>, _>("content").unwrap_or(None),
        content_hash: row.try_get::<Option<String>, _>("content_hash").unwrap_or(None),
        total_pages: row.try_get::<Option<i32>, _>("total_pages").unwrap_or(None),
        current_page: row.try_get::<Option<i32>, _>("current_page").unwrap_or(None),
        current_scroll_percent: row.try_get("current_scroll_percent").ok(),
        current_cfi: row.try_get("current_cfi").ok(),
        current_view_state: row.try_get("current_view_state").ok(),
        position_json: row.try_get("position_json").ok(),
        progress_percent: row.try_get("progress_percent").ok(),
        category: row.try_get::<Option<String>, _>("category").unwrap_or(None),
        tags,
        date_added: row.try_get("date_added")?,
        date_modified: row.try_get("date_modified")?,
        date_last_reviewed: row.try_get::<Option<DateTime<Utc>>, _>("date_last_reviewed").unwrap_or(None),
        extract_count: row.try_get::<i64, _>("extract_count").unwrap_or(0) as i32,
        learning_item_count: row.try_get::<i64, _>("learning_item_count").unwrap_or(0) as i32,
        priority_rating: row.try_get::<i64, _>("priority_rating").unwrap_or(0) as i32,
        priority_slider: row.try_get::<i64, _>("priority_slider").unwrap_or(0) as i32,
        priority_score: row.try_get("priority_score").unwrap_or(0.0),
        is_archived: row.try_get::<i64, _>("is_archived").unwrap_or(0) != 0,
        is_favorite: row.try_get::<i64, _>("is_favorite").unwrap_or(0) != 0,
        metadata,
        cover_image_url: row.try_get("cover_image_url").ok(),
        cover_image_source: row.try_get("cover_image_source").ok(),
        // Scheduling fields - use try_get for compatibility
        next_reading_date: row.try_get("next_reading_date").ok(),
        reading_count: row.try_get("reading_count").unwrap_or(0),
        stability: row.try_get("stability").ok(),
        difficulty: row.try_get("difficulty").ok(),
        reps: row.try_get("reps").ok(),
        total_time_spent: row.try_get("total_time_spent").ok(),
        consecutive_count: row.try_get("consecutive_count").ok(),
    })
}

fn parse_extract_row(row: &sqlx::sqlite::SqliteRow) -> Result<Extract> {
    let tags_json: String = row.try_get("tags").unwrap_or_else(|_| "[]".to_string());
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    // Parse FSRS memory state
    let stability: Option<f64> = row.try_get("memory_state_stability").ok();
    let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
    let memory_state = match (stability, difficulty) {
        (Some(stability), Some(difficulty)) => Some(MemoryState { stability, difficulty }),
        _ => None,
    };

    Ok(Extract {
        id: row.try_get("id")?,
        document_id: row.try_get("document_id")?,
        content: row.try_get("content")?,
        html_content: row.try_get::<Option<String>, _>("html_content").ok().flatten(),
        source_url: row.try_get::<Option<String>, _>("source_url").ok().flatten(),
        page_title: row.try_get::<Option<String>, _>("page_title").unwrap_or(None),
        page_number: row.try_get::<Option<i32>, _>("page_number").unwrap_or(None),
        highlight_color: row.try_get::<Option<String>, _>("highlight_color").unwrap_or(None),
        notes: row.try_get::<Option<String>, _>("notes").unwrap_or(None),
        progressive_disclosure_level: row.try_get::<i64, _>("progressive_disclosure_level").unwrap_or(0) as i32,
        max_disclosure_level: row.try_get::<i64, _>("max_disclosure_level").unwrap_or(3) as i32,
        date_created: row.try_get("date_created")?,
        date_modified: row.try_get("date_modified")?,
        tags,
        category: row.try_get::<Option<String>, _>("category").unwrap_or(None),
        memory_state,
        next_review_date: row.try_get::<Option<String>, _>("next_review_date")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc)),
        last_review_date: row.try_get::<Option<String>, _>("last_review_date")
            .ok()
            .flatten()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc)),
        review_count: row.try_get::<i64, _>("review_count").unwrap_or(0) as i32,
        reps: row.try_get::<i64, _>("reps").unwrap_or(0) as i32,
    })
}

fn parse_learning_item_row(row: &sqlx::sqlite::SqliteRow) -> Result<LearningItem> {
    let item_type_str: String = row.try_get("item_type")?;
    let state_str: String = row.try_get("state")?;
    let tags_json: String = row.try_get("tags").unwrap_or_else(|_| "[]".to_string());
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    let stability: Option<f64> = row.try_get("memory_state_stability").ok();
    let difficulty: Option<f64> = row.try_get("memory_state_difficulty").ok();
    let memory_state = match (stability, difficulty) {
        (Some(stability), Some(difficulty)) => Some(MemoryState { stability, difficulty }),
        _ => None,
    };

    Ok(LearningItem {
        id: row.try_get("id")?,
        extract_id: row.try_get::<Option<String>, _>("extract_id").unwrap_or(None),
        document_id: row.try_get::<Option<String>, _>("document_id").unwrap_or(None),
        item_type: parse_item_type(&item_type_str),
        question: row.try_get("question")?,
        answer: row.try_get::<Option<String>, _>("answer").unwrap_or(None),
        cloze_text: row.try_get::<Option<String>, _>("cloze_text").unwrap_or(None),
        cloze_ranges: None,
        difficulty: row.try_get::<i64, _>("difficulty").unwrap_or(3) as i32,
        interval: row.try_get::<f64, _>("interval").unwrap_or(0.0),
        ease_factor: row.try_get("ease_factor").unwrap_or(2.5),
        due_date: row.try_get("due_date")?,
        date_created: row.try_get("date_created")?,
        date_modified: row.try_get("date_modified")?,
        last_review_date: row.try_get::<Option<DateTime<Utc>>, _>("last_review_date").unwrap_or(None),
        review_count: row.try_get::<i64, _>("review_count").unwrap_or(0) as i32,
        lapses: row.try_get::<i64, _>("lapses").unwrap_or(0) as i32,
        state: parse_item_state(&state_str),
        is_suspended: row.try_get::<i64, _>("is_suspended").unwrap_or(0) != 0,
        tags,
        memory_state,
    })
}

fn parse_file_type(file_type: &str) -> FileType {
    match file_type {
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

fn parse_item_type(item_type: &str) -> ItemType {
    match item_type {
        "flashcard" => ItemType::Flashcard,
        "cloze" => ItemType::Cloze,
        "qa" => ItemType::Qa,
        _ => ItemType::Basic,
    }
}

fn parse_item_state(state: &str) -> ItemState {
    match state {
        "new" => ItemState::New,
        "learning" => ItemState::Learning,
        "review" => ItemState::Review,
        _ => ItemState::Relearning,
    }
}
