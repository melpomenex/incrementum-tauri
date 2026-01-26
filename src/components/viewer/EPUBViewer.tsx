import { useEffect, useRef, useState, useCallback, type MouseEvent } from "react";
import ePub from "epubjs";
import { cn } from "../../utils";
import { useThemeStore } from "../common/ThemeSystem";
import { useSettingsStore } from "../../stores/settingsStore";
import { getDeviceInfo } from "../../lib/pwa";
import { getDocumentAuto, updateDocumentProgressAuto } from "../../api/documents";
import { saveDocumentPosition, cfiPosition } from "../../api/position";

interface EPUBViewerProps {
  fileData: Uint8Array;
  fileName: string;
  documentId?: string;
  onLoad?: (toc: any[]) => void;
  onSelectionChange?: (text: string) => void;
  onContextTextChange?: (text: string) => void;
}

export function EPUBViewer({
  fileData,
  fileName,
  documentId,
  onLoad,
  onSelectionChange,
  onContextTextChange,
}: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const tocRef = useRef<any[]>([]);
  const [showFontSizeControl, setShowFontSizeControl] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");
  const selectionActiveRef = useRef(false);
  const initialDisplayCompleteRef = useRef(false);

  // Get current theme colors
  const theme = useThemeStore((state) => state.theme);
  const themeRef = useRef(theme);
  const { settings, updateSettings } = useSettingsStore();
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;
  const epubSettings = settings.documents.epubSettings;
  const fontSizeRef = useRef(epubSettings.fontSize);
  const fontFamilyRef = useRef(epubSettings.fontFamily);
  const lineHeightRef = useRef(epubSettings.lineHeight);

  const fontFamilyMap: Record<string, string> = {
    serif: "\"Iowan Old Style\", \"Charter\", \"Source Serif 4\", \"Palatino Linotype\", Palatino, Georgia, \"Times New Roman\", serif",
    "sans-serif": "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  };
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Keep fontSizeRef in sync with fontSize
  useEffect(() => {
    fontSizeRef.current = epubSettings.fontSize;
    fontFamilyRef.current = epubSettings.fontFamily;
    lineHeightRef.current = epubSettings.lineHeight;
  }, [epubSettings.fontSize, epubSettings.fontFamily, epubSettings.lineHeight]);

  // Save reading position to database
  const saveReadingPosition = useCallback(async (cfi: string) => {
    if (!documentId || !cfi) return;

    // Always save to localStorage first (works in both Tauri and web mode)
    localStorage.setItem(`epub-position-${documentId}`, cfi);

    // Then try to save to backend (may fail in web mode if endpoint doesn't exist)
    try {
      await updateDocumentProgressAuto(documentId, null, null, cfi);
    } catch (error) {
      // Fail gracefully - localStorage already has the position saved
      console.warn("EPUBViewer: Failed to save position to backend (localStorage saved):", error);
    }

    // Also save unified position
    try {
      await saveDocumentPosition(documentId, cfiPosition(cfi));
    } catch (error) {
      console.warn("EPUBViewer: Failed to save unified position:", error);
    }
  }, [documentId]);

  // Load reading position from database
  const loadReadingPosition = useCallback(async (): Promise<string | null> => {
    if (!documentId) return null;

    // First check localStorage (always available, fast)
    const localCfi = localStorage.getItem(`epub-position-${documentId}`);

    try {
      const doc = await getDocumentAuto(documentId);
      const remoteCfi = doc?.current_cfi || doc?.currentCfi;

      // Prefer remote if available and newer, otherwise use local
      if (remoteCfi) {
        console.log("EPUBViewer: Found remote saved position:", remoteCfi);
        return remoteCfi;
      }
      if (localCfi) {
        console.log("EPUBViewer: Found local saved position:", localCfi);
        return localCfi;
      }
    } catch (error) {
      // API failed - use localStorage as fallback
      console.warn("EPUBViewer: Failed to load position from backend, using localStorage");
      if (localCfi) {
        console.log("EPUBViewer: Found local saved position:", localCfi);
        return localCfi;
      }
    }
    return null;
  }, [documentId]);

  // Update font size
  const updateEpubSettings = useCallback((updates: Partial<typeof epubSettings>) => {
    updateSettings({
      documents: {
        ...settings.documents,
        epubSettings: { ...settings.documents.epubSettings, ...updates },
      },
    });
  }, [settings.documents, updateSettings]);

  const applyContentOverrides = useCallback((contents: any) => {
    const textColor = themeRef.current.colors.foreground;
    const bgColor = themeRef.current.colors.background;
    const fontFamily = fontFamilyMap[fontFamilyRef.current] || fontFamilyMap.serif;
    const contentPadding = isMobile ? "1.25rem 1rem 4.5rem" : "2rem 3rem";
    const contentMaxWidth = isMobile ? "40rem" : "100%";
    const contentMargin = isMobile ? "0 auto" : "0";

    const existing = contents.document.getElementById("epub-override-styles");
    if (existing) {
      existing.remove();
    }

    const style = contents.document.createElement("style");
    style.id = "epub-override-styles";
    style.textContent = `
      * {
        box-sizing: border-box !important;
        font-family: ${fontFamily} !important;
      }
      html, body {
        margin: 0 !important;
        padding: ${contentPadding} !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        line-height: ${lineHeightRef.current} !important;
        color: ${textColor} !important;
        background: ${bgColor} !important;
        max-width: ${contentMaxWidth} !important;
        overflow-x: hidden !important;
        overflow-y: visible !important;
        -webkit-overflow-scrolling: touch !important;
      }
      body {
        font-size: ${fontSizeRef.current}px !important;
        padding-bottom: 80px !important;
        margin: ${contentMargin} !important;
      }
      * {
        color: ${textColor} !important;
        background-color: transparent !important;
      }
      p {
        line-height: ${lineHeightRef.current} !important;
        margin: 1em 0 !important;
        font-size: inherit !important;
        max-width: 100% !important;
        color: ${textColor} !important;
      }
      h1, h2, h3, h4, h5, h6 {
        line-height: 1.3 !important;
        margin: 1.5em 0 0.5em 0 !important;
        font-weight: 600 !important;
        font-size: inherit !important;
        max-width: 100% !important;
        color: ${textColor} !important;
      }
      div, section, article, nav, aside, main, header, footer {
        line-height: inherit !important;
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        color: ${textColor} !important;
        background: transparent !important;
      }
      span {
        line-height: inherit !important;
        margin: 0 !important;
        padding: 0 !important;
        color: ${textColor} !important;
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
        border: 1px solid ${textColor} !important;
        color: ${textColor} !important;
      }
      ul, ol {
        margin: 1em 0 !important;
        padding-left: 2em !important;
      }
      li {
        margin: 0.5em 0 !important;
        color: ${textColor} !important;
      }
      a {
        color: ${themeRef.current.colors.primary} !important;
        text-decoration: underline !important;
        background-color: transparent !important;
      }
      * {
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
    `;
    contents.document.head.appendChild(style);
  }, [fontFamilyMap, isMobile]);

  const applyRenditionTheme = useCallback(() => {
    if (!rendition) return;

    const textColor = themeRef.current.colors.foreground;
    const fontFamily = fontFamilyMap[fontFamilyRef.current] || fontFamilyMap.serif;
    rendition.themes.default({
      body: {
        "font-size": `${fontSizeRef.current}px !important`,
        "line-height": `${lineHeightRef.current} !important`,
        "margin": "0 !important",
        "padding": "0 !important",
        "color": `${textColor} !important`,
        "background": `${themeRef.current.colors.background} !important`,
        "font-family": `${fontFamily} !important`,
      },
      p: {
        "line-height": `${lineHeightRef.current} !important`,
        "margin": "1em 0 !important",
        "color": `${textColor} !important`,
      },
      "*": {
        "color": `${textColor} !important`,
        "background-color": "transparent !important",
        "box-sizing": "border-box !important",
        "max-width": "100% !important",
      },
    });
    rendition.themes.select("default");

    try {
      rendition.getContents().forEach((contents: any) => {
        applyContentOverrides(contents);
      });
    } catch {
      // Ignore if contents are not ready yet
    }
  }, [applyContentOverrides, fontFamilyMap, rendition]);

  // Update font size
  const updateFontSize = useCallback((newSize: number) => {
    const clampedSize = Math.max(12, Math.min(32, newSize));
    updateEpubSettings({ fontSize: clampedSize });
  }, [updateEpubSettings]);

  const updateLineHeight = useCallback((newHeight: number) => {
    const clampedHeight = Math.max(1.2, Math.min(2.2, newHeight));
    updateEpubSettings({ lineHeight: parseFloat(clampedHeight.toFixed(2)) });
  }, [updateEpubSettings]);

  const updateFontFamily = useCallback((fontFamily: "serif" | "sans-serif" | "monospace") => {
    updateEpubSettings({ fontFamily });
  }, [updateEpubSettings]);

  // Increase font size
  const increaseFontSize = useCallback(() => {
    updateFontSize(epubSettings.fontSize + 1);
  }, [epubSettings.fontSize, updateFontSize]);

  // Decrease font size
  const decreaseFontSize = useCallback(() => {
    updateFontSize(epubSettings.fontSize - 1);
  }, [epubSettings.fontSize, updateFontSize]);

  // Reset font size
  const resetFontSize = useCallback(() => {
    updateFontSize(16);
  }, [updateFontSize]);

  // ResizeObserver to handle container resize (e.g., when assistant panel is resized)
  useEffect(() => {
    if (!rendition || !viewerRef.current) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const resizeObserver = new ResizeObserver(() => {
      // Skip resize events during initial load to prevent blank page
      if (!initialDisplayCompleteRef.current) {
        console.log("EPUBViewer: Skipping resize during initial load");
        return;
      }
      // Debounce resize calls to avoid excessive re-renders
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        if (rendition) {
          console.log("EPUBViewer: Container resized, calling rendition.resize()");
          rendition.resize();
        }
      }, 150);
    });

    resizeObserver.observe(viewerRef.current);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, [rendition]);

  useEffect(() => {
    let mounted = true;
    let bookInstance: any = null;
    let renditionInstance: any = null;
    let savePositionTimer: ReturnType<typeof setTimeout> | null = null;
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
        tocRef.current = tocData.toc;
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
              throw new Error("Failed to initialize EPUB viewer - container not available. Please try reopening the document.");
            }
          }

          // Check if container has dimensions (required for epubjs)
          const containerRect = viewerRef.current.getBoundingClientRect();
          if (containerRect.width === 0 || containerRect.height === 0) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`EPUBViewer: Container has no dimensions (${containerRect.width}x${containerRect.height}), retry ${retryCount}/${maxRetries}...`);
              await new Promise(resolve => setTimeout(resolve, 100));
              return initializeRendition();
            } else {
              console.error("EPUBViewer: Container never got dimensions");
              throw new Error("Failed to initialize EPUB viewer - container has no size. Please try resizing the window.");
            }
          }

          console.log("EPUBViewer: Initializing rendition...");
          const rendition = epubBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            flow: "scrolled",
            allowScriptedContent: true,
            manager: "continuous",
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
            applyContentOverrides(contents);
            const selectionHandler = () => handleSelectionChange(contents);
            contents.document.addEventListener("selectionchange", selectionHandler);
            contents.document.addEventListener("mouseup", selectionHandler);
            contents.document.addEventListener("touchend", selectionHandler);
            console.log("EPUBViewer: Injected override styles into content");
          });

          // Set up themes for font size control and consistent styling
          rendition.themes.register("default", {});
          applyRenditionTheme();

          // Display the book at saved position or start
          console.log("EPUBViewer: Displaying book...");
          const savedPosition = await loadReadingPosition();

          if (savedPosition) {
            await rendition.display(savedPosition);
            console.log("EPUBViewer: Displayed at saved position:", savedPosition);
          } else {
            await rendition.display();
            console.log("EPUBViewer: Book displayed successfully");
          }

          if (onContextTextChange) {
            const maxTokens = settings.ai.maxTokens && settings.ai.maxTokens > 0 ? settings.ai.maxTokens : 2000;
            const maxChars = maxTokens * 4;
            const extractContext = async () => {
              try {
                const spine = await epubBook.loaded.spine;
                let combined = "";

                for (const item of spine.items) {
                  if (!mounted || combined.length >= maxChars) break;
                  try {
                    if (item.load) {
                      await item.load(epubBook.load.bind(epubBook));
                    }
                    const text = item.document?.body?.textContent?.trim();
                    if (text) {
                      combined += (combined ? "\n\n" : "") + text;
                    }
                  } finally {
                    try {
                      if (item.unload) {
                        item.unload();
                      }
                    } catch {
                      // ignore unload errors
                    }
                  }
                }

                if (mounted) {
                  onContextTextChange(combined.slice(0, maxChars));
                }
              } catch (err) {
                console.warn("EPUBViewer: Failed to extract context text:", err);
              }
            };

            setTimeout(() => {
              void extractContext();
            }, 0);
          }

          // Mark initial display as complete after a delay to allow content to render
          // This prevents resize events from causing blank page issues
          setTimeout(() => {
            if (mounted) {
              initialDisplayCompleteRef.current = true;
              console.log("EPUBViewer: Initial display complete, resize events now enabled");
              // Force a resize to ensure proper rendering after content is stable
              if (rendition) {
                rendition.resize();
              }
            }
          }, 500);

          if (!mounted) return true;

          // Generate locations in the background to avoid blocking initial render
          const locationChunkSize = isMobile ? 800 : 1200;
          void epubBook.locations.generate(locationChunkSize).catch((err: unknown) => {
            console.warn("EPUBViewer: Failed to generate locations:", err);
          });

          const updateProgress = (location: any) => {
            if (!location || !location.start || !epubBook.locations) return;
            try {
              const percent = epubBook.locations.percentageFromCfi(location.start.cfi);
              if (typeof percent === "number" && !Number.isNaN(percent)) {
                setProgressPercent(Math.round(percent * 100));
              }
            } catch {
              // Ignore progress calculation errors
            }
          };

          const resolveChapterLabel = (href: string | undefined) => {
            if (!href) return "";
            const searchToc = (items: any[]): string | null => {
              for (const item of items) {
                if (item.href === href || item.href?.endsWith?.(href)) {
                  return item.label;
                }
                if (item.subitems) {
                  const found = searchToc(item.subitems);
                  if (found) return found;
                }
              }
              return null;
            };
            return searchToc(tocRef.current) || "";
          };

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
            updateProgress(location);
            const chapter = resolveChapterLabel(location.start?.href || location.start?.page);
            if (chapter) {
              setCurrentChapter(chapter);
            }
          });

          // Enable text selection
          rendition.on("selected", (_cfiRange: any, contents: any) => {
            const selection = contents.window.getSelection();
            if (selection && selection.toString()) {
              selectionActiveRef.current = true;
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
        const location = renditionInstance.currentLocation?.();
        const cfi = location?.start?.cfi;
        if (cfi) {
          void saveReadingPosition(cfi);
        }
      }
      if (renditionInstance) {
        renditionInstance.destroy();
      }
      if (bookInstance) {
        bookInstance.destroy();
      }
    };
    // Note: onLoad is intentionally excluded from deps - it's a callback that
    // shouldn't trigger reloading the EPUB, only fileData changes should
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData, documentId, loadReadingPosition, onContextTextChange, saveReadingPosition, settings.ai.maxTokens]);

  // Re-apply styles when settings or theme change
  useEffect(() => {
    applyRenditionTheme();
  }, [applyRenditionTheme, epubSettings.fontFamily, epubSettings.fontSize, epubSettings.lineHeight, theme]);

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
      const normalizeHref = (value: string) =>
        value.replace(/^\.?\//, "").split("#")[0];
      const [rawPath, rawFragment] = href.split("#");
      const normalizedPath = normalizeHref(rawPath);

      // Get the spine to find the correct section
      const spine = await book.loaded.spine;

      // Try to find the spine item by href
      let spineItem = spine.get(normalizedPath);

      // If not found directly, try to find by searching the spine
      if (!spineItem) {
        // Search through spine items for a match
        for (const item of spine.items) {
          const itemHref = normalizeHref(item.href || "");
          if (itemHref === normalizedPath || itemHref?.endsWith?.(normalizedPath)) {
            spineItem = item;
            break;
          }
        }
      }

      // If we found the spine item, navigate to it
      if (spineItem) {
        const targetHref = rawFragment ? `${spineItem.href}#${rawFragment}` : spineItem.href;
        console.log("EPUBViewer: Found spine item, navigating to:", targetHref, "index:", spineItem.index);

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
          await rendition.display(targetHref);
          console.log("EPUBViewer: Successfully navigated using rendition.display");
          return;
        } catch (e) {
          console.log("EPUBViewer: rendition.display failed:", e);
        }

        // Method 3: Try navigating to the URL directly
        try {
          await rendition.display(spineItem.url || targetHref);
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
        await rendition.display(rawFragment ? `${normalizedPath}#${rawFragment}` : normalizedPath);
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
        const tocPath = normalizeHref(tocItem.href || "");
        await rendition.display(tocPath || tocItem.href);
        return;
      }

      console.warn("EPUBViewer: Could not resolve TOC href:", href);
    } catch (error) {
      console.error("EPUBViewer: Error navigating to TOC item:", error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (isMobile) return;
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
  }, [decreaseFontSize, increaseFontSize, isMobile, resetFontSize]);

  const handleReaderTap = (event: MouseEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if ((event.target as HTMLElement).closest('[data-chrome-control="true"]')) {
      return;
    }
    if (selectionActiveRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const zone = x / rect.width;

    if (zone < 0.33) {
      handlePrevPage();
      return;
    }
    if (zone > 0.66) {
      handleNextPage();
      return;
    }

    setChromeVisible((prev) => !prev);
  };

  const handleSelectionChange = useCallback((contents: any) => {
    const selection = contents.window.getSelection();
    const hasSelection = !!selection && selection.toString().trim().length > 0;
    selectionActiveRef.current = hasSelection;
    if (!hasSelection) {
      onSelectionChange?.("");
    }
  }, [onSelectionChange]);

  return (
    <div
      className="flex flex-col h-full bg-background relative overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
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

      {!isMobile && (
        <>
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
                <span className="text-sm font-medium min-w-[50px] text-center">{epubSettings.fontSize}px</span>
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
        </>
      )}

      {isMobile && (
        <>
          {/* Mobile chrome */}
          <div
            className={cn(
              "absolute left-0 right-0 top-0 z-40 transition-all",
              chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="mx-3 mt-3 rounded-2xl bg-background/95 backdrop-blur border border-border shadow-lg">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{fileName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {currentChapter || "Reading"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-chrome-control="true"
                    onClick={() => setShowTocDrawer(true)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground"
                  >
                    TOC
                  </button>
                  <button
                    type="button"
                    data-chrome-control="true"
                    onClick={() => setShowSettingsSheet(true)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground"
                  >
                    Aa
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "absolute left-0 right-0 bottom-0 z-40 transition-all",
              chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="mx-3 mb-3 rounded-2xl bg-background/95 backdrop-blur border border-border shadow-lg">
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progressPercent}%</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={handlePrevPage}
                      className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={handleNextPage}
                      className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground"
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile TOC drawer */}
          {showTocDrawer && (
            <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={() => setShowTocDrawer(false)}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-border bg-card max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                  <div className="text-sm font-semibold text-foreground">Table of Contents</div>
                  <button
                    type="button"
                    data-chrome-control="true"
                    onClick={() => setShowTocDrawer(false)}
                    className="text-sm text-muted-foreground px-3 py-2 min-h-[44px]"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {toc.map((chapter, index) => (
                    <button
                      key={index}
                      data-chrome-control="true"
                      onClick={() => {
                        handleTocClick(chapter.href);
                        setShowTocDrawer(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-foreground border-b border-border/40 hover:bg-muted transition-colors min-h-[48px]"
                    >
                      {chapter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile settings sheet */}
          {showSettingsSheet && (
            <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={() => setShowSettingsSheet(false)}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-border bg-card p-4 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">Reading Settings</div>
                  <button
                    type="button"
                    data-chrome-control="true"
                    onClick={() => setShowSettingsSheet(false)}
                    className="text-sm text-muted-foreground px-3 py-2 min-h-[44px]"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">Font Size</div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={decreaseFontSize}
                      className="px-4 py-3 text-sm rounded-full border border-border bg-card text-foreground min-w-[60px] min-h-[44px] hover:bg-muted transition-colors"
                    >
                      A-
                    </button>
                    <div className="text-base font-medium text-foreground min-w-[60px] text-center">{epubSettings.fontSize}px</div>
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={increaseFontSize}
                      className="px-4 py-3 text-sm rounded-full border border-border bg-card text-foreground min-w-[60px] min-h-[44px] hover:bg-muted transition-colors"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">Line Height</div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={() => updateLineHeight(epubSettings.lineHeight - 0.1)}
                      className="px-4 py-3 text-sm rounded-full border border-border bg-card text-foreground min-w-[60px] min-h-[44px] hover:bg-muted transition-colors"
                    >
                      -
                    </button>
                    <div className="text-base font-medium text-foreground min-w-[60px] text-center">{epubSettings.lineHeight.toFixed(2)}</div>
                    <button
                      type="button"
                      data-chrome-control="true"
                      onClick={() => updateLineHeight(epubSettings.lineHeight + 0.1)}
                      className="px-4 py-3 text-sm rounded-full border border-border bg-card text-foreground min-w-[60px] min-h-[44px] hover:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">Font</div>
                  <div className="flex items-center gap-2">
                    {(["serif", "sans-serif", "monospace"] as const).map((family) => (
                      <button
                        key={family}
                        type="button"
                        data-chrome-control="true"
                        onClick={() => updateFontFamily(family)}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-full border",
                          epubSettings.fontFamily === family
                            ? "border-primary text-primary"
                            : "border-border text-foreground"
                        )}
                      >
                        {family === "sans-serif" ? "Sans" : family === "serif" ? "Serif" : "Mono"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main content area with sidebar and viewer */}
      <div className="flex flex-1 overflow-hidden" onClick={handleReaderTap}>
        {/* Sidebar - Table of Contents (sibling to viewer) */}
        {!isMobile && toc.length > 0 && (
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
      {!isMobile && (
        <div className="absolute bottom-4 left-4 z-20 text-xs text-muted-foreground bg-background/95 backdrop-blur-sm px-2 py-1 rounded border border-border shadow-sm">
          Ctrl +/-/+ to resize • Ctrl+Scroll to resize • Ctrl+0 to reset
        </div>
      )}
    </div>
  );
}
