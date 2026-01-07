import { useState } from "react";
import {
  FileText,
  Search,
  ExternalLink,
  Download,
  Bookmark,
  BookmarkCheck,
  Filter,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  ArxivPaper,
  searchArxiv,
  getArxivCategoryPapers,
  getSavedPapers,
  savePaperToLibrary,
  removePaperFromLibrary,
  isPaperSaved,
  POPULAR_CATEGORIES,
  getCategoryDisplayName,
  formatAuthors,
  formatArxivDate,
  getArxivPdfUrl,
} from "../../api/arxiv";

interface ArxivBrowserProps {
  onImport?: (paper: ArxivPaper) => void;
}

export function ArxivBrowser({ onImport }: ArxivBrowserProps) {
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<ArxivPaper | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPapers, setSavedPapers] = useState(getSavedPapers());

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedCategory(null);

    try {
      const results = await searchArxiv(searchQuery, 20);
      setPapers(results);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    setSearchQuery("");
    setSelectedCategory(categoryId);

    try {
      const results = await getArxivCategoryPapers(categoryId, 20);
      setPapers(results);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleToggleSave = (paper: ArxivPaper) => {
    if (isPaperSaved(paper.id)) {
      removePaperFromLibrary(paper.id);
    } else {
      savePaperToLibrary(paper);
    }
    setSavedPapers(getSavedPapers());
  };

  const handleImportPaper = (paper: ArxivPaper) => {
    onImport?.(paper);
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            ArXiv
          </h2>
        </div>

        {/* Categories */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Categories</h3>
          <div className="space-y-1">
            {POPULAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Saved papers */}
        <div className="p-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Saved Papers ({savedPapers.length})
          </h3>
          {savedPapers.length > 0 && (
            <div className="space-y-1">
              {savedPapers.slice(0, 5).map((paper) => (
                <button
                  key={paper.id}
                  onClick={() => {
                    setSelectedPaper(paper);
                    setPapers([paper]);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors truncate"
                >
                  {paper.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search ArXiv papers..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>

          {selectedCategory && (
            <div className="mt-2 text-sm text-muted-foreground">
              Browsing: {getCategoryDisplayName(selectedCategory)}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            </div>
          )}

          {papers.length === 0 && !isLoading && !error && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">Search for papers or select a category</p>
              <p className="text-xs">
                Access millions of research papers from ArXiv
              </p>
            </div>
          )}

          <div className="divide-y divide-border">
            {papers.map((paper) => {
              const saved = isPaperSaved(paper.id);

              return (
                <div
                  key={paper.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Paper info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-medium text-foreground mb-1 cursor-pointer hover:text-primary"
                        onClick={() => setSelectedPaper(paper)}
                      >
                        {paper.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatAuthors(paper.authors)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatArxivDate(paper.published)}</span>
                        <span>•</span>
                        <span className="text-primary">
                          {getCategoryDisplayName(paper.primary_category)}
                        </span>
                      </div>
                      {paper.summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {paper.summary}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleSave(paper)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title={saved ? "Remove from saved" : "Save to library"}
                      >
                        {saved ? (
                          <BookmarkCheck className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={paper.absUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Open on ArXiv"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={getArxivPdfUrl(paper.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paper detail panel */}
        {selectedPaper && (
          <div className="h-1/2 border-t border-border bg-card overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedPaper.title}
                </h2>
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>By {formatAuthors(selectedPaper.authors)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Published {formatArxivDate(selectedPaper.published)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPaper.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                    >
                      {getCategoryDisplayName(cat)}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPaper.summary && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Abstract</h3>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedPaper.summary}
                  </p>
                </div>
              )}

              {selectedPaper.comment && (
                <div className="mb-4 p-3 bg-muted/30 rounded">
                  <p className="text-sm text-muted-foreground">
                    <strong>Comment:</strong> {selectedPaper.comment}
                  </p>
                </div>
              )}

              {selectedPaper.journal_ref && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Journal Reference:</strong> {selectedPaper.journal_ref}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={getArxivPdfUrl(selectedPaper.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
                <button
                  onClick={() => handleImportPaper(selectedPaper)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  Import to Library
                </button>
                <button
                  onClick={() => handleToggleSave(selectedPaper)}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg flex items-center gap-2 text-sm"
                >
                  {isPaperSaved(selectedPaper.id) ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-orange-500" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
