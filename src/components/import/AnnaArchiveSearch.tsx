import { useState } from "react";
import { Search, BookOpen, Download, Loader2, AlertCircle, FileText, ExternalLink } from "lucide-react";
import {
  searchBooks,
  downloadBook,
  getSuggestedDownloadPath,
  formatFileSize,
  getFormatDisplayName,
  type BookSearchResult,
  type BookFormat,
} from "../../api/anna-archive";

interface AnnaArchiveSearchProps {
  onImportComplete?: (path: string) => void;
  onClose?: () => void;
}

const AVAILABLE_FORMATS: BookFormat[] = ["pdf", "epub", "mobi", "azw3"];

export function AnnaArchiveSearch({ onImportComplete, onClose }: AnnaArchiveSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>("epub");
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchResults = await searchBooks(query, 20);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search books");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (book: BookSearchResult) => {
    setDownloadingBookId(book.id);

    try {
      const filename = getSuggestedDownloadPath(book, selectedFormat);
      // Use a default import directory
      const downloadPath = `/tmp/${filename}`;

      const actualPath = await downloadBook(book.id, selectedFormat, downloadPath);

      onImportComplete?.(actualPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download book");
    } finally {
      setDownloadingBookId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Search Anna's Archive</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search by title, author, ISBN..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Format Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Preferred format:</span>
        <div className="flex gap-1">
          {AVAILABLE_FORMATS.map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-3 py-1 text-xs rounded ${
                selectedFormat === format
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {getFormatDisplayName(format)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {results.length} {results.length === 1 ? "result" : "results"}
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((book) => (
              <BookResultCard
                key={book.id}
                book={book}
                selectedFormat={selectedFormat}
                isDownloading={downloadingBookId === book.id}
                onDownload={() => handleDownload(book)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {query
              ? "No results found. Try a different search term."
              : "Enter a search term to find books on Anna's Archive."}
          </p>
        </div>
      )}
    </div>
  );
}

interface BookResultCardProps {
  book: BookSearchResult;
  selectedFormat: BookFormat;
  isDownloading: boolean;
  onDownload: () => void;
}

function BookResultCard({ book, selectedFormat, isDownloading, onDownload }: BookResultCardProps) {
  return (
    <div className="bg-background border border-border rounded-md p-4 hover:bg-muted/30 transition-colors">
      <div className="flex gap-4">
        {/* Cover Image */}
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-20 h-28 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-28 bg-muted rounded flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{book.title}</h3>
          {book.author && (
            <p className="text-sm text-muted-foreground mb-1">by {book.author}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
            {book.year && <span>{book.year}</span>}
            {book.publisher && <span>• {book.publisher}</span>}
            {book.language && <span>• {book.language}</span>}
          </div>
          {book.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{book.description}</p>
          )}

          {/* Available Formats */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Formats:</span>
            <div className="flex gap-1 flex-wrap">
              {book.formats.map((format) => (
                <span
                  key={format}
                  className={`px-2 py-0.5 text-xs rounded ${
                    book.formats.includes(selectedFormat)
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getFormatDisplayName(format)}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={isDownloading || !book.formats.includes(selectedFormat)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download
                </>
              )}
            </button>
            {book.isbn && (
              <a
                href={`https://annas-archive.org/isbn/${book.isbn}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Anna's Archive
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
