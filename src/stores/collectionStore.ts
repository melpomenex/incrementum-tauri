import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "../utils/id";
import type { Document } from "../types/document";

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionState {
  collections: Collection[];
  activeCollectionId: string | null;
  documentAssignments: Record<string, string>;
  setActiveCollectionId: (id: string | null) => void;
  createCollection: (name: string) => Collection;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  assignDocument: (documentId: string, collectionId: string) => void;
  ensureDocumentsAssigned: (documents: Document[]) => void;
}

function buildDefaultCollection(): Collection {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "Demo Collection",
    createdAt: now,
    updatedAt: now,
  };
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => {
      const defaultCollection = buildDefaultCollection();

      return {
        collections: [defaultCollection],
        activeCollectionId: defaultCollection.id,
        documentAssignments: {},

        setActiveCollectionId: (id) => {
          set({ activeCollectionId: id });
        },

        createCollection: (name) => {
          const now = new Date().toISOString();
          const trimmed = name.trim() || "Untitled Collection";
          const collection: Collection = {
            id: generateId(),
            name: trimmed,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({
            collections: [...state.collections, collection],
            activeCollectionId: collection.id,
          }));
          return collection;
        },

        renameCollection: (id, name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          set((state) => ({
            collections: state.collections.map((collection) =>
              collection.id === id
                ? { ...collection, name: trimmed, updatedAt: new Date().toISOString() }
                : collection
            ),
          }));
        },

        removeCollection: (id) => {
          set((state) => {
            const remaining = state.collections.filter((collection) => collection.id !== id);
            const nextCollections = remaining.length > 0 ? remaining : [buildDefaultCollection()];
            const nextActive =
              state.activeCollectionId === id
                ? nextCollections[0]?.id ?? null
                : state.activeCollectionId;
            const nextAssignments: Record<string, string> = {};
            for (const [docId, collectionId] of Object.entries(state.documentAssignments)) {
              if (collectionId !== id) {
                nextAssignments[docId] = collectionId;
              }
            }
            return {
              collections: nextCollections,
              activeCollectionId: nextActive,
              documentAssignments: nextAssignments,
            };
          });
        },

        assignDocument: (documentId, collectionId) => {
          set((state) => ({
            documentAssignments: {
              ...state.documentAssignments,
              [documentId]: collectionId,
            },
          }));
        },

        ensureDocumentsAssigned: (documents) => {
          const { activeCollectionId, documentAssignments } = get();
          if (!activeCollectionId) return;
          const updates: Record<string, string> = {};
          documents.forEach((doc) => {
            if (!documentAssignments[doc.id]) {
              updates[doc.id] = activeCollectionId;
            }
          });
          if (Object.keys(updates).length === 0) return;
          set((state) => ({
            documentAssignments: { ...state.documentAssignments, ...updates },
          }));
        },
      };
    },
    {
      name: "incrementum-collections",
      version: 1,
    }
  )
);
