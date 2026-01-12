import { invokeCommand } from "../lib/tauri";

export interface Extract {
  id: string;
  document_id: string;
  content: string;
  page_title?: string;
  page_number?: number;
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
  note?: string;
  tags?: string[];
  category?: string;
  color?: string;
  page_number?: number;
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
 * Get all extracts for a document
 */
export async function getExtracts(documentId: string): Promise<Extract[]> {
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
    note: input.note,
    tags: input.tags,
    category: input.category,
    color: input.color,
    pageNumber: input.page_number,
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
