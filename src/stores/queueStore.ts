import { create } from "zustand";
import { getQueue, getQueueStats, postponeItem, bulkSuspendItems, bulkUnsuspendItems, bulkDeleteItems, type BulkOperationResult, type QueueStats } from "../api/queue";
import type { QueueItem, SortOptions, SearchFilters } from "../types";

interface QueueState {
  // Data
  items: QueueItem[];
  filteredItems: QueueItem[];
  selectedIds: Set<string>;
  stats: QueueStats | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filters: SearchFilters;
  sortOptions: SortOptions;
  bulkOperationLoading: boolean;
  bulkOperationResult: BulkOperationResult | null;

  // Actions
  loadQueue: () => Promise<void>;
  loadStats: () => Promise<void>;
  setItems: (items: QueueItem[]) => void;
  setSelected: (id: string, selected: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setSortOptions: (sort: SortOptions) => void;
  applyFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Bulk operations
  postponeItem: (id: string, days: number) => Promise<void>;
  bulkSuspend: () => Promise<void>;
  bulkUnsuspend: () => Promise<void>;
  bulkDelete: () => Promise<void>;
  clearBulkResult: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  // Initial State
  items: [],
  filteredItems: [],
  selectedIds: new Set<string>(),
  stats: null,
  isLoading: false,
  error: null,
  searchQuery: "",
  filters: {},
  sortOptions: {
    field: "priority",
    direction: "desc",
  },
  bulkOperationLoading: false,
  bulkOperationResult: null,

  // Actions
  loadQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await getQueue();
      set({
        items,
        filteredItems: items,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load queue",
        isLoading: false,
      });
    }
  },

  loadStats: async () => {
    try {
      const stats = await getQueueStats();
      set({ stats });
    } catch (error) {
      console.error("Failed to load queue stats:", error);
    }
  },

  setItems: (items) =>
    set({
      items,
      filteredItems: items,
    }),

  setSelected: (id, selected) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return { selectedIds: newSelected };
    }),

  selectAll: () =>
    set((state) => {
      const newSelected = new Set<string>();
      state.filteredItems.forEach((item) => {
        if (item.itemType === "learning-item") {
          newSelected.add(item.id);
        }
      });
      return { selectedIds: newSelected };
    }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setFilters: (filters) => {
    set({ filters });
    get().applyFilters();
  },

  setSortOptions: (sort) => {
    set({ sortOptions: sort });
    get().applyFilters();
  },

  applyFilters: () => {
    const { items, searchQuery, filters, sortOptions } = get();
    let filtered = [...items];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.documentTitle.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((item) =>
        filters.categories?.includes(item.category || "")
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        item.tags.some((tag) => filters.tags?.includes(tag))
      );
    }

    if (filters.minPriority !== undefined) {
      filtered = filtered.filter((item) => item.priority >= filters.minPriority!);
    }

    if (filters.maxPriority !== undefined) {
      filtered = filtered.filter((item) => item.priority <= filters.maxPriority!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const key = sortOptions.field;
      const aVal = key === "title" ? a.documentTitle : a.priority;
      const bVal = key === "title" ? b.documentTitle : b.priority;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOptions.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOptions.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    set({ filteredItems: filtered });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Bulk operations
  postponeItem: async (id, days) => {
    try {
      await postponeItem(id, days);
      // Reload queue to get updated data
      await get().loadQueue();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to postpone item",
      });
      throw error;
    }
  },

  bulkSuspend: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    set({ bulkOperationLoading: true, error: null, bulkOperationResult: null });
    try {
      const result = await bulkSuspendItems(Array.from(selectedIds));
      set({ bulkOperationResult: result, bulkOperationLoading: false });

      // Reload queue to get updated data
      await get().loadQueue();
      await get().loadStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to suspend items",
        bulkOperationLoading: false,
      });
      throw error;
    }
  },

  bulkUnsuspend: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    set({ bulkOperationLoading: true, error: null, bulkOperationResult: null });
    try {
      const result = await bulkUnsuspendItems(Array.from(selectedIds));
      set({ bulkOperationResult: result, bulkOperationLoading: false });

      // Reload queue to get updated data
      await get().loadQueue();
      await get().loadStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to unsuspend items",
        bulkOperationLoading: false,
      });
      throw error;
    }
  },

  bulkDelete: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    set({ bulkOperationLoading: true, error: null, bulkOperationResult: null });
    try {
      const result = await bulkDeleteItems(Array.from(selectedIds));
      set({ bulkOperationResult: result, bulkOperationLoading: false });

      // Clear selection and reload queue
      set({ selectedIds: new Set<string>() });
      await get().loadQueue();
      await get().loadStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete items",
        bulkOperationLoading: false,
      });
      throw error;
    }
  },

  clearBulkResult: () => set({ bulkOperationResult: null }),
}));
