/**
 * Global search system
 * Fast, full-text search across all content types
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, X, Clock, Star, Filter, SlidersHorizontal } from "lucide-react";

/**
 * Search result types
 */
export enum SearchResultType {
  Document = "document",
  Extract = "extract",
  Flashcard = "flashcard",
  Category = "category",
  Tag = "tag",
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content?: string;
  excerpt?: string;
  highlights?: string[];
  score: number;
  metadata?: {
    documentId?: string;
    category?: string;
    tags?: string[];
    modifiedAt?: Date;
    createdAt?: Date;
  };
}

/**
 * Search query
 */
export interface SearchQuery {
  query: string;
  types?: SearchResultType[];
  categories?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  operators?: SearchOperator[];
}

/**
 * Search operator
 */
export interface SearchOperator {
  type: "and" | "or" | "not" | "phrase" | "wildcard" | "fuzzy";
  value: string;
}

/**
 * Saved search
 */
export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Global search component
 */
export function GlobalSearch({
  onSearch,
  onResultClick,
  recentSearches = [],
  savedSearches = [],
  onSaveSearch,
}: {
  onSearch: (query: SearchQuery) => Promise<SearchResult[]>;
  onResultClick: (result: SearchResult) => void;
  recentSearches?: string[];
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string, query: SearchQuery) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    types: SearchResultType[];
    categories: string[];
    tags: string[];
  }>({
    types: [],
    categories: [],
    tags: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchQuery: SearchQuery) => {
        setIsSearching(true);
        try {
          const searchResults = await onSearch(searchQuery);
          setResults(searchResults);
          setSelectedIndex(0);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [onSearch]
  );

  // Update search when query or filters change
  useEffect(() => {
    if (query.trim()) {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        types: filters.types.length > 0 ? filters.types : undefined,
        categories: filters.categories.length > 0 ? filters.categories : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
      };
      debouncedSearch(searchQuery);
    } else {
      setResults([]);
    }
  }, [query, filters, debouncedSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        // Open on Ctrl+K or Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultClick(result);
      setIsOpen(false);
      setQuery("");
      setResults([]);
    },
    [onResultClick]
  );

  const toggleTypeFilter = useCallback((type: SearchResultType) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ types: [], categories: [], tags: [] });
  }, []);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.categories.length > 0 ||
    filters.tags.length > 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Search...</span>
        <kbd className="ml-auto px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Panel */}
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, extracts, flashcards..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded transition-colors ${
                  hasActiveFilters
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filters</span>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Type Filters */}
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground mb-1 block">
                    Content Type
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(SearchResultType).map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleTypeFilter(type)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          filters.types.includes(type)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            <div
              ref={resultsRef}
              className="max-h-96 overflow-y-auto"
            >
              {!query ? (
                <div className="p-6">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Recent
                      </h3>
                      <div className="space-y-1">
                        {recentSearches.slice(0, 5).map((search, i) => (
                          <button
                            key={i}
                            onClick={() => setQuery(search)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{search}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Saved Searches */}
                  {savedSearches.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Saved Searches
                      </h3>
                      <div className="space-y-1">
                        {savedSearches.map((saved) => (
                          <button
                            key={saved.id}
                            onClick={() => setQuery(saved.query.query)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
                          >
                            <Star className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{saved.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {saved.query.query}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : isSearching ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm">Searching...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No results found</p>
                  <p className="text-xs mt-1">Try different keywords or filters</p>
                </div>
              ) : (
                <div>
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${
                        index === selectedIndex ? "bg-muted" : ""
                      }`}
                    >
                      {/* Type Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                          result.type === SearchResultType.Document
                            ? "bg-blue-500/10 text-blue-500"
                            : result.type === SearchResultType.Extract
                            ? "bg-purple-500/10 text-purple-500"
                            : result.type === SearchResultType.Flashcard
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted"
                        }`}
                      >
                        <span className="text-xs font-semibold uppercase">
                          {result.type[0]}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.title}
                          {result.highlights && result.highlights.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({result.highlights.length} matches)
                            </span>
                          )}
                        </p>

                        {result.excerpt && (
                          <p
                            className="text-sm text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: result.excerpt }}
                          />
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          {result.metadata?.category && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                              {result.metadata.category}
                            </span>
                          )}
                          {result.metadata?.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-accent text-accent-foreground rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {Math.round(result.score * 100)}%
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">
                      ↵
                    </kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">
                      ESC
                    </kbd>
                    Close
                  </span>
                </div>
                {query && (
                  <button
                    onClick={() => {
                      if (onSaveSearch) {
                        const searchQuery: SearchQuery = {
                          query: query.trim(),
                          types: filters.types.length > 0 ? filters.types : undefined,
                        };
                        onSaveSearch(query.trim(), searchQuery);
                      }
                    }}
                    className="hover:text-foreground flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" />
                    Save search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Debounce utility
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
