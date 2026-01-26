/**
 * Position tracking API
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Bookmark,
  DailyReadingStats,
  DocumentPosition,
  DocumentWithProgress,
  ReadingSession,
} from '../types/position';
// Re-export position helper functions for convenience
export {
  pagePosition,
  scrollPosition,
  cfiPosition,
  timePosition,
  formatPosition,
  getPositionProgress,
} from '../types/position';

/**
 * Get the current position for a document
 */
export async function getDocumentPosition(documentId: string): Promise<DocumentPosition | null> {
  return await invoke<DocumentPosition | null>('get_document_position', { documentId });
}

/**
 * Save position for a document
 */
export async function saveDocumentPosition(
  documentId: string,
  position: DocumentPosition,
): Promise<void> {
  await invoke('save_document_position', { documentId, position });
}

/**
 * Get progress percentage for a document
 */
export async function getDocumentProgress(documentId: string): Promise<number | null> {
  return await invoke<number | null>('get_document_progress', { documentId });
}

/**
 * Create a bookmark at the current position
 */
export async function createBookmark(
  documentId: string,
  name: string,
  position: DocumentPosition,
): Promise<Bookmark> {
  return await invoke<Bookmark>('create_bookmark', { documentId, name, position });
}

/**
 * List all bookmarks for a document
 */
export async function listBookmarks(documentId: string): Promise<Bookmark[]> {
  return await invoke<Bookmark[]>('list_bookmarks', { documentId });
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await invoke('delete_bookmark', { bookmarkId });
}

/**
 * Start a reading session
 */
export async function startReadingSession(
  documentId: string,
  progressStart: number,
): Promise<ReadingSession> {
  return await invoke<ReadingSession>('start_reading_session', {
    documentId,
    progressStart,
  });
}

/**
 * End a reading session
 */
export async function endReadingSession(sessionId: string, progressEnd: number): Promise<void> {
  await invoke('end_reading_session', { sessionId, progressEnd });
}

/**
 * Get active reading session for a document
 */
export async function getActiveSession(
  documentId: string,
): Promise<ReadingSession | null> {
  return await invoke<ReadingSession | null>('get_active_session', { documentId });
}

/**
 * Get documents with reading progress (for Continue Reading page)
 */
export async function getDocumentsWithProgress(
  limit?: number,
): Promise<DocumentWithProgress[]> {
  return await invoke<[string, number, string, number][]>('get_documents_with_progress', { limit }).then(
    (results) =>
      results.map(([id, progress, title, date_modified]) => ({
        id,
        progress,
        title,
        date_modified,
      })),
  );
}

/**
 * Get daily reading statistics
 */
export async function getDailyReadingStats(days?: number): Promise<DailyReadingStats[]> {
  return await invoke<[string, number, number][]>('get_daily_reading_stats', { days }).then((results) =>
    results.map(([date, total_seconds, documents_read]) => ({
      date,
      total_seconds,
      documents_read,
      total_pages_read: 0,
      session_count: 0,
    })),
  );
}
