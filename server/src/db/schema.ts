import { getPool } from './connection.js';

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (mirrors Rust model)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  file_path TEXT,
  file_type VARCHAR(50) NOT NULL,
  content TEXT,
  content_hash VARCHAR(64),
  total_pages INTEGER,
  current_page INTEGER DEFAULT 1,
  category VARCHAR(255),
  tags JSONB DEFAULT '[]',
  date_added TIMESTAMPTZ NOT NULL,
  date_modified TIMESTAMPTZ NOT NULL,
  date_last_reviewed TIMESTAMPTZ,
  extract_count INTEGER DEFAULT 0,
  learning_item_count INTEGER DEFAULT 0,
  priority_rating INTEGER DEFAULT 3,
  priority_slider INTEGER DEFAULT 50,
  priority_score DOUBLE PRECISION DEFAULT 50.0,
  is_archived BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  next_reading_date TIMESTAMPTZ,
  reading_count INTEGER DEFAULT 0,
  stability DOUBLE PRECISION,
  difficulty DOUBLE PRECISION,
  reps INTEGER,
  total_time_spent INTEGER,
  deleted_at TIMESTAMPTZ,
  sync_version BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_sync ON documents(user_id, sync_version);

-- Extracts table
CREATE TABLE IF NOT EXISTS extracts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  content TEXT NOT NULL,
  page_title VARCHAR(500),
  page_number INTEGER,
  highlight_color VARCHAR(50),
  notes TEXT,
  progressive_disclosure_level INTEGER DEFAULT 0,
  max_disclosure_level INTEGER DEFAULT 3,
  date_created TIMESTAMPTZ NOT NULL,
  date_modified TIMESTAMPTZ NOT NULL,
  tags JSONB DEFAULT '[]',
  category VARCHAR(255),
  memory_state_stability DOUBLE PRECISION,
  memory_state_difficulty DOUBLE PRECISION,
  next_review_date TIMESTAMPTZ,
  last_review_date TIMESTAMPTZ,
  review_count INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  sync_version BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_extracts_user ON extracts(user_id);
CREATE INDEX IF NOT EXISTS idx_extracts_document ON extracts(document_id);
CREATE INDEX IF NOT EXISTS idx_extracts_sync ON extracts(user_id, sync_version);

-- Learning items table
CREATE TABLE IF NOT EXISTS learning_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extract_id UUID,
  document_id UUID,
  item_type VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  cloze_text TEXT,
  difficulty DOUBLE PRECISION DEFAULT 0.3,
  interval INTEGER DEFAULT 0,
  ease_factor DOUBLE PRECISION DEFAULT 2.5,
  due_date TIMESTAMPTZ,
  date_created TIMESTAMPTZ NOT NULL,
  date_modified TIMESTAMPTZ NOT NULL,
  last_review_date TIMESTAMPTZ,
  review_count INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state VARCHAR(50) DEFAULT 'new',
  is_suspended BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  memory_state_stability DOUBLE PRECISION,
  memory_state_difficulty DOUBLE PRECISION,
  deleted_at TIMESTAMPTZ,
  sync_version BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_learning_items_user ON learning_items(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_items_sync ON learning_items(user_id, sync_version);

-- Files table (for document file storage)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  content_type VARCHAR(100),
  size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

-- Sync state tracking
CREATE TABLE IF NOT EXISTS sync_cursors (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_sync_version BIGINT DEFAULT 0,
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function migrate(): Promise<void> {
    const pool = getPool();
    await pool.query(schema);
    console.log('Database migration completed');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    import('./connection.js').then(async ({ initDatabase }) => {
        await initDatabase();
        await migrate();
        process.exit(0);
    }).catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
