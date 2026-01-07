import { invoke } from "@tauri-apps/api/core";

export interface BulkOperationResult {
  succeeded: string[];
  failed: string[];
  errors: string[];
}

/**
 * Delete multiple extracts at once
 */
export async function bulkDeleteExtracts(extractIds: string[]): Promise<BulkOperationResult> {
  return await invoke<BulkOperationResult>("bulk_delete_extracts", { extractIds });
}

/**
 * Generate flashcards from multiple extracts at once
 */
export async function bulkGenerateCards(extractIds: string[]): Promise<BulkOperationResult> {
  return await invoke<BulkOperationResult>("bulk_generate_cards", { extractIds });
}
