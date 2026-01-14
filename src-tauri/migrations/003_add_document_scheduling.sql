-- Add incremental reading scheduling columns to documents table
-- These fields support the new incremental reading scheduler which keeps
-- documents/videos in regular rotation (unlike FSRS for flashcards)

-- Next scheduled reading date for this document
ALTER TABLE documents ADD COLUMN next_reading_date TEXT;

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

-- Add content and metadata columns if not present
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add priority rating and slider columns if not present
ALTER TABLE documents ADD COLUMN IF NOT EXISTS priority_rating INTEGER NOT NULL DEFAULT 0;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS priority_slider INTEGER NOT NULL DEFAULT 0;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata TEXT;
