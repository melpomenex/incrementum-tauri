import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import { cn } from "../../utils";

interface EPUBViewerProps {
  fileData: ArrayBuffer;
  fileName: string;
  onLoad?: (toc: any[]) => void;
}

export function EPUBViewer({ fileData, onLoad }: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    let bookInstance: any = null;
    let renditionInstance: any = null;

    const loadEPUB = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create book from ArrayBuffer
        const book = ePub(fileData);
        bookInstance = book;

        // Wait for book to be ready
        await book.ready;

        if (!mounted) return;

        // Get table of contents
        const tocData = await book.loaded.navigation;
        setToc(tocData.toc);
        onLoad?.(tocData.toc);

        // Initialize rendition
        if (viewerRef.current) {
          const rendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
          });

          renditionInstance = rendition;
          setRendition(rendition);

          // Display the book
          await rendition.display();
          if (!mounted) return;

          // Get total locations (pages)
          await book.locations.generate(1024);

          // Enable text selection
          rendition.on("selected", (_cfiRange: any, contents: any) => {
            const selection = contents.window.getSelection();
            if (selection && selection.toString()) {
              console.log("Selected text:", selection.toString());
            }
          });
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load EPUB");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadEPUB();

    return () => {
      mounted = false;
      if (renditionInstance) {
        renditionInstance.destroy();
      }
      if (bookInstance) {
        bookInstance.destroy();
      }
    };
  }, [fileData, onLoad]);

  const handlePrevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  const handleNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const handleTocClick = async (href: string) => {
    if (rendition) {
      await rendition.display(href);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg m-4">
          Failed to load EPUB: {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading EPUB...</div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Table of Contents */}
          {toc.length > 0 && (
            <div className="w-64 border-r border-border bg-card overflow-y-auto">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Table of Contents</h3>
              </div>
              <nav className="p-2">
                {toc.map((chapter, index) => (
                  <button
                    key={index}
                    onClick={() => handleTocClick(chapter.href)}
                    className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    {chapter.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Main Viewer */}
          <div className="flex-1 flex flex-col">
            <div
              ref={viewerRef}
              className={cn(
                "flex-1 overflow-auto",
                "bg-background"
              )}
              style={{ minHeight: "500px" }}
            />

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 p-4 border-t border-border bg-card">
              <button
                onClick={handlePrevPage}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Navigate using arrows or table of contents
              </span>
              <button
                onClick={handleNextPage}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
