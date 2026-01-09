import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface ExtractState {
  extracts: any[];
  isLoading: boolean;
  loadExtracts: (documentId?: string) => Promise<void>;
  createExtract: (data: any) => Promise<void>;
  updateExtract: (id: string, data: any) => Promise<void>;
  deleteExtract: (id: string) => Promise<void>;
}

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__;
};

export const useExtractStore = create<ExtractState>((set, get) => ({
  extracts: [],
  isLoading: false,
  loadExtracts: async (documentId) => {
    if (!isTauri()) {
      console.warn("Not running in Tauri environment - using mock data");
      set({ extracts: [], isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const extracts = await invoke("get_extracts", { documentId: documentId || null });
      set({ extracts, isLoading: false });
    } catch (error) {
      console.error("Failed to load extracts:", error);
      set({ isLoading: false });
    }
  },
  createExtract: async (data) => {
    if (!isTauri()) {
      throw new Error("Not running in Tauri environment - cannot create extract");
    }
    try {
      await invoke("create_extract", { extract: data });
    } catch (error) {
      console.error("Failed to create extract:", error);
      throw error;
    }
  },
  updateExtract: async (id, data) => {
    if (!isTauri()) {
      throw new Error("Not running in Tauri environment - cannot update extract");
    }
    try {
      await invoke("update_extract", { id, extract: data });
    } catch (error) {
      console.error("Failed to update extract:", error);
      throw error;
    }
  },
  deleteExtract: async (id) => {
    if (!isTauri()) {
      throw new Error("Not running in Tauri environment - cannot delete extract");
    }
    try {
      await invoke("delete_extract", { id });
    } catch (error) {
      console.error("Failed to delete extract:", error);
      throw error;
    }
  },
}));
