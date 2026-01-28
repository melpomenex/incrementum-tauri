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
  | "web-browser"
  | "doc-qa";

export interface Tab {
  id: string;
  title: string;
  icon: string;
  type: TabType;
  content: ComponentType;
  closable: boolean;
  data?: Record<string, unknown>;
}

// Split direction for panes
export type SplitDirection = "horizontal" | "vertical";

// Pane can either contain tabs or be split into more panes
export interface TabPane {
  id: string;
  type: "tabs";
  tabIds: string[];
  activeTabId: string | null;
}

export interface SplitPane {
  id: string;
  type: "split";
  direction: SplitDirection;
  sizes: number[]; // Percentages for each child
  children: Pane[];
}

export type Pane = TabPane | SplitPane;

// Helper to create a new tab pane
export function createTabPane(tabIds: string[] = [], activeTabId: string | null = null): TabPane {
  return {
    id: generateId(),
    type: "tabs",
    tabIds,
    activeTabId,
  };
}

// Helper to create a new split pane
export function createSplitPane(
  direction: SplitDirection,
  children: Pane[],
  sizes?: number[]
): SplitPane {
  const defaultSizes = children.map(() => 100 / children.length);
  return {
    id: generateId(),
    type: "split",
    direction,
    sizes: sizes || defaultSizes,
    children,
  };
}

export interface TabsState {
  // State
  tabs: Tab[];
  rootPane: Pane;
  closedTabs: Tab[];

  // Actions
  addTab: (tab: Omit<Tab, "id">) => string;
  addTabInBackground: (tab: Omit<Tab, "id">) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  reopenLastClosedTab: () => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeAllTabs: () => void;
  moveTab: (fromIndex: number, toIndex: number, paneId?: string) => void;
  moveTabToPane: (tabId: string, fromPaneId: string, toPaneId: string, targetIndex?: number) => void;
  
  // Split actions
  splitPane: (paneId: string, tabId: string, direction: SplitDirection, side: "before" | "after") => void;
  moveTabToSplit: (tabId: string, fromPaneId: string, targetPaneId: string, direction: SplitDirection, side: "before" | "after") => void;
  resizeSplit: (splitPaneId: string, newSizes: number[]) => void;
  collapseSplit: (splitPaneId: string, childPaneId: string) => void;
  
  // Pane queries
  findPaneById: (paneId: string) => Pane | null;
  findPaneContainingTab: (tabId: string) => TabPane | null;
  getAllPaneIds: () => string[];
  getTabPaneIds: () => string[];

  // Persistence
  saveTabs: () => void;
  loadTabs: () => void;
  getDefaultTabs: () => Tab[];
}

const STORAGE_KEY = "incrementum-tabs";
const STORAGE_KEY_LAYOUT = "incrementum-layout";

// Helper to find a pane by ID recursively
function findPaneByIdRecursive(pane: Pane, paneId: string): Pane | null {
  if (pane.id === paneId) return pane;
  if (pane.type === "split") {
    for (const child of pane.children) {
      const found = findPaneByIdRecursive(child, paneId);
      if (found) return found;
    }
  }
  return null;
}

// Helper to find parent of a pane
function findParentPane(pane: Pane, targetId: string): SplitPane | null {
  if (pane.type === "split") {
    for (const child of pane.children) {
      if (child.id === targetId) return pane;
      const found = findParentPane(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Helper to find pane containing a tab
function findPaneContainingTabRecursive(pane: Pane, tabId: string): TabPane | null {
  if (pane.type === "tabs" && pane.tabIds.includes(tabId)) {
    return pane;
  }
  if (pane.type === "split") {
    for (const child of pane.children) {
      const found = findPaneContainingTabRecursive(child, tabId);
      if (found) return found;
    }
  }
  return null;
}

// Helper to collect all pane IDs
function collectPaneIds(pane: Pane, ids: string[] = []): string[] {
  ids.push(pane.id);
  if (pane.type === "split") {
    for (const child of pane.children) {
      collectPaneIds(child, ids);
    }
  }
  return ids;
}

// Helper to collect all tab pane IDs
function collectTabPaneIds(pane: Pane, ids: string[] = []): string[] {
  if (pane.type === "tabs") {
    ids.push(pane.id);
  } else if (pane.type === "split") {
    for (const child of pane.children) {
      collectTabPaneIds(child, ids);
    }
  }
  return ids;
}

// Helper to update pane in tree
function updatePaneInTree(root: Pane, paneId: string, updater: (pane: Pane) => Pane): Pane {
  if (root.id === paneId) {
    return updater(root);
  }
  if (root.type === "split") {
    return {
      ...root,
      children: root.children.map((child) => updatePaneInTree(child, paneId, updater)),
    };
  }
  return root;
}

// Helper to remove pane from tree
function removePaneFromTree(root: Pane, paneId: string): Pane | null {
  if (root.type === "split") {
    const newChildren = root.children
      .map((child) => removePaneFromTree(child, paneId))
      .filter(Boolean) as Pane[];
    
    if (newChildren.length === 0) {
      return null;
    }
    if (newChildren.length === 1) {
      // Collapse split with single child
      return newChildren[0];
    }
    
    // Recalculate sizes
    const totalSize = newChildren.reduce((sum, _, i) => sum + root.sizes[i], 0);
    const newSizes = newChildren.map((_, i) => root.sizes[i] / totalSize * 100);
    
    return { ...root, children: newChildren, sizes: newSizes };
  }
  return root;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  // Initial State
  tabs: [],
  rootPane: createTabPane(),
  closedTabs: [],

  // Get default tabs that should always be available
  getDefaultTabs: () => {
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
        // Find the pane containing this tab and activate it
        const pane = findPaneContainingTabRecursive(state.rootPane, existingTab.id);
        if (pane) {
          return {
            activeTabId: existingTab.id,
            rootPane: updatePaneInTree(state.rootPane, pane.id, (p) => ({
              ...(p as TabPane),
              activeTabId: existingTab.id,
            })),
          };
        }
        return { activeTabId: existingTab.id };
      }

      // Find the first tab pane or create one
      let targetPaneId: string;
      const findFirstTabPane = (p: Pane): TabPane | null => {
        if (p.type === "tabs") return p;
        if (p.type === "split") {
          for (const child of p.children) {
            const found = findFirstTabPane(child);
            if (found) return found;
          }
        }
        return null;
      };
      const firstPane = findFirstTabPane(state.rootPane);
      if (firstPane) {
        targetPaneId = firstPane.id;
      } else {
        // Create new root pane
        const newPane = createTabPane([id], id);
        return {
          tabs: [...state.tabs, newTab],
          rootPane: newPane,
        };
      }

      return {
        tabs: [...state.tabs, newTab],
        rootPane: updatePaneInTree(state.rootPane, targetPaneId, (p) => ({
          ...(p as TabPane),
          tabIds: [...(p as TabPane).tabIds, id],
          activeTabId: id,
        })),
      };
    });

    get().saveTabs();
    return id;
  },

  // Add a new tab in background
  addTabInBackground: (tab) => {
    const id = generateId();
    const newTab: Tab = { ...tab, id };

    set((state) => {
      const existingTab = state.tabs.find(
        (t) =>
          t.type === tab.type &&
          JSON.stringify(t.data) === JSON.stringify(tab.data)
      );

      if (existingTab) {
        return state;
      }

      // Find first tab pane
      let targetPaneId: string;
      const findFirstTabPane = (p: Pane): TabPane | null => {
        if (p.type === "tabs") return p;
        if (p.type === "split") {
          for (const child of p.children) {
            const found = findFirstTabPane(child);
            if (found) return found;
          }
        }
        return null;
      };
      const firstPane = findFirstTabPane(state.rootPane);
      if (firstPane) {
        targetPaneId = firstPane.id;
      } else {
        const newPane = createTabPane([id], null);
        return {
          tabs: [...state.tabs, newTab],
          rootPane: newPane,
        };
      }

      const targetPane = findPaneByIdRecursive(state.rootPane, targetPaneId) as TabPane;
      return {
        tabs: [...state.tabs, newTab],
        rootPane: updatePaneInTree(state.rootPane, targetPaneId, (p) => ({
          ...(p as TabPane),
          tabIds: [...(p as TabPane).tabIds, id],
          activeTabId: targetPane.activeTabId,
        })),
      };
    });

    get().saveTabs();
    return id;
  },

  // Close a tab
  closeTab: (tabId) => {
    set((state) => {
      const tabToClose = state.tabs.find((t) => t.id === tabId);
      if (tabToClose && !tabToClose.closable) {
        return state;
      }

      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      const closedTabs = tabToClose ? [...state.closedTabs, tabToClose] : state.closedTabs;

      if (newTabs.length === 0) {
        return state;
      }

      // Find and update the pane containing this tab
      const pane = findPaneContainingTabRecursive(state.rootPane, tabId);
      if (!pane) return state;

      const newTabIds = pane.tabIds.filter((id) => id !== tabId);
      let newActiveTabId = pane.activeTabId;

      if (pane.activeTabId === tabId) {
        const closedIndex = pane.tabIds.findIndex((id) => id === tabId);
        const newIndex = Math.max(0, closedIndex - 1);
        newActiveTabId = newTabIds[newIndex] || null;
      }

      // If pane is empty, remove it (will be handled by split collapse)
      let newRootPane = state.rootPane;
      if (newTabIds.length === 0) {
        newRootPane = removePaneFromTree(state.rootPane, pane.id) || createTabPane();
      } else {
        newRootPane = updatePaneInTree(state.rootPane, pane.id, (p) => ({
          ...(p as TabPane),
          tabIds: newTabIds,
          activeTabId: newActiveTabId,
        }));
      }

      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: newTabs,
        rootPane: newRootPane,
        closedTabs,
      };
    });
  },

  // Set the active tab in a specific pane
  setActiveTab: (paneId, tabId) => {
    set((state) => ({
      rootPane: updatePaneInTree(state.rootPane, paneId, (p) => ({
        ...(p as TabPane),
        activeTabId: tabId,
      })),
    }));
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

      // Find first tab pane to add to
      let targetPaneId: string;
      const findFirstTabPane = (p: Pane): TabPane | null => {
        if (p.type === "tabs") return p;
        if (p.type === "split") {
          for (const child of p.children) {
            const found = findFirstTabPane(child);
            if (found) return found;
          }
        }
        return null;
      };
      const firstPane = findFirstTabPane(state.rootPane);
      if (!firstPane) return state;
      targetPaneId = firstPane.id;

      const tabs = [...state.tabs, lastClosed];
      return {
        tabs,
        rootPane: updatePaneInTree(state.rootPane, targetPaneId, (p) => ({
          ...(p as TabPane),
          tabIds: [...(p as TabPane).tabIds, lastClosed.id],
          activeTabId: lastClosed.id,
        })),
        closedTabs,
      };
    });
    setTimeout(() => get().saveTabs(), 0);
  },

  closeOtherTabs: (tabId) => {
    set((state) => {
      const pane = findPaneContainingTabRecursive(state.rootPane, tabId);
      if (!pane) return state;

      const tabToKeep = state.tabs.find((t) => t.id === tabId);
      if (!tabToKeep) return state;

      const closableTabs = pane.tabIds.filter((id) => {
        const t = state.tabs.find((tab) => tab.id === id);
        return t?.closable && id !== tabId;
      });

      const newClosedTabs = [
        ...state.closedTabs,
        ...state.tabs.filter((t) => closableTabs.includes(t.id)),
      ];

      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: state.tabs.filter((t) => !closableTabs.includes(t.id)),
        rootPane: updatePaneInTree(state.rootPane, pane.id, (p) => ({
          ...(p as TabPane),
          tabIds: [tabId],
          activeTabId: tabId,
        })),
        closedTabs: newClosedTabs,
      };
    });
  },

  closeTabsToRight: (tabId) => {
    set((state) => {
      const pane = findPaneContainingTabRecursive(state.rootPane, tabId);
      if (!pane) return state;

      const tabIndex = pane.tabIds.findIndex((id) => id === tabId);
      const tabsToClose = pane.tabIds.slice(tabIndex + 1).filter((id) => {
        const t = state.tabs.find((tab) => tab.id === id);
        return t?.closable;
      });

      const newClosedTabs = [
        ...state.closedTabs,
        ...state.tabs.filter((t) => tabsToClose.includes(t.id)),
      ];

      setTimeout(() => get().saveTabs(), 0);

      return {
        tabs: state.tabs.filter((t) => !tabsToClose.includes(t.id)),
        rootPane: updatePaneInTree(state.rootPane, pane.id, (p) => ({
          ...(p as TabPane),
          tabIds: (p as TabPane).tabIds.filter((id) => !tabsToClose.includes(id)),
        })),
        closedTabs: newClosedTabs,
      };
    });
  },

  closeAllTabs: () => {
    set((state) => {
      const allClosableTabs = state.tabs.filter((t) => t.closable);
      const newClosedTabs = [...state.closedTabs, ...allClosableTabs];

      // Find first non-closable tab to keep
      const firstNonClosable = state.tabs.find((t) => !t.closable);
      
      setTimeout(() => get().saveTabs(), 0);

      if (firstNonClosable) {
        return {
          tabs: [firstNonClosable],
          rootPane: createTabPane([firstNonClosable.id], firstNonClosable.id),
          closedTabs: newClosedTabs,
        };
      }

      return {
        tabs: [],
        rootPane: createTabPane(),
        closedTabs: newClosedTabs,
      };
    });
  },

  moveTab: (fromIndex, toIndex, paneId) => {
    set((state) => {
      if (paneId) {
        // Move within a specific pane
        const pane = findPaneByIdRecursive(state.rootPane, paneId) as TabPane;
        if (!pane) return state;

        const newTabIds = [...pane.tabIds];
        if (fromIndex < 0 || fromIndex >= newTabIds.length) return state;
        if (toIndex < 0 || toIndex >= newTabIds.length) return state;

        const [movedTab] = newTabIds.splice(fromIndex, 1);
        newTabIds.splice(toIndex, 0, movedTab);

        setTimeout(() => get().saveTabs(), 0);

        return {
          rootPane: updatePaneInTree(state.rootPane, paneId, (p) => ({
            ...(p as TabPane),
            tabIds: newTabIds,
          })),
        };
      }
      
      // Legacy: move in global tabs array
      if (fromIndex < 0 || fromIndex >= state.tabs.length) return state;
      if (toIndex < 0 || toIndex >= state.tabs.length) return state;

      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);

      setTimeout(() => get().saveTabs(), 0);

      return { tabs: newTabs };
    });
  },

  moveTabToPane: (tabId, fromPaneId, toPaneId, targetIndex) => {
    set((state) => {
      const fromPane = findPaneByIdRecursive(state.rootPane, fromPaneId) as TabPane;
      const toPane = findPaneByIdRecursive(state.rootPane, toPaneId) as TabPane;
      
      if (!fromPane || !toPane) return state;

      // Remove from source pane
      const newFromTabIds = fromPane.tabIds.filter((id) => id !== tabId);
      let newFromActiveTabId = fromPane.activeTabId;
      if (fromPane.activeTabId === tabId) {
        const idx = fromPane.tabIds.findIndex((id) => id === tabId);
        newFromActiveTabId = newFromTabIds[Math.max(0, idx - 1)] || null;
      }

      // Add to target pane
      const newToTabIds = [...toPane.tabIds];
      const insertIndex = targetIndex !== undefined ? targetIndex : newToTabIds.length;
      newToTabIds.splice(insertIndex, 0, tabId);

      let newRootPane = updatePaneInTree(state.rootPane, fromPaneId, (p) => ({
        ...(p as TabPane),
        tabIds: newFromTabIds,
        activeTabId: newFromActiveTabId,
      }));

      newRootPane = updatePaneInTree(newRootPane, toPaneId, (p) => ({
        ...(p as TabPane),
        tabIds: newToTabIds,
        activeTabId: toPane.activeTabId || tabId,
      }));

      // Clean up empty panes
      const finalPane = findPaneByIdRecursive(newRootPane, fromPaneId) as TabPane;
      if (finalPane && finalPane.tabIds.length === 0) {
        newRootPane = removePaneFromTree(newRootPane, fromPaneId) || createTabPane();
      }

      setTimeout(() => get().saveTabs(), 0);

      return { rootPane: newRootPane };
    });
  },

  splitPane: (paneId, tabId, direction, side) => {
    set((state) => {
      const pane = findPaneByIdRecursive(state.rootPane, paneId) as TabPane;
      if (!pane) return state;

      // Create new pane with just this tab
      const newPane = createTabPane([tabId], tabId);
      
      // Remove tab from original pane
      const newTabIds = pane.tabIds.filter((id) => id !== tabId);
      const newActiveTabId = pane.activeTabId === tabId 
        ? (newTabIds[0] || null)
        : pane.activeTabId;

      const updatedOriginalPane: TabPane = {
        ...pane,
        tabIds: newTabIds,
        activeTabId: newActiveTabId,
      };

      // Create split
      const children = side === "before" 
        ? [newPane, updatedOriginalPane]
        : [updatedOriginalPane, newPane];
      const sizes = [50, 50];

      const splitPane = createSplitPane(direction, children, sizes);

      // Replace the original pane with the split
      const parent = findParentPane(state.rootPane, paneId);
      let newRootPane: Pane;
      
      if (parent) {
        newRootPane = updatePaneInTree(state.rootPane, parent.id, (p) => {
          const splitParent = p as SplitPane;
          return {
            ...splitParent,
            children: splitParent.children.map((child) =>
              child.id === paneId ? splitPane : child
            ),
          };
        });
      } else {
        newRootPane = splitPane;
      }

      setTimeout(() => get().saveTabs(), 0);

      return { rootPane: newRootPane };
    });
  },

  moveTabToSplit: (tabId, fromPaneId, targetPaneId, direction, side) => {
    set((state) => {
      const fromPane = findPaneByIdRecursive(state.rootPane, fromPaneId) as TabPane;
      const targetPane = findPaneByIdRecursive(state.rootPane, targetPaneId) as TabPane;
      
      if (!fromPane || !targetPane) return state;

      // Remove from source
      const newFromTabIds = fromPane.tabIds.filter((id) => id !== tabId);
      const newFromActiveTabId = fromPane.activeTabId === tabId
        ? (newFromTabIds[0] || null)
        : fromPane.activeTabId;

      // Create new pane for the moved tab
      const newPane = createTabPane([tabId], tabId);

      // Create split with target pane
      const children = side === "before"
        ? [newPane, targetPane]
        : [targetPane, newPane];

      const splitPane = createSplitPane(direction, children, [50, 50]);

      // Update root pane
      let newRootPane = updatePaneInTree(state.rootPane, fromPaneId, (p) => ({
        ...(p as TabPane),
        tabIds: newFromTabIds,
        activeTabId: newFromActiveTabId,
      }));

      // Replace target pane with split
      const parent = findParentPane(newRootPane, targetPaneId);
      if (parent) {
        newRootPane = updatePaneInTree(newRootPane, parent.id, (p) => {
          const splitParent = p as SplitPane;
          return {
            ...splitParent,
            children: splitParent.children.map((child) =>
              child.id === targetPaneId ? splitPane : child
            ),
          };
        });
      } else if (newRootPane.id === targetPaneId) {
        newRootPane = splitPane;
      }

      // Clean up empty source pane
      const finalFromPane = findPaneByIdRecursive(newRootPane, fromPaneId) as TabPane;
      if (finalFromPane && finalFromPane.tabIds.length === 0) {
        newRootPane = removePaneFromTree(newRootPane, fromPaneId) || createTabPane();
      }

      setTimeout(() => get().saveTabs(), 0);

      return { rootPane: newRootPane };
    });
  },

  resizeSplit: (splitPaneId, newSizes) => {
    set((state) => ({
      rootPane: updatePaneInTree(state.rootPane, splitPaneId, (p) => ({
        ...(p as SplitPane),
        sizes: newSizes,
      })),
    }));
    get().saveTabs();
  },

  collapseSplit: (splitPaneId, childPaneId) => {
    set((state) => {
      const splitPane = findPaneByIdRecursive(state.rootPane, splitPaneId) as SplitPane;
      if (!splitPane) return state;

      const childToKeep = splitPane.children.find((c) => c.id !== childPaneId);
      if (!childToKeep) return state;

      const parent = findParentPane(state.rootPane, splitPaneId);
      let newRootPane: Pane;

      if (parent) {
        newRootPane = updatePaneInTree(state.rootPane, parent.id, (p) => {
          const splitParent = p as SplitPane;
          return {
            ...splitParent,
            children: splitParent.children.map((child) =>
              child.id === splitPaneId ? childToKeep : child
            ),
          };
        });
      } else {
        newRootPane = childToKeep;
      }

      setTimeout(() => get().saveTabs(), 0);

      return { rootPane: newRootPane };
    });
  },

  findPaneById: (paneId) => {
    return findPaneByIdRecursive(get().rootPane, paneId);
  },

  findPaneContainingTab: (tabId) => {
    return findPaneContainingTabRecursive(get().rootPane, tabId);
  },

  getAllPaneIds: () => {
    return collectPaneIds(get().rootPane);
  },

  getTabPaneIds: () => {
    return collectTabPaneIds(get().rootPane);
  },

  saveTabs: () => {
    try {
      const state = get();
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
        rootPane: state.rootPane,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save tabs:", error);
    }
  },

  loadTabs: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      console.log("Tab data loaded from storage:", data);
    } catch (error) {
      console.error("Failed to load tabs:", error);
    }
  },
}));
