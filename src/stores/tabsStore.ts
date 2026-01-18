import { create } from "zustand";
import type { ComponentType } from "react";
import { generateId } from "../utils/id";

export type TabType =
  | "dashboard"
  | "queue"
  | "queue-scroll"
  | "review"
  | "documents"
  | "document-viewer"
  | "analytics"
  | "settings"
  | "knowledge-sphere"
  | "knowledge-network"
  | "rss"
  | "web-browser";

export interface Tab {
  id: string;
  title: string;
  icon: string;
  type: TabType;
  content: ComponentType;
  closable: boolean;
  data?: Record<string, unknown>;
}

export interface TabsState {
  // State
  tabs: Tab[];
  activeTabId: string | null;
  closedTabs: Tab[];

  // Actions
  addTab: (tab: Omit<Tab, "id">) => string;
  addTabInBackground: (tab: Omit<Tab, "id">) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  reopenLastClosedTab: () => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeAllTabs: () => void;
  moveTab: (fromIndex: number, toIndex: number) => void;

  // Persistence
  saveTabs: () => void;
  loadTabs: () => void;
  getDefaultTabs: () => Tab[];
}

const STORAGE_KEY = "incrementum-tabs";

export const useTabsStore = create<TabsState>((set, get) => ({
  // Initial State
  tabs: [],
  activeTabId: null,
  closedTabs: [],

  // Get default tabs that should always be available
  getDefaultTabs: () => {
    // These will be populated dynamically when tab content components are imported
    // For now, return empty array - tabs are loaded from localStorage or created on demand
    return [];
  },

  // Add a new tab
  addTab: (tab) => {
    const id = generateId();
    const newTab: Tab = { ...tab, id };

    set((state) => {
      // Check if tab of same type with same data already exists
      const existingTab = state.tabs.find(
        (t) =>
          t.type === tab.type &&
          JSON.stringify(t.data) === JSON.stringify(tab.data)
      );

      if (existingTab) {
        // Just switch to existing tab
        return { activeTabId: existingTab.id };
      }

      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      };
    });

    // Auto-save after adding
    get().saveTabs();

    return id;
  },

  // Add a new tab in background (without focusing it)
  addTabInBackground: (tab) => {
    const id = generateId();
    const newTab: Tab = { ...tab, id };

    set((state) => {
      // Check if tab of same type with same data already exists
      const existingTab = state.tabs.find(
        (t) =>
          t.type === tab.type &&
          JSON.stringify(t.data) === JSON.stringify(tab.data)
      );

      if (existingTab) {
        // Tab already exists, don't create a duplicate
        return state;
      }

      return {
        tabs: [...state.tabs, newTab],
        // Keep current tab active, don't switch to the new tab
        activeTabId: state.activeTabId,
      };
    });

    // Auto-save after adding
    get().saveTabs();

    return id;
  },

  // Close a tab
  closeTab: (tabId) => {
    set((state) => {
      const tabToClose = state.tabs.find((t) => t.id === tabId);

      // Don't close non-closable tabs
      if (tabToClose && !tabToClose.closable) {
        return state;
      }

      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      const closedTabs = tabToClose ? [...state.closedTabs, tabToClose] : state.closedTabs;

      // If no tabs left, this shouldn't happen with proper setup
      if (newTabs.length === 0) {
        return state;
      }

      // Set new active tab
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        // Activate the tab to the left, or the first tab if closing the leftmost
        const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
        const newIndex = Math.max(0, closedIndex - 1);
        newActiveTabId = newTabs[newIndex].id;
      }

      const newState = {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        closedTabs,
      };

      // Auto-save after closing
      setTimeout(() => get().saveTabs(), 0);

      return newState;
    });
  },

  // Set the active tab
  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    get().saveTabs();
  },

  updateTab: (tabId, updates) => {
    set((state) => {
      const tabs = state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab));
      return { tabs };
    });
    get().saveTabs();
  },

  reopenLastClosedTab: () => {
    set((state) => {
      const closedTabs = [...state.closedTabs];
      const lastClosed = closedTabs.pop();
      if (!lastClosed) return state;

      if (state.tabs.some((tab) => tab.id === lastClosed.id)) {
        return { closedTabs };
      }

      const tabs = [...state.tabs, lastClosed];
      const activeTabId = lastClosed.id;
      setTimeout(() => get().saveTabs(), 0);
      return { tabs, activeTabId, closedTabs };
    });
  },

  // Close all tabs except the specified one
  closeOtherTabs: (tabId) => {
    set((state) => {
      const tabToKeep = state.tabs.find((t) => t.id === tabId);
      if (!tabToKeep) return state;

      // Only keep tabs that are either the specified tab OR non-closable
      const newTabs = state.tabs.filter(
        (t) => t.id === tabId || !t.closable
      );
      const closedTabs = [
        ...state.closedTabs,
        ...state.tabs.filter((t) => !newTabs.includes(t) && t.closable),
      ];

      // Auto-save
      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: newTabs,
        activeTabId: tabId,
        closedTabs,
      };
    });
  },

  // Close all tabs to the right of the specified one
  closeTabsToRight: (tabId) => {
    set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return state;

      const newTabs = state.tabs.filter((t, index) => {
        // Keep tab if it's to the left of or equal to the specified tab
        // OR if it's non-closable
        return index <= tabIndex || !t.closable;
      });
      const closedTabs = [
        ...state.closedTabs,
        ...state.tabs.filter((t) => !newTabs.includes(t) && t.closable),
      ];

      // Auto-save
      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: newTabs,
        activeTabId: state.activeTabId,
        closedTabs,
      };
    });
  },

  // Close all closable tabs
  closeAllTabs: () => {
    set((state) => {
      // Keep only non-closable tabs
      const newTabs = state.tabs.filter((t) => !t.closable);
      const closedTabs = [
        ...state.closedTabs,
        ...state.tabs.filter((t) => t.closable),
      ];

      // Set active tab to first available
      const newActiveTabId =
        newTabs.length > 0 ? newTabs[0].id : null;

      // Auto-save
      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        closedTabs,
      };
    });
  },

  // Move a tab from one index to another (for drag-and-drop reordering)
  moveTab: (fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex < 0 || fromIndex >= state.tabs.length) return state;
      if (toIndex < 0 || toIndex >= state.tabs.length) return state;

      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);

      // Auto-save
      setTimeout(() => get().saveTabs(), 0);

      return { tabs: newTabs };
    });
  },

  // Save tabs to localStorage
  saveTabs: () => {
    try {
      const state = get();
      // We can't serialize ComponentType, so we save minimal tab data
      const serializableTabs = state.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        icon: tab.icon,
        type: tab.type,
        closable: tab.closable,
        data: tab.data,
      }));

      const data = {
        tabs: serializableTabs,
        activeTabId: state.activeTabId,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save tabs:", error);
    }
  },

  // Load tabs from localStorage
  loadTabs: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);

      // Note: We can't restore the ComponentType from localStorage
      // The actual tab content components will be registered separately
      // This just restores the tab metadata structure
      console.log("Tab data loaded from storage:", data);
    } catch (error) {
      console.error("Failed to load tabs:", error);
    }
  },
}));
