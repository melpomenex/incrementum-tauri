/**
 * SuperMemo Import Utility
 *
 * Handles importing SuperMemo export files (ZIP archives with XML)
 * and converting them to Incrementum format
 */

import { invokeCommand, openFilePicker } from "../lib/tauri";

export interface SuperMemoItem {
  id: string;
  title: string;
  content: string;
  question?: string;
  answer?: string;
  topic?: string;
  interval?: number;
  repetitions?: number;
  easiness?: number;
  timestamp: number;
}

export interface SuperMemoCollection {
  name: string;
  items: SuperMemoItem[];
  topics: string[];
  media: string[];
}

/**
 * Validate a SuperMemo export file
 */
export async function validateSuperMemoPackage(filePath: string): Promise<boolean> {
  try {
    const isValid = await invokeCommand<boolean>("validate_supermemo_package", { path: filePath });
    return isValid;
  } catch (error) {
    console.error("Failed to validate SuperMemo export:", error);
    throw error;
  }
}

/**
 * Import a SuperMemo export file
 */
export async function importSuperMemoPackage(filePath: string): Promise<SuperMemoCollection> {
  try {
    const result = await invokeCommand<string>("import_supermemo_package", { zipPath: filePath });
    const collection = JSON.parse(result) as SuperMemoCollection;
    return collection;
  } catch (error) {
    console.error("Failed to import SuperMemo export:", error);
    throw error;
  }
}

/**
 * Open file picker to select SuperMemo export
 */
export async function selectSuperMemoPackage(): Promise<string | null> {
  try {
    const selected = await openFilePicker({
      multiple: false,
      filters: [{
        name: "SuperMemo Export",
        extensions: ["zip"]
      }]
    });

    return selected ? selected[0] : null;
  } catch (error) {
    console.error("Failed to open file picker:", error);
    return null;
  }
}

/**
 * Convert SuperMemo collection to Incrementum documents
 */
export async function convertSuperMemoCollectionToDocuments(
  collection: SuperMemoCollection
): Promise<Array<{
  title: string;
  content: string;
  fileType: string;
  category: string;
  tags: string[];
  metadata: Record<string, any>;
}>> {
  const documents: Array<{
    title: string;
    content: string;
    fileType: string;
    category: string;
    tags: string[];
    metadata: Record<string, any>;
  }> = [];

  // Create a document for each item
  for (const item of collection.items) {
    const content = item.question && item.answer
      ? `Question:\n${item.question}\n\nAnswer:\n${item.answer}`
      : item.content;

    const title = item.title || `${collection.name} - Item ${item.id}`;

    documents.push({
      title,
      content,
      fileType: "supermemo",
      category: item.topic || collection.name,
      tags: [
        "supermemo-import",
        ...(item.topic ? [item.topic] : []),
        ...(collection.topics.length > 0 ? collection.topics.slice(0, 3) : [])
      ],
      metadata: {
        superMemoId: item.id,
        interval: item.interval,
        repetitions: item.repetitions,
        easiness: item.easiness,
        timestamp: item.timestamp,
        sourceCollection: collection.name,
        hasQuestionAnswer: !!(item.question && item.answer),
      },
    });
  }

  return documents;
}

/**
 * Convert SuperMemo items to Incrementum learning items
 */
export async function convertSuperMemoItemsToLearningItems(
  collection: SuperMemoCollection,
  documentId: string
): Promise<Array<{
  documentId: string;
  itemType: string;
  question: string;
  answer: string;
  tags: string[];
  metadata: Record<string, any>;
}>> {
  const items: Array<{
    documentId: string;
    itemType: string;
    question: string;
    answer: string;
    tags: string[];
    metadata: Record<string, any>;
  }> = [];

  // Create learning items for items with Q&A
  for (const smItem of collection.items) {
    if (!smItem.question || !smItem.answer) continue;

    items.push({
      documentId,
      itemType: "flashcard",
      question: smItem.question,
      answer: smItem.answer,
      tags: [
        "supermemo-import",
        ...(smItem.topic ? [smItem.topic] : [])
      ],
      metadata: {
        superMemoId: smItem.id,
        interval: smItem.interval,
        repetitions: smItem.repetitions,
        easiness: smItem.easiness,
        topic: smItem.topic,
        sourceCollection: collection.name,
      },
    });
  }

  return items;
}

/**
 * Get statistics about a SuperMemo collection
 */
export function getSuperMemoCollectionStats(collection: SuperMemoCollection): {
  collectionName: string;
  itemCount: number;
  topicCount: number;
  mediaCount: number;
  qaItemCount: number;
  topics: string[];
} {
  const qaCount = collection.items.filter(item => item.question && item.answer).length;

  return {
    collectionName: collection.name,
    itemCount: collection.items.length,
    topicCount: collection.topics.length,
    mediaCount: collection.media.length,
    qaItemCount: qaCount,
    topics: collection.topics.slice(0, 10), // Top 10 topics
  };
}
