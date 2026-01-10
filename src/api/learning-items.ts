import { invokeCommand } from "../lib/tauri";

export interface LearningItem {
  id: string;
  extract_id?: string;
  document_id?: string;
  item_type: "Flashcard" | "Cloze" | "Qa" | "Basic";
  question: string;
  answer?: string;
  cloze_text?: string;
  cloze_ranges?: [number, number][];
  difficulty: number;
  interval: number;
  ease_factor: number;
  due_date: string;
  date_created: string;
  date_modified: string;
  last_review_date?: string;
  review_count: number;
  lapses: number;
  state: "New" | "Learning" | "Review" | "Relearning";
  is_suspended: boolean;
  tags: string[];
}

export interface CreateLearningItemInput {
  item_type: string;
  question: string;
  answer?: string;
}

/**
 * Get learning items that are due for review
 */
export async function getDueItems(): Promise<LearningItem[]> {
  return await invokeCommand<LearningItem[]>("get_due_items");
}

/**
 * Get all learning items for a document
 */
export async function getLearningItems(documentId: string): Promise<LearningItem[]> {
  return await invokeCommand<LearningItem[]>("get_learning_items", { documentId });
}

/**
 * Create a new learning item
 */
export async function createLearningItem(input: CreateLearningItemInput): Promise<LearningItem> {
  return await invokeCommand<LearningItem>("create_learning_item", {
    itemType: input.item_type,
    question: input.question,
  });
}

/**
 * Generate learning items from an extract
 * This automatically creates cloze deletions and Q&A pairs from the extract content
 */
export async function generateLearningItemsFromExtract(extractId: string): Promise<LearningItem[]> {
  return await invokeCommand<LearningItem[]>("generate_learning_items_from_extract", {
    extractId,
  });
}

/**
 * Get the item type display name
 */
export function getItemTypeName(itemType: LearningItem["item_type"]): string {
  switch (itemType) {
    case "Flashcard":
      return "Flashcard";
    case "Cloze":
      return "Cloze Deletion";
    case "Qa":
      return "Q&A";
    case "Basic":
      return "Basic";
    default:
      return "Unknown";
  }
}

/**
 * Get the item state display name
 */
export function getItemStateName(state: LearningItem["state"]): string {
  switch (state) {
    case "New":
      return "New";
    case "Learning":
      return "Learning";
    case "Review":
      return "Review";
    case "Relearning":
      return "Relearning";
    default:
      return "Unknown";
  }
}
