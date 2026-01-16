/**
 * Browser-side Anki Package Parser
 *
 * Parses .apkg files (Anki export packages) in the browser
 * using jszip and sql.js
 */

import JSZip from 'jszip';
import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

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
 * Parse an Anki .apkg file in the browser
 */
export async function parseAnkiPackage(file: File | Uint8Array): Promise<AnkiDeck[]> {
  // Load sql.js WASM
  const SQL = await initSqlJs({
    // Use bundled wasm for offline/PWA compatibility
    locateFile: () => sqlWasmUrl
  });

  // Read the ZIP file
  let arrayBuffer: ArrayBuffer;
  if (file instanceof Uint8Array) {
    arrayBuffer = file.buffer;
  } else {
    arrayBuffer = await file.arrayBuffer();
  }

  const zip = await JSZip.loadAsync(arrayBuffer);

  // Try to find the collection database
  const collectionFile = zip.file('collection.anki2') || zip.file('collection.anki21');
  if (!collectionFile) {
    throw new Error('Invalid Anki package: missing collection database');
  }

  // Read the database as ArrayBuffer
  const dbBuffer = await collectionFile.async('arraybuffer');
  const db = new SQL.Database(new Uint8Array(dbBuffer));

  // Parse the database
  const decks = parseAnkiDatabase(db, zip);

  return decks;
}

/**
 * Parse Anki SQLite database
 */
function parseAnkiDatabase(db: Database, zip: JSZip): AnkiDeck[] {
  // Get models (note types)
  const models: Map<number, { name: string; fields: string[] }> = new Map();
  const normalizeModelFields = (raw: unknown): Array<{ name?: string }> => {
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      return raw as Array<{ name?: string }>;
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Array<{ name?: string }>) : [];
      } catch {
        return [];
      }
    }
    if (typeof raw === "object") {
      return [];
    }
    return [];
  };

  // The models are stored in JSON in the 'models' column of the 'col' table
  const colData = db.exec('SELECT models FROM col');
  if (colData.length > 0 && colData[0].values.length > 0) {
    const modelsJson = JSON.parse(colData[0].values[0][0] as string);
    for (const [id, model] of Object.entries(modelsJson)) {
      const m = model as any;
      const fieldNames: string[] = [];
      if (m.flds) {
        const fields = normalizeModelFields(m.flds);
        for (const field of fields) {
          if (field?.name) {
            fieldNames.push(field.name);
          }
        }
      }
      models.set(parseInt(id, 10), {
        name: m.name,
        fields: fieldNames
      });
    }
  }

  // Get notes
  const notesResult = db.exec('SELECT id, guid, mid, tags, flds, mod FROM notes');
  const notes: AnkiNote[] = [];

  if (notesResult.length > 0) {
    for (const row of notesResult[0].values) {
      const noteId = row[0] as number;
      const guid = row[1] as string;
      const mid = row[2] as number;
      const tagsStr = (row[3] as string || '');
      const fieldsStr = row[4] as string;
      const ctime = row[5] as number;

      // Parse tags
      const tags = tagsStr ? tagsStr.split(' ').filter(t => t.length > 0) : [];

      // Get model info
      const model = models.get(mid);

      // Parse fields (separated by \x1f)
      const fieldValues = fieldsStr.split('\x1f');
      const fields: AnkiField[] = [];

      if (model) {
        for (let i = 0; i < Math.min(fieldValues.length, model.fields.length); i++) {
          fields.push({
            name: model.fields[i],
            value: fieldValues[i]
          });
        }
      } else {
        // Fallback: use generic field names
        for (let i = 0; i < fieldValues.length; i++) {
          fields.push({
            name: `Field ${i + 1}`,
            value: fieldValues[i]
          });
        }
      }

      notes.push({
        id: noteId,
        guid,
        mid,
        modelName: model?.name || 'Unknown',
        tags,
        fields,
        timestamp: ctime
      });
    }
  }

  // Get cards
  const cardsResult = db.exec('SELECT id, nid, ord, ivl, factor, due, type FROM cards WHERE type != 4'); // type 4 is a filtered deck card
  const cards: AnkiCard[] = [];

  if (cardsResult.length > 0) {
    for (const row of cardsResult[0].values) {
      cards.push({
        id: row[0] as number,
        noteId: row[1] as number,
        ord: row[2] as number,
        interval: row[3] as number,
        ease: (row[4] as number) / 1000, // Convert from Anki's internal format
        due: row[5] as number
      });
    }
  }

  // Get decks
  const decksResult = db.exec('SELECT decks FROM col');
  const decks: AnkiDeck[] = [];

  if (decksResult.length > 0 && decksResult[0].values.length > 0) {
    const decksJson = JSON.parse(decksResult[0].values[0][0] as string);

    for (const [id, deck] of Object.entries(decksJson)) {
      const d = deck as any;
      if (d.name) {
        // Get cards for this deck (in Anki, cards have a did field pointing to deck id)
        const deckId = parseInt(id);
        const deckCards = cards.filter(card => {
          // We need to check if card belongs to this deck
          // This is a simplification - in reality, we'd need to query the card's did
          return true; // For now, include all cards
        });

        // Get notes for this deck's cards
        const deckNoteIds = new Set(deckCards.map(c => c.noteId));
        const deckNotes = notes.filter(n => deckNoteIds.has(n.id));

        decks.push({
          id: deckId,
          name: d.name,
          notes: deckNotes,
          cards: deckCards.filter(c => deckNotes.some(n => n.id === c.noteId))
        });
      }
    }
  }

  // If no decks found, create a default deck
  if (decks.length === 0) {
    decks.push({
      id: 0,
      name: 'Default',
      notes,
      cards
    });
  }

  return decks;
}

/**
 * Convert parsed Anki deck to learning items format
 */
export function convertAnkiToLearningItems(decks: AnkiDeck[]): {
  documents: Array<{ title: string; content: string; fileType: string; category: string; tags: string[] }>;
  learningItems: Array<{ documentId: string; itemType: string; question: string; answer: string; tags: string[] }>;
} {
  const documents: Array<{ title: string; content: string; fileType: string; category: string; tags: string[] }> = [];
  const learningItems: Array<{ documentId: string; itemType: string; question: string; answer: string; tags: string[] }> = [];

  for (const deck of decks) {
    // Create a document for the deck
    const docId = `anki-deck-${deck.id}`;
    documents.push({
      title: deck.name,
      content: `Anki deck with ${deck.notes.length} notes and ${deck.cards.length} cards`,
      fileType: 'anki',
      category: 'anki-import',
      tags: ['anki-import', deck.name]
    });

    // Create learning items for each card
    for (const card of deck.cards) {
      const note = deck.notes.find(n => n.id === card.noteId);
      if (!note) continue;

      // Find question and answer fields with a safe fallback
      const questionField = note.fields.find(f =>
        f.name.toLowerCase().includes('front') ||
        f.name.toLowerCase().includes('question') ||
        f.name.toLowerCase().includes('text')
      );

      const answerField = note.fields.find(f =>
        f.name.toLowerCase().includes('back') ||
        f.name.toLowerCase().includes('answer')
      );

      const fallbackQuestion = note.fields[0];
      const fallbackAnswer = note.fields[1];

      const questionValue = questionField?.value ?? fallbackQuestion?.value;
      const answerValue = answerField?.value ?? fallbackAnswer?.value ?? '';

      if (questionValue) {
        learningItems.push({
          documentId: docId,
          itemType: 'flashcard',
          question: questionValue,
          answer: answerValue,
          tags: [...note.tags, 'anki-import', note.modelName, deck.name]
        });
      }
    }
  }

  return { documents, learningItems };
}
