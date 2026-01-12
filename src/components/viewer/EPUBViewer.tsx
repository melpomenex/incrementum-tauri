import { useEffect, useRef, useState, useCallback } from "react";
import ePub from "epubjs";
import { cn } from "../../utils";

interface EPUBViewerProps {
  fileData: Uint8Array;
  fileName: string;
  documentId?: string;
  onLoad?: (toc: any[]) => void;
  onSelectionChange?: (text: string) => void;
}

const FONT_SIZE_KEY = "epub-font-size";
const DEFAULT_FONT_SIZE = 100;

export function EPUBViewer({
  fileData,
  fileName,
  documentId,
  onLoad,
  onSelectionChange,
}: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseInt(saved) : DEFAULT_FONT_SIZE;
  });
  const [showFontSizeControl, setShowFontSizeControl] = useState(false);

  // Save reading position to database
  const saveReadingPosition = useCallback(async (cfi: string) => {
    if (!documentId || !cfi) return;

    try {
      // Save to localStorage as fallback and for quick access
      localStorage.setItem(`epub-position-${documentId}`, cfi);

      // Also save to database through the document store/update API
      // We'll update the document's currentPage or a custom field
      console.log("EPUBViewer: Saving reading position:", cfi);
    } catch (error) {
      console.error("EPUBViewer: Failed to save position:", error);
    }
  }, [documentId]);

  // Load reading position from database
  const loadReadingPosition = useCallback((): string | null => {
    if (!documentId) return null;

    try {
      const saved = localStorage.getItem(`epub-position-${documentId}`);
      if (saved) {
        console.log("EPUBViewer: Found saved position:", saved);
        return saved;
      }
    } catch (error) {
      console.error("EPUBViewer: Failed to load position:", error);
    }
    return null;
  }, [documentId]);

  // Update font size
  const updateFontSize = useCallback((newSize: number) => {
    const clampedSize = Math.max(50, Math.min(200, newSize));
    setFontSize(clampedSize);
    localStorage.setItem(FONT_SIZE_KEY, clampedSize.toString());

    if (rendition) {
      // Apply font size and consistent styling to the rendition
      rendition.themes.default({
        body: {
          "font-size": `${clampedSize}% !important`,
          "line-height": "1.6 !important",
          "margin": "0 !important",
          "padding": "0 !important",
          "color": "inherit !important",
        },
        p: {
          "line-height": "1.6 !important",
          "margin": "1em 0 !important",
        },
        div: {
          "line-height": "inherit !important",
        },
        "*": {
          "box-sizing": "border-box !important",
          "max-width": "100% !important",
        },
      });
      rendition.themes.select("default");
    }
  }, [rendition]);

  // Increase font size
  const increaseFontSize = useCallback(() => {
    updateFontSize(fontSize + 10);
  }, [fontSize, updateFontSize]);

  // Decrease font size
  const decreaseFontSize = useCallback(() => {
    updateFontSize(fontSize - 10);
  }, [fontSize, updateFontSize]);

  // Reset font size
  const resetFontSize = useCallback(() => {
    updateFontSize(DEFAULT_FONT_SIZE);
  }, [updateFontSize]);

  useEffect(() => {
    let mounted = true;
    let bookInstance: any = null;
    let renditionInstance: any = null;
    let savePositionTimer: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 10;

    const loadEPUB = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("EPUBViewer: Loading EPUB, fileData length:", fileData.byteLength);

        // Create book from a fresh buffer to avoid detached ArrayBuffer issues
        const epubBook = ePub(fileData.slice().buffer);
        bookInstance = epubBook;
        setBook(epubBook);

        console.log("EPUBViewer: Book created, waiting for ready...");
        // Wait for book to be ready
        await epubBook.ready;
        console.log("EPUBViewer: Book is ready");

        if (!mounted) return;

        // Get table of contents
        const tocData = await epubBook.loaded.navigation;
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
          const rendition = epubBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "scrolled-doc",  // Use "scrolled-doc" for better Linux scroll support
            allowScriptedContent: true,
            manager: "default",      // Use default manager for better scroll handling
          });

          renditionInstance = rendition;
          setRendition(rendition);

          // Register hooks BEFORE displaying content
          // Try multiple hook types to ensure styles are applied
          rendition.hooks.render.register((contents: any) => {
            console.log("EPUBViewer: Render hook fired");
            // This fires when each section is rendered
          });

          // Inject global styles to override EPUB internal styles
          rendition.hooks.content.register((contents: any) => {
            console.log("EPUBViewer: Content hook fired, applying overrides...");

            // Remove any existing override styles to avoid duplicates
            const existing = contents.document.getElementById("epub-override-styles");
            if (existing) {
              existing.remove();
            }

            // Disable all EPUB stylesheets by setting them to disabled
            const links = contents.document.querySelectorAll('link[rel="stylesheet"]');
            links.forEach((link: any) => {
              link.disabled = true;
              link.remove(); // Completely remove the stylesheet element
            });
            console.log(`EPUBViewer: Disabled and removed ${links.length} EPUB stylesheets`);

            // Remove all style tags from EPUB
            const styleTags = contents.document.querySelectorAll('style:not(#epub-override-styles)');
            styleTags.forEach((tag: any) => {
              tag.remove();
            });
            console.log(`EPUBViewer: Removed ${styleTags.length} EPUB style tags`);

            // More targeted inline style cleanup - only fix specific problematic elements
            // instead of iterating through ALL elements
            const problematicTags = contents.document.querySelectorAll('div[style], p[style], span[style]');
            problematicTags.forEach((el: any) => {
              if (el.style && el.style.overflow) {
                // Preserve overflow for scrolling
                const overflow = el.style.overflow;
                el.style.overflow = overflow;
              }
            });

            // Now inject our consistent styling
            const style = contents.document.createElement("style");
            style.id = "epub-override-styles";
            style.textContent = `
              * {
                box-sizing: border-box !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
              }
              html, body {
                margin: 0 !important;
                padding: 2rem 3rem !important;
                width: 100% !important;
                height: 100% !important;
                line-height: 1.6 !important;
                color: inherit !important;
                background: transparent !important;
                max-width: 100% !important;
                overflow: hidden !important;
                /* Let epubjs handle scrolling through the scrolled-doc flow */
              }
              body {
                font-size: ${fontSize}% !important;
                padding-bottom: 80px !important;
              }
              p {
                line-height: 1.6 !important;
                margin: 1em 0 !important;
                font-size: inherit !important;
                max-width: 100% !important;
              }
              h1, h2, h3, h4, h5, h6 {
                line-height: 1.3 !important;
                margin: 1.5em 0 0.5em 0 !important;
                font-weight: 600 !important;
                font-size: inherit !important;
                max-width: 100% !important;
              }
              div, section, article, nav, aside, main, header, footer {
                line-height: inherit !important;
                margin: 0 !important;
                padding: 0 !important;
                max-width: 100% !important;
              }
              span {
                line-height: inherit !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 1em auto !important;
              }
              table {
                max-width: 100% !important;
                border-collapse: collapse !important;
                margin: 1em 0 !important;
              }
              td, th {
                padding: 0.5em !important;
                border: 1px solid currentColor !important;
              }
              ul, ol {
                margin: 1em 0 !important;
                padding-left: 2em !important;
              }
              li {
                margin: 0.5em 0 !important;
              }
              a {
                color: inherit !important;
                text-decoration: underline !important;
              }
              /* Ensure consistent text rendering */
              * {
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
            `;
            contents.document.head.appendChild(style);
            console.log("EPUBViewer: Injected override styles into content");
          });

          // Set up themes for font size control and consistent styling
          rendition.themes.register("default", {
            body: {
              "font-size": `${fontSize}% !important`,
              "line-height": "1.6 !important",
              "margin": "0 !important",
              "padding": "0 !important",
              "color": "inherit !important",
            },
            p: {
              "line-height": "1.6 !important",
              "margin": "1em 0 !important",
            },
            div: {
              "line-height": "inherit !important",
            },
            "*": {
              "box-sizing": "border-box !important",
              "max-width": "100% !important",
            },
          });
          rendition.themes.select("default");

          // Display the book at saved position or start
          console.log("EPUBViewer: Displaying book...");
          const savedPosition = loadReadingPosition();

          if (savedPosition) {
            await rendition.display(savedPosition);
            console.log("EPUBViewer: Displayed at saved position:", savedPosition);
          } else {
            await rendition.display();
            console.log("EPUBViewer: Book displayed successfully");
          }

          // Force a resize to ensure proper rendering
          setTimeout(() => {
            if (rendition && mounted) {
              console.log("EPUBViewer: Forcing resize...");
              rendition.resize();
            }
          }, 100);

          if (!mounted) return true;

          // Get total locations (pages) - use larger chunk size for better performance
          await epubBook.locations.generate(1600);

          // Save position when location changes (debounced)
          const debouncedSavePosition = () => {
            if (savePositionTimer) {
              clearTimeout(savePositionTimer);
            }
            savePositionTimer = setTimeout(() => {
              const currentLocation = rendition.currentLocation();
              if (currentLocation && currentLocation.start && mounted) {
                saveReadingPosition(currentLocation.start.cfi);
              }
            }, 1000); // Save 1 second after last movement
          };

          // Track location changes to save reading position
          rendition.on("relocated", (location: any) => {
            console.log("EPUBViewer: Relocated to:", location.start.cfi);
            debouncedSavePosition();
          });

          // Enable text selection
          rendition.on("selected", (_cfiRange: any, contents: any) => {
            const selection = contents.window.getSelection();
            if (selection && selection.toString()) {
              onSelectionChange?.(selection.toString());
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
      if (savePositionTimer) {
        clearTimeout(savePositionTimer);
      }
      if (renditionInstance) {
        renditionInstance.destroy();
      }
      if (bookInstance) {
        bookInstance.destroy();
      }
    };
  }, [fileData, onLoad, fontSize, loadReadingPosition, saveReadingPosition]);

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
    if (!rendition || !book) {
      console.warn("EPUBViewer: Cannot navigate - rendition or book not ready");
      return;
    }

    try {
      console.log("EPUBViewer: TOC clicked, href:", href);

      // Get the spine to find the correct section
      const spine = await book.loaded.spine;

      // Try to find the spine item by href
      let spineItem = spine.get(href);

      // If not found directly, try to find by searching the spine
      if (!spineItem) {
        // Search through spine items for a match
        for (const item of spine.items) {
          if (item.href === href || item.href?.endsWith?.(href) || item.url === href) {
            spineItem = item;
            break;
          }
        }
      }

      // If we found the spine item, navigate to it
      if (spineItem) {
        console.log("EPUBViewer: Found spine item, navigating to:", spineItem.href, "index:", spineItem.index);

        // Try multiple navigation methods for better Linux compatibility
        // Method 1: Use spine.goto with index (most reliable on Linux/WebKitGTK)
        try {
          if (typeof spineItem.index === 'number') {
            await spine.goto(spineItem.index);
            console.log("EPUBViewer: Successfully navigated using spine.goto with index");
            return;
          }
        } catch (e) {
          console.log("EPUBViewer: spine.goto with index failed:", e);
        }

        // Method 2: Use rendition.display with the spine href
        try {
          await rendition.display(spineItem.href);
          console.log("EPUBViewer: Successfully navigated using rendition.display");
          return;
        } catch (e) {
          console.log("EPUBViewer: rendition.display failed:", e);
        }

        // Method 3: Try navigating to the URL directly
        try {
          await rendition.display(spineItem.url || spineItem.href);
          console.log("EPUBViewer: Successfully navigated using URL");
          return;
        } catch (e) {
          console.log("EPUBViewer: URL navigation failed:", e);
        }

        console.warn("EPUBViewer: All navigation methods failed for href:", href);
        return;
      }

      // Fallback: Try to navigate to the href directly
      try {
        await rendition.display(href);
        console.log("EPUBViewer: Successfully navigated using href directly");
        return;
      } catch (e) {
        console.log("EPUBViewer: Direct href navigation failed:", e);
      }

      // Try searching through TOC to find a matching item
      const searchToc = (items: any[]): any => {
        for (const item of items) {
          if (item.href === href || item.href?.endsWith?.(href)) {
            return item;
          }
          if (item.subitems) {
            const found = searchToc(item.subitems);
            if (found) return found;
          }
        }
        return null;
      };

      const tocItem = searchToc(toc);
      if (tocItem) {
        console.log("EPUBViewer: Found TOC item, attempting navigation:", tocItem.href);
        await rendition.display(tocItem.href);
        return;
      }

      console.warn("EPUBViewer: Could not resolve TOC href:", href);
    } catch (error) {
      console.error("EPUBViewer: Error navigating to TOC item:", error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Plus to increase font size
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "k")) {
        e.preventDefault();
        increaseFontSize();
      }
      // Ctrl/Cmd + Minus to decrease font size
      else if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        decreaseFontSize();
      }
      // Ctrl/Cmd + 0 to reset font size
      else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetFontSize();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Ctrl/Cmd + Scroll to change font size
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          increaseFontSize();
        } else {
          decreaseFontSize();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const viewerElement = viewerRef.current;
    if (viewerElement) {
      viewerElement.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (viewerElement) {
        viewerElement.removeEventListener("wheel", handleWheel);
      }
    };
  }, [increaseFontSize, decreaseFontSize, resetFontSize]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg m-4">
          Failed to load EPUB: {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-muted-foreground">Loading EPUB...</div>
          </div>
        </div>
      )}

      {/* Font size control panel */}
      <div
        className={cn(
          "absolute top-4 right-16 z-30 bg-card border border-border rounded-lg shadow-lg transition-all",
          showFontSizeControl ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Font Size</div>
          <div className="flex items-center gap-2">
            <button
              onClick={decreaseFontSize}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Decrease font size (Ctrl+-)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm font-medium min-w-[50px] text-center">{fontSize}%</span>
            <button
              onClick={increaseFontSize}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Increase font size (Ctrl++)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <button
            onClick={resetFontSize}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset (Ctrl+0)
          </button>
        </div>
      </div>

      {/* Floating font size toggle button */}
      <button
        onClick={() => setShowFontSizeControl(!showFontSizeControl)}
        className="absolute top-4 right-4 z-30 p-2 bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-all"
        title="Font size settings"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>

      {/* Main content area with sidebar and viewer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Table of Contents (sibling to viewer) */}
        {toc.length > 0 && (
          <div className="w-64 border-r border-border bg-card overflow-y-auto z-10 flex-shrink-0">
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

        {/* EPUB viewer container - epubjs renders directly into this */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={viewerRef}
            className="absolute inset-0"
            style={{ opacity: isLoading ? 0 : 1 }}
          />
        </div>
      </div>

      {/* Help tooltip */}
      <div className="absolute bottom-4 left-4 z-20 text-xs text-muted-foreground bg-background/95 backdrop-blur-sm px-2 py-1 rounded border border-border shadow-sm">
        Ctrl +/-/+ to resize • Ctrl+Scroll to resize • Ctrl+0 to reset
      </div>
    </div>
  );
}
