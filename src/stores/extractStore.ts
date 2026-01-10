import { create } from "zustand";
import { invokeCommand } from "../lib/tauri";

interface ExtractState {
  extracts: any[];
  isLoading: boolean;
  loadExtracts: (documentId?: string) => Promise<void>;
  createExtract: (data: any) => Promise<void>;
  updateExtract: (id: string, data: any) => Promise<void>;
  deleteExtract: (id: string) => Promise<void>;
}

export const useExtractStore = create<ExtractState>((set, get) => ({
  extracts: [],
  isLoading: false,
  loadExtracts: async (documentId) => {
    set({ isLoading: true });
    try {
      const extracts = await invokeCommand("get_extracts", { documentId: documentId || null });
      set({ extracts, isLoading: false });
    } catch (error) {
      console.error("Failed to load extracts:", error);
      set({ isLoading: false });
    }
  },
  createExtract: async (data) => {
    try {
      await invokeCommand("create_extract", { extract: data });
    } catch (error) {
      console.error("Failed to create extract:", error);
      throw error;
    }
  },
  updateExtract: async (id, data) => {
    try {
      await invokeCommand("update_extract", { id, extract: data });
    } catch (error) {
      console.error("Failed to update extract:", error);
      throw error;
    }
  },
  deleteExtract: async (id) => {
    try {
      await invokeCommand("delete_extract", { id });
    } catch (error) {
      console.error("Failed to delete extract:", error);
      throw error;
    }
  },
}));
