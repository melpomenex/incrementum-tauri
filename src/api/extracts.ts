import { invokeCommand } from "../lib/tauri";
import type { PdfSelectionContext } from "../types/selection";

export interface Extract {
  id: string;
  document_id: string;
  /** Plain text content for search and AI processing */
  content: string;
  /** Rich HTML content with inline styles for 1:1 visual fidelity */
  html_content?: string;
  /** Source URL for web extracts */
  source_url?: string;
  page_title?: string;
  page_number?: number;
  selection_context?: PdfSelectionContext;
  highlight_color?: string;
  notes?: string;
  progressive_disclosure_level: number;
  max_disclosure_level: number;
  date_created: string;
  date_modified: string;
  tags: string[];
  category?: string;
  next_review_date?: string;
  last_review_date?: string;
  review_count: number;
  reps: number;
  memory_state?: {
    stability: number;
    difficulty: number;
  };
}

export interface CreateExtractInput {
  document_id: string;
  content: string;
  /** Rich HTML content with inline styles for 1:1 visual fidelity */
  html_content?: string;
  /** Source URL for web extracts */
  source_url?: string;
  note?: string;
  tags?: string[];
  category?: string;
  color?: string;
  page_number?: number;
  selection_context?: PdfSelectionContext;
  max_disclosure_level?: number;
}

export interface UpdateExtractInput {
  id: string;
  content?: string;
  note?: string;
  tags?: string[];
  category?: string;
  color?: string;
  max_disclosure_level?: number;
}

/**
 * Get all extracts for a document, or all extracts if no documentId is provided
 */
export async function getExtracts(documentId?: string | null): Promise<Extract[]> {
  return await invokeCommand<Extract[]>("get_extracts", { documentId });
}

/**
 * Get a single extract by ID
 */
export async function getExtract(id: string): Promise<Extract | null> {
  return await invokeCommand<Extract>("get_extract", { id });
}

/**
 * Create a new extract
 */
export async function createExtract(input: CreateExtractInput): Promise<Extract> {
  return await invokeCommand<Extract>("create_extract", {
    documentId: input.document_id,
    content: input.content,
    htmlContent: input.html_content,
    sourceUrl: input.source_url,
    note: input.note,
    tags: input.tags,
    category: input.category,
    color: input.color,
    pageNumber: input.page_number,
    selectionContext: input.selection_context,
  });
}

/**
 * Update an existing extract
 */
export async function updateExtract(input: UpdateExtractInput): Promise<Extract> {
  return await invokeCommand<Extract>("update_extract", {
    id: input.id,
    content: input.content,
    note: input.note,
    tags: input.tags,
    category: input.category,
    color: input.color,
  });
}

/**
 * Delete an extract
 */
export async function deleteExtract(id: string): Promise<void> {
  await invokeCommand("delete_extract", { id });
}
