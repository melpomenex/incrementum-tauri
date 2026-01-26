/**
 * Full-text search API with FTS5
 */

import { invoke } from '@tauri-apps/api/core';

export interface FtsSearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  resultTypes?: string[];
  tags?: string[];
  category?: string;
  fuzzy?: boolean;
}

export interface FtsMetadata {
  documentId?: string;
  category?: string;
  tags?: string[];
  modifiedAt?: string;
  fileType?: string;
}

export interface FtsSearchResult {
  id: string;
  resultType: string;
  title: string;
  excerpt?: string;
  highlights: string[];
  score: number;
  metadata: FtsMetadata;
}

export interface FtsSearchStats {
  totalDocuments: number;
  totalExtracts: number;
  totalFlashcards: number;
  lastIndexed?: string;
}

/**
 * Perform full-text search
 */
export async function ftsSearch(query: FtsSearchQuery): Promise<FtsSearchResult[]> {
  return await invoke<FtsSearchResult[]>('fts_search', { query });
}

/**
 * Get search suggestions based on query
 */
export async function ftsSearchSuggestions(query: string): Promise<string[]> {
  return await invoke<string[]>('fts_search_suggestions', { query });
}

/**
 * Get FTS index statistics
 */
export async function ftsGetStats(): Promise<FtsSearchStats> {
  return await invoke<FtsSearchStats>('fts_get_stats');
}

/**
 * Rebuild the entire FTS index
 */
export async function ftsReindex(): Promise<void> {
  return await invoke('fts_reindex');
}

/**
 * Index a document in FTS
 */
export async function ftsIndexDocument(documentId: string): Promise<void> {
  return await invoke('fts_index_document', { documentId });
}

/**
 * Index an extract in FTS
 */
export async function ftsIndexExtract(extractId: string): Promise<void> {
  return await invoke('fts_index_extract', { extractId });
}

/**
 * Index a flashcard in FTS
 */
export async function ftsIndexFlashcard(cardId: string): Promise<void> {
  return await invoke('fts_index_flashcard', { cardId });
}

/**
 * Remove an item from the FTS index
 */
export async function ftsRemoveFromIndex(itemId: string, itemType: string): Promise<void> {
  return await invoke('fts_remove_from_index', { itemId, itemType });
}
