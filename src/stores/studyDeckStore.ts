import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Document } from "../types/document";
import type { StudyDeck } from "../types/study-decks";
import { generateId } from "../utils/id";
import { getDeckTagCandidates, normalizeTagList } from "../utils/studyDecks";

interface StudyDeckState {
  decks: StudyDeck[];
  activeDeckId: string | null;
  setActiveDeckId: (deckId: string | null) => void;
  addDeck: (name: string, tagFilters?: string[]) => void;
  updateDeck: (deckId: string, updates: Partial<Pick<StudyDeck, "name" | "tagFilters">>) => void;
  removeDeck: (deckId: string) => void;
  seedFromDocuments: (documents: Document[]) => void;
}

export const useStudyDeckStore = create<StudyDeckState>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeckId: null,

      setActiveDeckId: (deckId) => {
        set({ activeDeckId: deckId });
      },

      addDeck: (name, tagFilters = []) => {
        const now = new Date().toISOString();
        const deck: StudyDeck = {
          id: generateId(),
          name: name.trim() || "Untitled Deck",
          tagFilters: normalizeTagList(tagFilters),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ decks: [...state.decks, deck] }));
      },

      updateDeck: (deckId, updates) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId
              ? {
                  ...deck,
                  ...updates,
                  tagFilters: updates.tagFilters
                    ? normalizeTagList(updates.tagFilters)
                    : deck.tagFilters,
                  updatedAt: new Date().toISOString(),
                }
              : deck
          ),
        }));
      },

      removeDeck: (deckId) => {
        set((state) => {
          const nextDecks = state.decks.filter((deck) => deck.id !== deckId);
          const nextActive = state.activeDeckId === deckId ? null : state.activeDeckId;
          return { decks: nextDecks, activeDeckId: nextActive };
        });
      },

      seedFromDocuments: (documents) => {
        const { decks } = get();
        if (decks.length > 0) return;

        const tagCandidates = new Set<string>();
        documents.forEach((doc) => {
          const tags = Array.isArray(doc.tags) ? doc.tags : [];
          if (tags.length === 0) return;
          if (!tags.some((tag) => tag.toLowerCase() === "anki-import")) return;
          getDeckTagCandidates(tags).forEach((tag) => tagCandidates.add(tag));
        });

        if (tagCandidates.size === 0) return;

        const now = new Date().toISOString();
        const seeded = Array.from(tagCandidates).map((tag) => ({
          id: generateId(),
          name: tag,
          tagFilters: normalizeTagList([tag]),
          createdAt: now,
          updatedAt: now,
        }));

        set({ decks: seeded });
      },
    }),
    {
      name: "incrementum-study-decks",
      version: 1,
    }
  )
);
