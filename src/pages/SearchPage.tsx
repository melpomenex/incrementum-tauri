import { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "../lib/tauri";
import {
  Search as SearchIcon,
  FileText,
  BookOpen,
  Layers,
  X,
  Clock,
  Hash,
  Folder,
  ChevronRight,
} from "lucide-react";

type SearchResultType = "document" | "extract" | "flashcard";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content?: string;
  documentTitle?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  relevance?: number;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Set<SearchResultType>>(
    new Set(["document", "extract", "flashcard"])
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, selectedFilters]);

  const performSearch = async () => {
    setIsSearching(true);

    try {
      const searchResults = await invokeCommand<SearchResult[]>("global_search", {
        query,
        filters: Array.from(selectedFilters),
      });

      setResults(searchResults);
    } catch (error) {
      // Backend search might not be implemented, use client-side fallback
      await clientSideSearch();
    } finally {
      setIsSearching(false);
    }
  };

  const clientSideSearch = async () => {
    // Fallback: search through all items client-side
    const allResults: SearchResult[] = [];

    try {
      if (selectedFilters.has("document")) {
        const documents = await invokeCommand<any[]>("get_documents");
        documents.forEach((doc: any) => {
          if (
            doc.title?.toLowerCase().includes(query.toLowerCase()) ||
            doc.category?.toLowerCase().includes(query.toLowerCase())
          ) {
            allResults.push({
              id: doc.id,
              type: "document",
              title: doc.title,
              documentTitle: doc.title,
              category: doc.category,
            });
          }
        });
      }

      if (selectedFilters.has("extract")) {
        const extracts = await invokeCommand<any[]>("get_extracts", { documentId: null });
        extracts.forEach((extract: any) => {
          if (
            extract.content?.toLowerCase().includes(query.toLowerCase())
          ) {
            allResults.push({
              id: extract.id,
              type: "extract",
              title: extract.content?.substring(0, 50) + "...",
              content: extract.content,
              documentTitle: extract.documentTitle,
              excerpt: extract.content?.substring(0, 150),
            });
          }
        });
      }

      if (selectedFilters.has("flashcard")) {
        const cards = await invokeCommand<any[]>("get_learning_items");
        cards.forEach((card: any) => {
          if (
            card.question?.toLowerCase().includes(query.toLowerCase()) ||
            card.answer?.toLowerCase().includes(query.toLowerCase())
          ) {
            allResults.push({
              id: card.id,
              type: "flashcard",
              title: card.question?.substring(0, 50) + "...",
              content: card.question,
              documentTitle: card.documentTitle,
              excerpt: card.answer,
            });
          }
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    }
  };

  const getResultIcon = (type: SearchResultType) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />;
      case "extract":
        return <BookOpen className="w-4 h-4" />;
      case "flashcard":
        return <Layers className="w-4 h-4" />;
    }
  };

  const getResultColor = (type: SearchResultType) => {
    switch (type) {
      case "document":
        return "bg-primary-500";
      case "extract":
        return "bg-accent";
      case "flashcard":
        return "bg-success";
    }
  };

  const toggleFilter = (filter: SearchResultType) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setSelectedFilters(newFilters);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Search Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto">
          {/* Search Input */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents, extracts, and flashcards..."
              className="w-full pl-12 pr-12 py-4 bg-background border border-border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5 text-foreground-secondary" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">Search in:</span>
            {(["document", "extract", "flashcard"] as SearchResultType[]).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedFilters.has(filter)
                      ? "bg-primary-100 text-primary-700 border border-primary-300"
                      : "bg-background border border-border hover:bg-muted"
                    }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {isSearching ? (
            <div className="text-center py-12 text-foreground-secondary">
              Searching...
            </div>
          ) : query && results.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-foreground-secondary opacity-50" />
              <p className="text-foreground-secondary mb-2">
                No results found for "{query}"
              </p>
              <p className="text-sm text-foreground-secondary">
                Try different keywords or adjust your filters
              </p>
            </div>
          ) : !query ? (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-foreground-secondary opacity-50" />
              <p className="text-foreground-secondary">
                Enter a search query to find content
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-foreground-secondary mb-4">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
              </div>

              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${getResultColor(
                        result.type
                      )} text-white`}
                    >
                      {getResultIcon(result.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground">
                          {highlightText(result.title, query)}
                        </h3>
                        {result.relevance && (
                          <span className="text-xs text-foreground-secondary">
                            {Math.round(result.relevance * 100)}% match
                          </span>
                        )}
                      </div>

                      {result.documentTitle && (
                        <div className="text-xs text-foreground-secondary mb-2">
                          in {highlightText(result.documentTitle, query)}
                        </div>
                      )}

                      {result.excerpt && (
                        <div className="text-sm text-foreground-secondary line-clamp-2">
                          {highlightText(result.excerpt, query)}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-secondary">
                        {result.category && (
                          <div className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            {result.category}
                          </div>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {result.tags.slice(0, 3).join(", ")}
                            {result.tags.length > 3 && "..."}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.type}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-foreground-secondary flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
