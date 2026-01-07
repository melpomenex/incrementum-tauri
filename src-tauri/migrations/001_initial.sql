-- Initial database schema for Incrementum

-- File types enum
CREATE TYPE file_type AS ENUM (
    'pdf',
    'epub',
    'markdown',
    'html',
    'youtube',
    'audio',
    'video',
    'other'
);

-- Item types enum
CREATE TYPE item_type AS ENUM (
    'flashcard',
    'cloze',
    'qa',
    'basic'
);

-- Item states enum
CREATE TYPE item_state AS ENUM (
    'new',
    'learning',
    'review',
    'relearning'
);

-- Categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id),
    color TEXT,
    icon TEXT,
    description TEXT,
    date_created TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    document_count INTEGER NOT NULL DEFAULT 0
);

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type file_type NOT NULL,
    content_hash TEXT,
    total_pages INTEGER,
    current_page INTEGER,
    category TEXT REFERENCES categories(id),
    tags TEXT NOT NULL DEFAULT '[]',
    date_added TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    date_last_reviewed TEXT,
    extract_count INTEGER NOT NULL DEFAULT 0,
    learning_item_count INTEGER NOT NULL DEFAULT 0,
    priority_score REAL NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_favorite BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_documents_date_added ON documents(date_added);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_is_archived ON documents(is_archived);

-- Extracts table
CREATE TABLE extracts (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
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
    category TEXT REFERENCES categories(id)
);

CREATE INDEX idx_extracts_document_id ON extracts(document_id);
CREATE INDEX idx_extracts_page_number ON extracts(page_number);

-- Learning items table (flashcards, clozes, etc.)
CREATE TABLE learning_items (
    id TEXT PRIMARY KEY,
    extract_id TEXT REFERENCES extracts(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    item_type item_type NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    cloze_text TEXT,
    cloze_ranges TEXT, -- JSON array of [start, end] pairs
    difficulty INTEGER NOT NULL DEFAULT 3,
    interval INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    due_date TEXT NOT NULL,
    date_created TEXT NOT NULL,
    date_modified TEXT NOT NULL,
    last_review_date TEXT,
    review_count INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state item_state NOT NULL DEFAULT 'new',
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    tags TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_learning_items_due_date ON learning_items(due_date);
CREATE INDEX idx_learning_items_state ON learning_items(state);
CREATE INDEX idx_learning_items_extract_id ON learning_items(extract_id);
CREATE INDEX idx_learning_items_document_id ON learning_items(document_id);

-- Annotations table
CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'highlight', 'underline', 'strikeout', 'comment', 'bookmark'
    page_number INTEGER NOT NULL,
    content TEXT,
    rect TEXT, -- JSON object with left, top, width, height
    color TEXT NOT NULL,
    date_created TEXT NOT NULL,
    date_modified TEXT NOT NULL
);

CREATE INDEX idx_annotations_document_id ON annotations(document_id);
CREATE INDEX idx_annotations_page_number ON annotations(page_number);

-- Review sessions table
CREATE TABLE review_sessions (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT,
    items_reviewed INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_time INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_review_sessions_start_time ON review_sessions(start_time);

-- Review results table
CREATE TABLE review_results (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES review_sessions(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES learning_items(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL, -- 1-4 (Again, Hard, Good, Easy)
    time_taken INTEGER NOT NULL,
    new_due_date TEXT NOT NULL,
    new_interval INTEGER NOT NULL,
    new_ease_factor REAL NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE INDEX idx_review_results_session_id ON review_results(session_id);
CREATE INDEX idx_review_results_item_id ON review_results(item_id);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    date_modified TEXT NOT NULL
);
