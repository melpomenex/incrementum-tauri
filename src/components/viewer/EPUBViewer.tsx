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
    let retryCount = 0;
    const maxRetries = 10;

    const loadEPUB = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("EPUBViewer: Loading EPUB, fileData length:", fileData.byteLength);

        // Create book from ArrayBuffer
        const book = ePub(fileData);
        bookInstance = book;

        console.log("EPUBViewer: Book created, waiting for ready...");
        // Wait for book to be ready
        await book.ready;
        console.log("EPUBViewer: Book is ready");

        if (!mounted) return;

        // Get table of contents
        const tocData = await book.loaded.navigation;
        console.log("EPUBViewer: TOC loaded with", tocData.toc.length, "items");
        setToc(tocData.toc);
        onLoad?.(tocData.toc);

        // Initialize rendition with retry for the ref to be ready
        const initializeRendition = async (): Promise<boolean> => {
          console.log("EPUBViewer: Checking if viewerRef is available...", viewerRef.current);

          if (!viewerRef.current) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`EPUBViewer: viewerRef not ready, retry ${retryCount}/${maxRetries}...`);
              await new Promise(resolve => setTimeout(resolve, 100));
              return initializeRendition();
            } else {
              console.error("EPUBViewer: viewerRef never became available");
              return false;
            }
          }

          console.log("EPUBViewer: Initializing rendition...");
          const rendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "scrolled",
            allowScriptedContent: true,
          });

          renditionInstance = rendition;
          setRendition(rendition);

          // Display the book
          console.log("EPUBViewer: Displaying book...");
          await rendition.display();
          console.log("EPUBViewer: Book displayed successfully");

          // Force a resize to ensure proper rendering
          setTimeout(() => {
            if (rendition && mounted) {
              console.log("EPUBViewer: Forcing resize...");
              rendition.resize();
            }
          }, 100);

          if (!mounted) return true;

          // Get total locations (pages)
          await book.locations.generate(1024);

          // Enable text selection
          rendition.on("selected", (_cfiRange: any, contents: any) => {
            const selection = contents.window.getSelection();
            if (selection && selection.toString()) {
              console.log("Selected text:", selection.toString());
            }
          });

          return true;
        };

        await initializeRendition();
      } catch (err) {
        console.error("EPUBViewer: Error loading EPUB:", err);
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
    <div className="flex flex-col h-full bg-background relative">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg m-4">
          Failed to load EPUB: {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-muted-foreground">Loading EPUB...</div>
          </div>
        </div>
      )}

      {/* Always render this div so the ref is available */}
      <div
        ref={viewerRef}
        className="flex flex-1"
        style={{ opacity: isLoading ? 0 : 1 }}
      >
        <div className="flex flex-1">
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
              id="epub-viewer-area"
              className={cn(
                "flex-1 overflow-auto",
                "bg-background"
              )}
              style={{ minHeight: "600px", height: "100%" }}
            />


          </div>
        </div>
      </div>
    </div>
  );
}
