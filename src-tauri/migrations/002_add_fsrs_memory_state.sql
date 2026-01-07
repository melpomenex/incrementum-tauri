-- Add FSRS memory state columns to learning_items table
ALTER TABLE learning_items ADD COLUMN memory_state_stability REAL;
ALTER TABLE learning_items ADD COLUMN memory_state_difficulty REAL;
