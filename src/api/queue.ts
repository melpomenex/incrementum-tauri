import { invokeCommand } from "../lib/tauri";
import type { QueueItem } from "../types/queue";

export interface QueueStats {
  total_items: number;
  due_today: number;
  overdue: number;
  new_items: number;
  learning_items: number;
  review_items: number;
  total_estimated_time: number;
  suspended: number;
}

export interface BulkOperationResult {
  succeeded: string[];
  failed: string[];
  errors: string[];
}

export interface QueueExportItem {
  id: string;
  document_title: string;
  item_type: string;
  question: string;
  answer?: string;
  due_date: string;
  state: string;
  interval: number;
  tags: string[];
  category?: string;
}

// Internal type matching Rust backend (snake_case)
interface RustQueueItem {
  id: string;
  document_id: string;
  document_title: string;
  extract_id?: string;
  learning_item_id?: string;
  question?: string;
  answer?: string;
  cloze_text?: string;
  item_type: string;
  priority_rating?: number;
  priority_slider?: number;
  priority: number;
  due_date?: string;
  estimated_time: number;
  tags: string[];
  category?: string;
  progress: number;
  source?: string;
  position?: number;
}

// Convert from Rust snake_case to TypeScript camelCase
function convertQueueItem(item: RustQueueItem): QueueItem {
  return {
    id: item.id,
    documentId: item.document_id,
    documentTitle: item.document_title,
    extractId: item.extract_id,
    learningItemId: item.learning_item_id,
    question: item.question,
    answer: item.answer,
    clozeText: item.cloze_text,
    itemType: item.item_type as "document" | "extract" | "learning-item" | "playlist-video",
    priorityRating: item.priority_rating,
    prioritySlider: item.priority_slider,
    priority: item.priority,
    dueDate: item.due_date,
    estimatedTime: item.estimated_time,
    tags: item.tags,
    category: item.category,
    progress: item.progress,
    source: item.source,
    position: item.position,
  };
}

/**
 * Get all queue items
 */
export async function getQueue(): Promise<QueueItem[]> {
  const items = await invokeCommand<RustQueueItem[]>("get_queue");
  return items.map(convertQueueItem);
}

/**
 * Get only due documents (FSRS-scheduled documents with next_reading_date <= now)
 * This provides a "Due Today" view focused specifically on documents
 */
export async function getDueDocumentsOnly(): Promise<QueueItem[]> {
  const items = await invokeCommand<RustQueueItem[]>("get_due_documents_only");
  return items.map(convertQueueItem);
}

/**
 * Get due queue items only (includes documents, extracts, and learning items)
 */
export async function getDueQueueItems(randomness?: number): Promise<QueueItem[]> {
  const items = await invokeCommand<RustQueueItem[]>("get_due_queue_items", { randomness });
  return items.map(convertQueueItem);
}

/**
 * Get next item from the queue
 */
export async function getNextQueueItem(randomness?: number): Promise<QueueItem | null> {
  const item = await invokeCommand<RustQueueItem | null>("get_next_queue_item", { randomness });
  return item ? convertQueueItem(item) : null;
}

/**
 * Get multiple items from the queue
 */
export async function getQueueItems(count?: number, randomness?: number): Promise<QueueItem[]> {
  const items = await invokeCommand<RustQueueItem[]>("get_queue_items", { count, randomness });
  return items.map(convertQueueItem);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  return await invokeCommand<QueueStats>("get_queue_stats");
}

/**
 * Postpone an item by N days
 */
export async function postponeItem(itemId: string, days: number): Promise<void> {
  await invokeCommand("postpone_item", { itemId, days });
}

/**
 * Bulk suspend items
 */
export async function bulkSuspendItems(itemIds: string[]): Promise<BulkOperationResult> {
  return await invokeCommand<BulkOperationResult>("bulk_suspend_items", { itemIds });
}

/**
 * Bulk unsuspend items
 */
export async function bulkUnsuspendItems(itemIds: string[]): Promise<BulkOperationResult> {
  return await invokeCommand<BulkOperationResult>("bulk_unsuspend_items", { itemIds });
}

/**
 * Bulk delete items
 */
export async function bulkDeleteItems(itemIds: string[]): Promise<BulkOperationResult> {
  return await invokeCommand<BulkOperationResult>("bulk_delete_items", { itemIds });
}

/**
 * Export queue data
 */
export async function exportQueue(): Promise<QueueExportItem[]> {
  return await invokeCommand<QueueExportItem[]>("export_queue");
}

/**
 * Get queue with playlist videos interspersed
 * Playlist videos are inserted at regular intervals based on subscription settings
 */
export async function getQueueWithPlaylistIntersperse(randomness?: number): Promise<QueueItem[]> {
  const items = await invokeCommand<RustQueueItem[]>("get_queue_with_playlist_intersperse", { randomness });
  return items.map(convertQueueItem);
}
