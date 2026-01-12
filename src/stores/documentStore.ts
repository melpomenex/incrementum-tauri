import { create } from "zustand";
import { Document, Extract } from "../types";
import * as documentsApi from "../api/documents";
import { isTauri } from "../lib/tauri";

interface DocumentState {
  // Data
  documents: Document[];
  currentDocument: Document | null;
  extracts: Extract[];
  currentExtract: Extract | null;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isImporting: boolean;
  importProgress: {
    current: number;
    total: number;
    fileName?: string;
  };
  error: string | null;
  searchQuery: string;

  // Pagination
  currentPage: number;
  totalPages: number;

  // Actions
  loadDocuments: () => Promise<void>;
  setDocuments: (documents: Document[]) => void;
  setCurrentDocument: (document: Document | null) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => Promise<void>;
  importFromFile: (filePath: string) => Promise<Document>;
  importFromFiles: (filePaths: string[]) => Promise<Document[]>;
  openFilePickerAndImport: () => Promise<Document[]>;
  setExtracts: (extracts: Extract[]) => void;
  setCurrentExtract: (extract: Extract | null) => void;
  addExtract: (extract: Extract) => void;
  updateExtract: (id: string, updates: Partial<Extract>) => void;
  deleteExtract: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setImporting: (importing: boolean) => void;
  setImportProgress: (current: number, total: number, fileName?: string) => void;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Initial State
  documents: [],
  currentDocument: null,
  extracts: [],
  currentExtract: null,
  isLoading: false,
  isSaving: false,
  isImporting: false,
  importProgress: { current: 0, total: 0 },
  error: null,
  searchQuery: "",
  currentPage: 1,
  totalPages: 1,

  // Actions
  loadDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await documentsApi.getDocuments();
      set({ documents: docs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load documents",
        isLoading: false,
      });
    }
  },

  setDocuments: (documents) => set({ documents }),

  setCurrentDocument: (document) =>
    set({
      currentDocument: document,
      currentPage: document?.currentPage || 1,
      totalPages: document?.totalPages || 1,
    }),

  addDocument: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
    })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates, dateModified: new Date().toISOString() } : doc
      ),
      currentDocument:
        state.currentDocument?.id === id
          ? { ...state.currentDocument, ...updates, dateModified: new Date().toISOString() }
          : state.currentDocument,
    })),

  deleteDocument: async (id) => {
    await documentsApi.deleteDocument(id);
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
      currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
    }));
  },

  importFromFile: async (filePath) => {
    set({ isImporting: true, error: null });
    try {
      const doc = await documentsApi.importDocument(filePath);
      set((state) => ({
        documents: [...state.documents, doc],
        isImporting: false,
      }));
      return doc;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to import document",
        isImporting: false,
      });
      throw error;
    }
  },

  importFromFiles: async (filePaths) => {
    set({ isImporting: true, error: null, importProgress: { current: 0, total: filePaths.length } });
    const imported: Document[] = [];

    try {
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const fileName = filePath.split('/').pop() || filePath;

        set({
          importProgress: { current: i, total: filePaths.length, fileName }
        });

        try {
          const doc = await documentsApi.importDocument(filePath);
          imported.push(doc);
        } catch (error) {
          console.error(`Failed to import ${fileName}:`, error);
          // Continue with other files
        }

        set({
          importProgress: { current: i + 1, total: filePaths.length, fileName }
        });
      }

      set((state) => ({
        documents: [...state.documents, ...imported],
        isImporting: false,
        importProgress: { current: imported.length, total: filePaths.length }
      }));

      return imported;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to import documents",
        isImporting: false,
        importProgress: { current: 0, total: 0 }
      });
      throw error;
    }
  },

  openFilePickerAndImport: async () => {
    const filePaths = await documentsApi.openFilePicker({ multiple: true });
    if (!filePaths || filePaths.length === 0) {
      return [];
    }
    return get().importFromFiles(filePaths);
  },


  setExtracts: (extracts) => set({ extracts }),

  setCurrentExtract: (extract) => set({ currentExtract: extract }),

  addExtract: (extract) =>
    set((state) => ({
      extracts: [...state.extracts, extract],
    })),

  updateExtract: (id, updates) =>
    set((state) => ({
      extracts: state.extracts.map((ext) =>
        ext.id === id ? { ...ext, ...updates, dateModified: new Date().toISOString() } : ext
      ),
      currentExtract:
        state.currentExtract?.id === id
          ? { ...state.currentExtract, ...updates, dateModified: new Date().toISOString() }
          : state.currentExtract,
    })),

  deleteExtract: (id) =>
    set((state) => ({
      extracts: state.extracts.filter((ext) => ext.id !== id),
      currentExtract: state.currentExtract?.id === id ? null : state.currentExtract,
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setCurrentPage: (currentPage) => set({ currentPage }),

  setLoading: (isLoading) => set({ isLoading }),

  setSaving: (isSaving) => set({ isSaving: isSaving }),

  setImporting: (isImporting) => set({ isImporting }),

  setImportProgress: (current, total, fileName) => set({ importProgress: { current, total, fileName } }),

  setError: (error) => set({ error }),
}));
