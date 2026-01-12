# Design: Video Progress Tracking

## Architecture Overview

The video progress tracking feature extends the existing document model to support time-based media position persistence. It follows the same pattern as `current_page` but for timestamp-based content.

## Data Model

### Database Schema Changes

```sql
-- Migration 013: Add video progress tracking
ALTER TABLE documents ADD COLUMN current_timestamp INTEGER;
```

### Document Model Updates

```rust
// src-tauri/src/models/document.rs
pub struct Document {
    // ... existing fields ...
    pub current_timestamp: Option<i32>,  // NEW: Current playback position in seconds
}
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     YouTubeViewer.tsx                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  YouTube IFrame API                                    │  │
│  │  - getCurrentTime()                                   │  │
│  │  - seekTo(time)                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Progress Manager (NEW)                               │  │
│  │  - Auto-save every 10s                                │  │
│  │  - Load saved position on init                        │  │
│  │  - Detect completion (≥95%)                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tauri Commands (NEW)                                 │  │
│  │  - update_video_timestamp(document_id, seconds)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Repository Layer                          │
│  update_document_timestamp(id, timestamp)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                               │
│  documents.current_timestamp INTEGER                        │
└─────────────────────────────────────────────────────────────┘
```

## API Design

### Backend Commands (Tauri)

```rust
// src-tauri/src/commands/video.rs (NEW)

/// Update the current playback timestamp for a video document
#[tauri::command]
pub async fn update_video_timestamp(
    document_id: String,
    timestamp: i32,
) -> Result<()> {
    repository::update_document_timestamp(&pool, &document_id, timestamp).await
}

/// Get a document's saved timestamp
#[tauri::command]
pub async fn get_video_timestamp(
    document_id: String,
) -> Result<Option<i32>> {
    repository::get_document_timestamp(&pool, &document_id).await
}
```

### Frontend Service

```typescript
// src/api/video.ts (NEW)

export async function updateVideoTimestamp(
  documentId: string,
  timestamp: number
): Promise<void> {
  await invoke("update_video_timestamp", { documentId, timestamp });
}

export async function getVideoTimestamp(
  documentId: string
): Promise<number | null> {
  return await invoke("get_video_timestamp", { documentId });
}
```

## State Management

### Progress Save Strategy

1. **Throttled Auto-Save**: Every 10 seconds during playback
2. **Pause Save**: When user pauses the video
3. **Unload Save**: When component unmounts (navigation/close)

```typescript
const PROGRESS_SAVE_INTERVAL = 10000; // 10 seconds

useEffect(() => {
  if (!isPlaying) return;

  const saveInterval = setInterval(() => {
    updateVideoTimestamp(documentId, Math.floor(currentTime));
  }, PROGRESS_SAVE_INTERVAL);

  return () => clearInterval(saveInterval);
}, [isPlaying, currentTime, documentId]);
```

### Resume Strategy

1. **Load on Mount**: Fetch saved timestamp when component mounts
2. **Seek After Ready**: Wait for YouTube player ready state, then seek
3. **Threshold Check**: If timestamp is > 95% of duration, treat as unwatched (reset to 0)

```typescript
useEffect(() => {
  async function loadSavedPosition() {
    const savedTime = await getVideoTimestamp(documentId);
    if (savedTime && savedTime < duration * 0.95) {
      playerRef.current?.seekTo(savedTime, true);
    }
  }

  if (isReady && duration > 0) {
    loadSavedPosition();
  }
}, [isReady, duration, documentId]);
```

## UI/UX Considerations

### Resume Indicator

In the document list/grid, show a visual indicator for videos with saved progress:

```
┌─────────────────────────────────────┐
│ ▶ My Lecture Video                  │
│   📺 45:23 • Resume at 12:34        │
└─────────────────────────────────────┘
```

### First-Time Experience

When a user first opens a video with saved position, show a brief toast:
- "Resuming from 12:34"

## Database Operations

### Repository Methods

```rust
// src-tauri/src/database/repository.rs

pub async fn update_document_timestamp(
    pool: &Pool<Sqlite>,
    id: &str,
    timestamp: i32,
) -> Result<()> {
    sqlx::query(
        "UPDATE documents SET current_timestamp = ?1, date_modified = ?2 WHERE id = ?3"
    )
    .bind(timestamp)
    .bind(Utc::now().to_rfc3339())
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| IncrementumError::Database(...))
}

pub async fn get_document_timestamp(
    pool: &Pool<Sqlite>,
    id: &str,
) -> Result<Option<i32>> {
    let result = sqlx::query_as::<_, (Option<i32>,)>(
        "SELECT current_timestamp FROM documents WHERE id = ?1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|(ts,)| ts).flatten())
}
```

## Edge Cases

### 1. Duration Changes
If a video's duration changes (e.g., re-imported with different quality), the saved timestamp may exceed the new duration.
- **Solution**: Clamp timestamp to 95% of new duration

### 2. Multiple Viewers
If the same document is open in multiple places (future sync scenario), last write wins.
- **Acceptable**: This is simple and matches current `current_page` behavior

### 3. Corrupted Data
Negative or extremely large timestamps.
- **Solution**: Validate before seeking, ignore invalid values

## Performance Considerations

1. **Write Frequency**: 10-second interval is reasonable (6 writes/minute)
2. **Database Index**: No index needed for `current_timestamp` (always queried by id)
3. **Storage**: INTEGER (4 bytes) per document is negligible

## Future Enhancements

1. **Bookmark System**: Multiple saved positions per video
2. **Watch History**: Timeline of all viewing sessions
3. **Cross-Device Sync**: Sync timestamp via existing sync infrastructure
4. **Analytics**: Track completion rates, re-watch patterns

## Testing Strategy

1. **Unit Tests**: Repository methods, timestamp validation
2. **Integration Tests**: Tauri command handlers
3. **Manual Tests**: Watch video, close, reopen, verify position
