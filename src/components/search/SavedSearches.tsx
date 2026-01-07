/**
 * Saved searches and search history management
 */

import { useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SearchQuery, SavedSearch } from "./GlobalSearch";

/**
 * Search history item
 */
export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
}

/**
 * Search store
 */
interface SearchStore {
  history: SearchHistoryItem[];
  saved: SavedSearch[];
  addToHistory: (query: string, resultCount: number) => void;
  clearHistory: () => void;
  removeFromHistory: (query: string) => void;
  saveSearch: (name: string, query: SearchQuery) => SavedSearch;
  unsaveSearch: (id: string) => void;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void;
}

/**
 * Max history items to keep
 */
const MAX_HISTORY_ITEMS = 50;

/**
 * Search history and saved searches store
 */
export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      history: [],
      saved: [],

      addToHistory: (query: string, resultCount: number) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.history.filter((h) => h.query !== query);

          // Add new item at start
          const newItem: SearchHistoryItem = {
            query,
            timestamp: new Date(),
            resultCount,
          };

          // Keep only MAX_HISTORY_ITEMS
          const trimmed = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

          return { history: trimmed };
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      removeFromHistory: (query: string) => {
        set((state) => ({
          history: state.history.filter((h) => h.query !== query),
        }));
      },

      saveSearch: (name: string, query: SearchQuery) => {
        const newSaved: SavedSearch = {
          id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          query,
          createdAt: new Date(),
        };

        set((state) => ({
          saved: [...state.saved, newSaved],
        }));

        return newSaved;
      },

      unsaveSearch: (id: string) => {
        set((state) => ({
          saved: state.saved.filter((s) => s.id !== id),
        }));
      },

      updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => {
        set((state) => ({
          saved: state.saved.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },
    }),
    {
      name: "search-storage",
      partialize: (state) => ({
        history: state.history.map((h) => ({
          ...h,
          timestamp: h.timestamp.toISOString(),
        })),
        saved: state.saved.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          lastUsed: s.lastUsed?.toISOString(),
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.history = state.history.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }));
          state.saved = state.saved.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            lastUsed: s.lastUsed ? new Date(s.lastUsed) : undefined,
          }));
        }
      },
    }
  )
);

/**
 * Hook to manage search history
 */
export function useSearchHistory() {
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchStore();

  const getRecentSearches = (limit: number = 10): string[] => {
    return history.slice(0, limit).map((h) => h.query);
  };

  const getPopularSearches = (limit: number = 10): string[] => {
    // Count occurrences
    const counts = new Map<string, number>();
    history.forEach((h) => {
      counts.set(h.query, (counts.get(h.query) || 0) + 1);
    });

    // Sort by count and return top
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  };

  const search = (query: string, resultCount: number) => {
    if (query.trim()) {
      addToHistory(query, resultCount);
    }
  };

  return {
    history,
    recentSearches: getRecentSearches(),
    popularSearches: getPopularSearches(),
    addSearch: search,
    clearHistory,
    removeFromHistory,
  };
}

/**
 * Hook to manage saved searches
 */
export function useSavedSearches() {
  const { saved, saveSearch, unsaveSearch, updateSavedSearch } = useSearchStore();

  const isSaved = (query: SearchQuery): boolean => {
    return saved.some(
      (s) =>
        s.query.query === query.query &&
        JSON.stringify(s.query.types) === JSON.stringify(query.types)
    );
  };

  const useSaved = (id: string) => {
    const savedSearch = saved.find((s) => s.id === id);
    if (savedSearch) {
      updateSavedSearch(id, { lastUsed: new Date() });
    }
    return savedSearch;
  };

  const renameSaved = (id: string, newName: string) => {
    updateSavedSearch(id, { name: newName });
  };

  return {
    saved,
    saveSearch,
    unsaveSearch,
    isSaved,
    useSaved,
    renameSaved,
    updateSaved: updateSavedSearch,
  };
}

/**
 * Saved search management component
 */
export function SavedSearchesManager() {
  const { saved, unsaveSearch, renameSaved } = useSavedSearches();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameSaved(id, editName);
      setEditingId(null);
      setEditName("");
    }
  };

  if (saved.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No saved searches yet</p>
        <p className="text-xs mt-1">
          Save a search to quickly access it later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {saved.map((savedSearch) => (
        <div
          key={savedSearch.id}
          className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg group"
        >
          <div className="flex-1 min-w-0">
            {editingId === savedSearch.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(savedSearch.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(savedSearch.id);
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditName("");
                  }
                }}
                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                autoFocus
              />
            ) : (
              <div>
                <p className="text-sm font-medium truncate">
                  {savedSearch.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {savedSearch.query.query}
                  {savedSearch.query.types &&
                    ` (${savedSearch.query.types.join(", ")})`}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setEditingId(savedSearch.id);
                setEditName(savedSearch.name);
              }}
              className="p-1.5 hover:bg-muted rounded"
              title="Rename"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => unsaveSearch(savedSearch.id)}
              className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded"
              title="Remove"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Search history component
 */
export function SearchHistoryManager() {
  const { history, clearHistory, removeFromHistory, recentSearches } = useSearchHistory();

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No search history yet</p>
        <p className="text-xs mt-1">
          Your recent searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Recent Searches
        </span>
        <button
          onClick={clearHistory}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Clear all
        </button>
      </div>

      {recentSearches.slice(0, 10).map((query, index) => (
        <button
          key={index}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left group"
        >
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1 text-sm truncate">{query}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromHistory(query);
            }}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </button>
      ))}
    </div>
  );
}

/**
 * Search suggestions dropdown
 */
export function SearchSuggestions({
  query,
  onSelect,
  recentSearches,
  popularSearches,
  categories,
}: {
  query: string;
  onSelect: (suggestion: string) => void;
  recentSearches: string[];
  popularSearches: string[];
  categories: string[];
}) {
  const { generateSuggestions } = await import("./SearchUtils");

  const suggestions = generateSuggestions(query, recentSearches, popularSearches, categories);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">{suggestion}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
