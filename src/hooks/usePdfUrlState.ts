import { useEffect, useRef, useCallback } from "react";
import {
  parseStateFromUrl,
  updateUrlHash,
  pushUrlHash,
  type DocumentState,
} from "../lib/shareLink";

interface PdfState {
  pageNumber: number;
  scale: number;
  zoomMode?: "custom" | "fit-width" | "fit-page";
  scrollPercent?: number;
}

interface UsePdfUrlStateOptions {
  /** Whether to enable URL hash sync */
  enabled?: boolean;
  /** Debounce delay for hash updates (ms) */
  debounceMs?: number;
  /** Callback when URL hash state changes (e.g., from back/forward navigation) */
  onHashChange?: (state: Partial<PdfState>) => void;
}

/**
 * Hook to synchronize PDF viewer state with URL hash
 * Enables back/forward navigation and deep-linking for PDF documents
 *
 * URL format: #pos=5&zoom=1.5&scroll=25
 * - pos: page number
 * - zoom: scale value (number) or mode ("page-width", "fit-page")
 * - scroll: scroll position as percentage (0-100)
 */
export function usePdfUrlState(
  currentState: PdfState,
  options: UsePdfUrlStateOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 500,
    onHashChange,
  } = options;

  const debounceTimerRef = useRef<number | null>(null);
  const lastPushedStateRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);

  // Serialize state for comparison
  const serializeState = useCallback((state: PdfState): string => {
    return JSON.stringify({
      p: state.pageNumber,
      z: state.zoomMode === "custom" ? state.scale : state.zoomMode,
      s: state.scrollPercent !== undefined ? Math.round(state.scrollPercent) : undefined,
    });
  }, []);

  // Convert PdfState to DocumentState for URL encoding
  const toDocumentState = useCallback((state: PdfState): DocumentState => {
    const docState: DocumentState = {
      pos: state.pageNumber,
    };

    if (state.zoomMode === "custom" && state.scale !== 1.0) {
      docState.zoom = state.scale;
    } else if (state.zoomMode && state.zoomMode !== "custom") {
      docState.zoom = state.zoomMode;
    }

    if (state.scrollPercent !== undefined && state.scrollPercent > 0) {
      docState.scroll = Math.round(state.scrollPercent);
    }

    return docState;
  }, []);

  // Convert DocumentState from URL to PdfState
  const fromDocumentState = useCallback((docState: DocumentState): Partial<PdfState> => {
    const pdfState: Partial<PdfState> = {};

    if (docState.pos !== undefined) {
      pdfState.pageNumber = docState.pos;
    }

    if (docState.zoom !== undefined) {
      if (typeof docState.zoom === "number") {
        pdfState.scale = docState.zoom;
        pdfState.zoomMode = "custom";
      } else if (docState.zoom === "page-width" || docState.zoom === "fit-width") {
        pdfState.zoomMode = "fit-width";
      } else if (docState.zoom === "fit-page") {
        pdfState.zoomMode = "fit-page";
      }
    }

    if (docState.scroll !== undefined) {
      pdfState.scrollPercent = docState.scroll;
    }

    return pdfState;
  }, []);

  // Update URL hash when state changes (debounced)
  useEffect(() => {
    if (!enabled || isRestoringRef.current) return;

    const serialized = serializeState(currentState);
    if (serialized === lastPushedStateRef.current) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const docState = toDocumentState(currentState);

      // Use replaceState for continuous updates (scrolling, zooming)
      // This prevents flooding history with every scroll position
      updateUrlHash(docState, true);
      lastPushedStateRef.current = serialized;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, currentState, debounceMs, serializeState, toDocumentState]);

  // Push significant state change to history (for back/forward)
  const pushState = useCallback((state: PdfState) => {
    if (!enabled) return;

    const docState = toDocumentState(state);
    pushUrlHash(docState);
    lastPushedStateRef.current = serializeState(state);
  }, [enabled, toDocumentState, serializeState]);

  // Listen for popstate events (back/forward navigation)
  useEffect(() => {
    if (!enabled || !onHashChange) return;

    const handlePopState = () => {
      isRestoringRef.current = true;

      const docState = parseStateFromUrl();
      const pdfState = fromDocumentState(docState);

      if (Object.keys(pdfState).length > 0) {
        onHashChange(pdfState);
      }

      // Reset restoring flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, onHashChange, fromDocumentState]);

  // Parse initial state from URL on mount
  const getInitialState = useCallback((): Partial<PdfState> | null => {
    if (!enabled) return null;

    const docState = parseStateFromUrl();
    if (!docState.pos && docState.zoom === undefined && docState.scroll === undefined) {
      return null;
    }

    return fromDocumentState(docState);
  }, [enabled, fromDocumentState]);

  return {
    /** Push current state to history (for significant changes like page navigation) */
    pushState,
    /** Get initial state from URL hash (call on mount) */
    getInitialState,
    /** Whether currently restoring state from URL */
    isRestoring: isRestoringRef.current,
  };
}
