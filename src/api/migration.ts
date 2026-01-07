/**
 * C++ Database Reader for Migration
 * Reads data from the original C++ Incrementum SQLite database
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * C++ Database schema version
 */
export const CPP_DB_VERSION = "1.0";

/**
 * C++ Document record
 */
export interface CPPDocument {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  page_count: number;
  current_page: number;
  created_at: string;
  updated_at: string;
  metadata?: string;
}

/**
 * C++ Extract record
 */
export interface CPPExtract {
  id: string;
  document_id: string;
  content: string;
  page_number: number;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * C++ Flashcard record
 */
export interface CPPFlashcard {
  id: string;
  extract_id?: string;
  document_id: string;
  front: string;
  back: string;
  cloze?: string;
  type: number;
  created_at: string;
  updated_at: string;
}

/**
 * C++ Scheduling data (FSRS)
 */
export interface CPPSchedulingData {
  flashcard_id: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string;
  due_date: string;
}

/**
 * C++ Review log
 */
export interface CPPReviewLog {
  id: string;
  flashcard_id: string;
  rating: number;
  review_time: string;
  state: number;
  stability: number;
  difficulty: number;
}

/**
 * C++ Category
 */
export interface CPPCategory {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
}

/**
 * C++ Document-Category relationship
 */
export interface CPPDocumentCategory {
  document_id: string;
  category_id: string;
}

/**
 * C++ Statistics
 */
export interface CPPStatistics {
  total_reviews: number;
  total_flashcards: number;
  total_documents: number;
  total_extracts: number;
}

/**
 * Migration data container
 */
export interface CPPMigrationData {
  documents: CPPDocument[];
  extracts: CPPExtract[];
  flashcards: CPPFlashcard[];
  scheduling: CPPSchedulingData[];
  reviewLogs: CPPReviewLog[];
  categories: CPPCategory[];
  documentCategories: CPPDocumentCategory[];
  statistics: CPPStatistics;
  settings?: Record<string, unknown>;
  version: string;
}

/**
 * Read C++ database
 */
export async function readCPPDatabase(dbPath: string): Promise<CPPMigrationData> {
  try {
    return await invoke<CPPMigrationData>("read_cpp_database", { dbPath });
  } catch (error) {
    console.error("Failed to read C++ database:", error);
    throw new Error(`Failed to read C++ database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get C++ database info
 */
export async function getCPPDatabaseInfo(dbPath: string): Promise<{
  exists: boolean;
  version: string;
  documentCount: number;
  flashcardCount: number;
  extractCount: number;
  fileSize: number;
}> {
  try {
    return await invoke("get_cpp_database_info", { dbPath });
  } catch (error) {
    console.error("Failed to get C++ database info:", error);
    throw new Error(`Failed to get database info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate C++ database
 */
export async function validateCPPDatabase(dbPath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    return await invoke("validate_cpp_database", { dbPath });
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate database: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
    };
  }
}

/**
 * Migration progress callback type
 */
export type MigrationProgressCallback = (progress: {
  stage: string;
  current: number;
  total: number;
  message: string;
}) => void;

/**
 * Migrate C++ data to new format
 */
export async function migrateCPPData(
  dbPath: string,
  onProgress?: MigrationProgressCallback
): Promise<{
  success: boolean;
  imported: {
    documents: number;
    extracts: number;
    flashcards: number;
    scheduling: number;
    reviewLogs: number;
    categories: number;
  };
  errors: string[];
}> {
  try {
    const result = await invoke<{
      success: boolean;
      imported: {
        documents: number;
        extracts: number;
        flashcards: number;
        scheduling: number;
        reviewLogs: number;
        categories: number;
      };
      errors: string[];
    }>("migrate_cpp_data", { dbPath });

    return result;
  } catch (error) {
    console.error("Migration failed:", error);
    return {
      success: false,
      imported: {
        documents: 0,
        extracts: 0,
        flashcards: 0,
        scheduling: 0,
        reviewLogs: 0,
        categories: 0,
      },
      errors: [`Migration failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Create backup before migration
 */
export async function createMigrationBackup(dbPath: string): Promise<string> {
  try {
    return await invoke<string>("create_migration_backup", { dbPath });
  } catch (error) {
    console.error("Failed to create backup:", error);
    throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rollback migration
 */
export async function rollbackMigration(backupPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>("rollback_migration", { backupPath });
  } catch (error) {
    console.error("Rollback failed:", error);
    throw new Error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  hasMigrated: boolean;
  migrationDate?: string;
  cppDbPath?: string;
}> {
  try {
    return await invoke("get_migration_status");
  } catch (error) {
    console.error("Failed to get migration status:", error);
    return {
      hasMigrated: false,
    };
  }
}

/**
 * Clear migration flag
 */
export async function clearMigrationFlag(): Promise<void> {
  try {
    await invoke("clear_migration_flag");
  } catch (error) {
    console.error("Failed to clear migration flag:", error);
    throw new Error(`Failed to clear migration flag: ${error instanceof Error ? error.message : String(error)}`);
  }
}
