//! RSS feed commands

use tauri::State;
use crate::database::Repository;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sqlx::Row;

/// RSS feed model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RssFeed {
    pub id: String,
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub update_interval: i32, // seconds
    pub last_fetched: Option<String>,
    pub is_active: bool,
    pub date_added: String,
    pub auto_queue: bool,
}

/// RSS article model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RssArticle {
    pub id: String,
    pub feed_id: String,
    pub url: String,
    pub title: String,
    pub author: Option<String>,
    pub published_date: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub image_url: Option<String>,
    pub is_queued: bool,
    pub is_read: bool,
    pub date_added: String,
}

/// Create a new RSS feed subscription
#[tauri::command]
pub async fn create_rss_feed(
    url: String,
    title: String,
    description: Option<String>,
    category: Option<String>,
    update_interval: Option<i32>,
    auto_queue: Option<bool>,
    repo: State<'_, Repository>,
) -> Result<RssFeed> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let feed = RssFeed {
        id: id.clone(),
        url,
        title,
        description,
        category,
        update_interval: update_interval.unwrap_or(3600), // Default 1 hour
        last_fetched: None,
        is_active: true,
        date_added: now,
        auto_queue: auto_queue.unwrap_or(false),
    };

    // Insert feed into database
    sqlx::query(
        r#"
        INSERT INTO rss_feeds (id, url, title, description, category, update_interval, last_fetched, is_active, date_added, auto_queue)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
    )
    .bind(&feed.id)
    .bind(&feed.url)
    .bind(&feed.title)
    .bind(&feed.description)
    .bind(&feed.category)
    .bind(feed.update_interval)
    .bind(&feed.last_fetched)
    .bind(feed.is_active)
    .bind(&feed.date_added)
    .bind(feed.auto_queue)
    .execute(repo.pool())
    .await
    .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to create RSS feed: {}", e)))?;

    Ok(feed)
}

/// Get all RSS feeds
#[tauri::command]
pub async fn get_rss_feeds(repo: State<'_, Repository>) -> Result<Vec<RssFeed>> {
    let rows = sqlx::query("SELECT * FROM rss_feeds ORDER BY title")
        .fetch_all(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch RSS feeds: {}", e)))?;

    let mut feeds = Vec::new();
    for row in rows {
        feeds.push(RssFeed {
            id: row.get("id"),
            url: row.get("url"),
            title: row.get("title"),
            description: row.get("description"),
            category: row.get("category"),
            update_interval: row.get("update_interval"),
            last_fetched: row.get("last_fetched"),
            is_active: row.get("is_active"),
            date_added: row.get("date_added"),
            auto_queue: row.get("auto_queue"),
        });
    }

    Ok(feeds)
}

/// Get RSS feed by ID
#[tauri::command]
pub async fn get_rss_feed(id: String, repo: State<'_, Repository>) -> Result<Option<RssFeed>> {
    let row = sqlx::query("SELECT * FROM rss_feeds WHERE id = ?")
        .bind(&id)
        .fetch_optional(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch RSS feed: {}", e)))?;

    match row {
        Some(row) => Ok(Some(RssFeed {
            id: row.get("id"),
            url: row.get("url"),
            title: row.get("title"),
            description: row.get("description"),
            category: row.get("category"),
            update_interval: row.get("update_interval"),
            last_fetched: row.get("last_fetched"),
            is_active: row.get("is_active"),
            date_added: row.get("date_added"),
            auto_queue: row.get("auto_queue"),
        })),
        None => Ok(None),
    }
}

/// Update RSS feed
#[tauri::command]
pub async fn update_rss_feed(
    id: String,
    title: Option<String>,
    description: Option<String>,
    category: Option<String>,
    update_interval: Option<i32>,
    auto_queue: Option<bool>,
    is_active: Option<bool>,
    repo: State<'_, Repository>,
) -> Result<RssFeed> {
    // Build dynamic update query
    let mut updates = Vec::new();
    let mut query = String::from("UPDATE rss_feeds SET ");

    if title.is_some() {
        updates.push(format!("title = '{}'", title.unwrap()));
    }
    if description.is_some() {
        updates.push(format!("description = '{}'", description.unwrap()));
    }
    if category.is_some() {
        updates.push(format!("category = '{}'", category.unwrap()));
    }
    if update_interval.is_some() {
        updates.push(format!("update_interval = {}", update_interval.unwrap()));
    }
    if auto_queue.is_some() {
        updates.push(format!("auto_queue = {}", if auto_queue.unwrap() { 1 } else { 0 }));
    }
    if is_active.is_some() {
        updates.push(format!("is_active = {}", if is_active.unwrap() { 1 } else { 0 }));
    }

    if updates.is_empty() {
        return get_rss_feed(id, repo).await?.ok_or_else(|| {
            crate::error::IncrementumError::NotFound("Feed not found".to_string())
        });
    }

    query.push_str(&updates.join(", "));
    query.push_str(&format!(" WHERE id = '{}'", id));

    sqlx::query(&query)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to update RSS feed: {}", e)))?;

    get_rss_feed(id, repo).await?.ok_or_else(|| {
        crate::error::IncrementumError::NotFound("Feed not found".to_string())
    })
}

/// Delete RSS feed
#[tauri::command]
pub async fn delete_rss_feed(id: String, repo: State<'_, Repository>) -> Result<()> {
    sqlx::query("DELETE FROM rss_feeds WHERE id = ?")
        .bind(&id)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to delete RSS feed: {}", e)))?;

    Ok(())
}

/// Add article to database
#[tauri::command]
pub async fn create_rss_article(
    feed_id: String,
    url: String,
    title: String,
    author: Option<String>,
    published_date: Option<String>,
    content: Option<String>,
    summary: Option<String>,
    image_url: Option<String>,
    repo: State<'_, Repository>,
) -> Result<RssArticle> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let article = RssArticle {
        id: id.clone(),
        feed_id,
        url,
        title,
        author,
        published_date,
        content,
        summary,
        image_url,
        is_queued: false,
        is_read: false,
        date_added: now,
    };

    sqlx::query(
        r#"
        INSERT INTO rss_articles (id, feed_id, url, title, author, published_date, content, summary, image_url, is_queued, is_read, date_added)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        "#,
    )
    .bind(&article.id)
    .bind(&article.feed_id)
    .bind(&article.url)
    .bind(&article.title)
    .bind(&article.author)
    .bind(&article.published_date)
    .bind(&article.content)
    .bind(&article.summary)
    .bind(&article.image_url)
    .bind(article.is_queued)
    .bind(article.is_read)
    .bind(&article.date_added)
    .execute(repo.pool())
    .await
    .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to create RSS article: {}", e)))?;

    Ok(article)
}

/// Get articles for a feed
#[tauri::command]
pub async fn get_rss_articles(
    feed_id: Option<String>,
    limit: Option<i32>,
    repo: State<'_, Repository>,
) -> Result<Vec<RssArticle>> {
    let query = if let Some(feed_id) = feed_id {
        format!("SELECT * FROM rss_articles WHERE feed_id = '{}' ORDER BY published_date DESC LIMIT {}", feed_id, limit.unwrap_or(50))
    } else {
        format!("SELECT * FROM rss_articles ORDER BY published_date DESC LIMIT {}", limit.unwrap_or(100))
    };

    let rows = sqlx::query(&query)
        .fetch_all(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch RSS articles: {}", e)))?;

    let mut articles = Vec::new();
    for row in rows {
        articles.push(RssArticle {
            id: row.get("id"),
            feed_id: row.get("feed_id"),
            url: row.get("url"),
            title: row.get("title"),
            author: row.get("author"),
            published_date: row.get("published_date"),
            content: row.get("content"),
            summary: row.get("summary"),
            image_url: row.get("image_url"),
            is_queued: row.get("is_queued"),
            is_read: row.get("is_read"),
            date_added: row.get("date_added"),
        });
    }

    Ok(articles)
}

/// Mark article as read/unread
#[tauri::command]
pub async fn mark_rss_article_read(id: String, is_read: bool, repo: State<'_, Repository>) -> Result<()> {
    sqlx::query("UPDATE rss_articles SET is_read = ? WHERE id = ?")
        .bind(is_read)
        .bind(&id)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to mark article: {}", e)))?;

    Ok(())
}

/// Toggle article queued status
#[tauri::command]
pub async fn toggle_rss_article_queued(id: String, repo: State<'_, Repository>) -> Result<bool> {
    // Get current status
    let row = sqlx::query("SELECT is_queued FROM rss_articles WHERE id = ?")
        .bind(&id)
        .fetch_optional(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to get article: {}", e)))?;

    match row {
        Some(row) => {
            let current: bool = row.get("is_queued");
            let new_status = !current;

            sqlx::query("UPDATE rss_articles SET is_queued = ? WHERE id = ?")
                .bind(new_status)
                .bind(&id)
                .execute(repo.pool())
                .await
                .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to update article: {}", e)))?;

            Ok(new_status)
        }
        None => Err(crate::error::IncrementumError::NotFound("Article not found".to_string()).into()),
    }
}

/// Update feed last fetched timestamp
#[tauri::command]
pub async fn update_rss_feed_fetched(id: String, repo: State<'_, Repository>) -> Result<()> {
    let now = Utc::now().to_rfc3339();

    sqlx::query("UPDATE rss_feeds SET last_fetched = ? WHERE id = ?")
        .bind(&now)
        .bind(&id)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to update feed: {}", e)))?;

    Ok(())
}

/// Get unread article count for a feed
#[tauri::command]
pub async fn get_rss_feed_unread_count(feed_id: String, repo: State<'_, Repository>) -> Result<i32> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM rss_articles WHERE feed_id = ? AND is_read = 0")
        .bind(&feed_id)
        .fetch_one(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to get unread count: {}", e)))?;

    Ok(row.get("count"))
}

/// Delete old articles
#[tauri::command]
pub async fn cleanup_old_rss_articles(days: i32, repo: State<'_, Repository>) -> Result<i32> {
    let cutoff = Utc::now() - chrono::Duration::days(days as i64);
    let cutoff_str = cutoff.to_rfc3339();

    let result = sqlx::query("DELETE FROM rss_articles WHERE date_added < ? AND is_queued = 0")
        .bind(&cutoff_str)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to cleanup articles: {}", e)))?;

    Ok(result.rows_affected() as i32)
}

/// Add RSS article to queue as a document
#[tauri::command]
pub async fn add_rss_article_to_queue(
    article_id: String,
    repo: State<'_, Repository>,
) -> Result<String> {
    use crate::models::{Document, FileType};

    // Get the article
    let article_row = sqlx::query("SELECT * FROM rss_articles WHERE id = ?")
        .bind(&article_id)
        .fetch_optional(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch article: {}", e)))?;

    let article_row = article_row.ok_or_else(|| {
        crate::error::IncrementumError::NotFound("Article not found".to_string())
    })?;

    // Extract article data
    let title: String = article_row.get("title");
    let url: String = article_row.get("url");
    let content: Option<String> = article_row.get("content");
    let summary: Option<String> = article_row.get("summary");
    let author: Option<String> = article_row.get("author");
    let feed_id: String = article_row.get("feed_id");

    // Get feed info for category
    let feed_row = sqlx::query("SELECT category FROM rss_feeds WHERE id = ?")
        .bind(&feed_id)
        .fetch_optional(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to fetch feed: {}", e)))?;

    let category: Option<String> = feed_row.and_then(|r| r.get("category"));

    // Create document
    let mut doc = Document::new(
        title.clone(),
        url.clone(),
        FileType::Html,
    );

    // Set content (prefer full content, fallback to summary)
    doc.content = content.or(summary);

    // Set category from feed
    doc.category = category;

    // Set tags
    doc.tags = vec!["rss".to_string()];
    if let Some(ref auth) = author {
        doc.tags.push(format!("author:{}", auth));
    }

    // Create the document in database
    let created = repo.create_document(&doc).await?;

    // Mark article as queued
    sqlx::query("UPDATE rss_articles SET is_queued = 1 WHERE id = ?")
        .bind(&article_id)
        .execute(repo.pool())
        .await
        .map_err(|e| crate::error::IncrementumError::Internal(format!("Failed to update article: {}", e)))?;

    Ok(created.id)
}
