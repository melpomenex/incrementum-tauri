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
  item_type: string;
  priority_rating?: number;
  priority_slider?: number;
  priority: number;
  due_date?: string;
  estimated_time: number;
  tags: string[];
  category?: string;
  progress: number;
}

// Convert from Rust snake_case to TypeScript camelCase
function convertQueueItem(item: RustQueueItem): QueueItem {
  return {
    id: item.id,
    documentId: item.document_id,
    documentTitle: item.document_title,
    extractId: item.extract_id,
    learningItemId: item.learning_item_id,
    itemType: item.item_type as "document" | "extract" | "learning-item",
    priorityRating: item.priority_rating,
    prioritySlider: item.priority_slider,
    priority: item.priority,
    dueDate: item.due_date,
    estimatedTime: item.estimated_time,
    tags: item.tags,
    category: item.category,
    progress: item.progress,
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
