/**
 * Anki Package Import Utility
 *
 * Handles importing .apkg files (Anki export packages)
 * and converting them to Incrementum format
 */

import { invokeCommand, openFilePicker } from "../lib/tauri";

export interface AnkiField {
  name: string;
  value: string;
}

export interface AnkiNote {
  id: number;
  guid: string;
  mid: number;
  modelName: string;
  tags: string[];
  fields: AnkiField[];
  timestamp: number;
}

export interface AnkiCard {
  id: number;
  noteId: number;
  ord: number;
  interval: number;
  ease: number;
  due: number;
}

export interface AnkiDeck {
  id: number;
  name: string;
  notes: AnkiNote[];
  cards: AnkiCard[];
}

/**
 * Validate an Anki package file
 */
export async function validateAnkiPackage(filePath: string): Promise<boolean> {
  try {
    const isValid = await invokeCommand<boolean>("validate_anki_package", { path: filePath });
    return isValid;
  } catch (error) {
    console.error("Failed to validate Anki package:", error);
    throw error;
  }
}

/**
 * Import an Anki package file
 */
export async function importAnkiPackage(filePath: string): Promise<AnkiDeck[]> {
  try {
    const result = await invokeCommand<string>("import_anki_package", { apkgPath: filePath });
    const decks = JSON.parse(result) as AnkiDeck[];
    return decks;
  } catch (error) {
    console.error("Failed to import Anki package:", error);
    throw error;
  }
}

/**
 * Open file picker to select .apkg file
 */
export async function selectAnkiPackage(): Promise<string | null> {
  try {
    const selected = await openFilePicker({
      multiple: false,
      filters: [{
        name: "Anki Package",
        extensions: ["apkg"]
      }]
    });

    if (!selected || selected.length === 0) return null;
    return selected[0]; // Return the first selected file path
  } catch (error) {
    console.error("Failed to open file picker:", error);
    return null;
  }
}

/**
 * Convert Anki deck to Incrementum documents
 */
export async function convertAnkiDeckToDocuments(
  deck: AnkiDeck
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

  // Create a document for each note
  for (const note of deck.notes) {
    // Combine all fields into content
    const content = note.fields
      .map(field => `${field.name}:\n${field.value}`)
      .join("\n\n");

    // Get the primary field (usually first or named "Front", "Question", etc.)
    const primaryField = note.fields.find(f =>
      f.name.toLowerCase().includes("front") ||
      f.name.toLowerCase().includes("question") ||
      f.name.toLowerCase().includes("text")
    ) || note.fields[0];

    const title = primaryField?.value.slice(0, 100) || note.modelName;

    documents.push({
      title: title.length > 0 ? title : `${deck.name} - Note ${note.id}`,
      content,
      fileType: "anki",
      category: deck.name,
      tags: [...note.tags, "anki-import", note.modelName],
      metadata: {
        ankiNoteId: note.id,
        ankiGuid: note.guid,
        ankiModel: note.modelName,
        ankiTimestamp: note.timestamp,
        sourceDeck: deck.name,
        sourceDeckId: deck.id,
      },
    });
  }

  return documents;
}

/**
 * Convert Anki cards to Incrementum learning items
 */
export async function convertAnkiCardsToLearningItems(
  deck: AnkiDeck,
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

  // Create learning items for each card
  for (const card of deck.cards) {
    // Find the note for this card
    const note = deck.notes.find(n => n.id === card.noteId);
    if (!note) continue;

    // Extract question and answer from fields
    const questionField = note.fields.find(f =>
      f.name.toLowerCase().includes("front") ||
      f.name.toLowerCase().includes("question")
    );

    const answerField = note.fields.find(f =>
      f.name.toLowerCase().includes("back") ||
      f.name.toLowerCase().includes("answer")
    );

    if (!questionField || !answerField) continue;

    items.push({
      documentId,
      itemType: "flashcard",
      question: questionField.value,
      answer: answerField.value,
      tags: [...note.tags, "anki-import", note.modelName],
      metadata: {
        ankiCardId: card.id,
        ankiNoteId: note.id,
        ankiGuid: note.guid,
        ankiModel: note.modelName,
        interval: card.interval,
        ease: card.ease,
        due: card.due,
        sourceDeck: deck.name,
        sourceDeckId: deck.id,
      },
    });
  }

  return items;
}

/**
 * Get statistics about an Anki package
 */
export function getAnkiDeckStats(deck: AnkiDeck): {
  deckName: string;
  noteCount: number;
  cardCount: number;
  models: string[];
  tags: string[];
} {
  const models = new Set<string>();
  const tags = new Set<string>();

  for (const note of deck.notes) {
    models.add(note.modelName);
    note.tags.forEach(tag => tags.add(tag));
  }

  return {
    deckName: deck.name,
    noteCount: deck.notes.length,
    cardCount: deck.cards.length,
    models: Array.from(models),
    tags: Array.from(tags),
  };
}
