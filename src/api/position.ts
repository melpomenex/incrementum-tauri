/**
 * Position tracking API
 */

import { invokeCommand } from '../lib/tauri';
import { browserInvoke } from '../lib/browser-backend';
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

function isWebMode(): boolean {
  return !("__TAURI__" in window);
}

/**
 * Get the current position for a document
 */
export async function getDocumentPosition(documentId: string): Promise<DocumentPosition | null> {
  if (isWebMode()) {
    return await browserInvoke<DocumentPosition | null>('get_document_position', { documentId });
  }
  return await invokeCommand<DocumentPosition | null>('get_document_position', { documentId });
}

/**
 * Save position for a document
 */
export async function saveDocumentPosition(
  documentId: string,
  position: DocumentPosition,
): Promise<void> {
  if (isWebMode()) {
    await browserInvoke('save_document_position', { documentId, position });
    return;
  }
  await invokeCommand('save_document_position', { documentId, position });
}

/**
 * Get progress percentage for a document
 */
export async function getDocumentProgress(documentId: string): Promise<number | null> {
  if (isWebMode()) {
    return await browserInvoke<number | null>('get_document_progress', { documentId });
  }
  return await invokeCommand<number | null>('get_document_progress', { documentId });
}

/**
 * Create a bookmark at the current position
 */
export async function createBookmark(
  documentId: string,
  name: string,
  position: DocumentPosition,
): Promise<Bookmark> {
  if (isWebMode()) {
    return await browserInvoke<Bookmark>('create_bookmark', { documentId, name, position });
  }
  return await invokeCommand<Bookmark>('create_bookmark', { documentId, name, position });
}

/**
 * List all bookmarks for a document
 */
export async function listBookmarks(documentId: string): Promise<Bookmark[]> {
  if (isWebMode()) {
    return await browserInvoke<Bookmark[]>('list_bookmarks', { documentId });
  }
  return await invokeCommand<Bookmark[]>('list_bookmarks', { documentId });
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  if (isWebMode()) {
    await browserInvoke('delete_bookmark', { bookmarkId });
    return;
  }
  await invokeCommand('delete_bookmark', { bookmarkId });
}

/**
 * Start a reading session
 */
export async function startReadingSession(
  documentId: string,
  progressStart: number,
): Promise<ReadingSession> {
  if (isWebMode()) {
    return await browserInvoke<ReadingSession>('start_reading_session', {
      documentId,
      progressStart,
    });
  }
  return await invokeCommand<ReadingSession>('start_reading_session', {
    documentId,
    progressStart,
  });
}

/**
 * End a reading session
 */
export async function endReadingSession(sessionId: string, progressEnd: number): Promise<void> {
  if (isWebMode()) {
    await browserInvoke('end_reading_session', { sessionId, progressEnd });
    return;
  }
  await invokeCommand('end_reading_session', { sessionId, progressEnd });
}

/**
 * Get active reading session for a document
 */
export async function getActiveSession(
  documentId: string,
): Promise<ReadingSession | null> {
  if (isWebMode()) {
    return await browserInvoke<ReadingSession | null>('get_active_session', { documentId });
  }
  return await invokeCommand<ReadingSession | null>('get_active_session', { documentId });
}

/**
 * Get documents with reading progress (for Continue Reading page)
 */
export async function getDocumentsWithProgress(
  limit?: number,
): Promise<DocumentWithProgress[]> {
  const results = isWebMode()
    ? await browserInvoke<[string, number, string, number][]>('get_documents_with_progress', { limit })
    : await invokeCommand<[string, number, string, number][]>('get_documents_with_progress', { limit });
  return results.map(([id, progress, title, date_modified]) => ({
    id,
    progress,
    title,
    date_modified,
  }));
}

/**
 * Get daily reading statistics
 */
export async function getDailyReadingStats(days?: number): Promise<DailyReadingStats[]> {
  const results = isWebMode()
    ? await browserInvoke<[string, number, number][]>('get_daily_reading_stats', { days })
    : await invokeCommand<[string, number, number][]>('get_daily_reading_stats', { days });
  return results.map(([date, total_seconds, documents_read]) => ({
    date,
    total_seconds,
    documents_read,
    total_pages_read: 0,
    session_count: 0,
  }));
}
