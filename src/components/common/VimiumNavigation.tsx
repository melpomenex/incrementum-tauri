/**
 * Vimium-style keyboard navigation system
 * Provides keyboard-driven navigation and interaction
 */

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Navigation mode
 */
export enum NavigationMode {
  Normal = "normal",
  Hints = "hints",
  Find = "find",
  Mark = "mark",
}

/**
 * Link hint position
 */
export interface HintPosition {
  element: HTMLElement;
  text: string;
  rect: DOMRect;
  zIndex: number;
}

/**
 * Vimium navigation state
 */
interface VimiumState {
  mode: NavigationMode;
  hintPrefix: string;
  findQuery: string;
  marks: Map<string, HTMLElement>;
}

/**
 * Navigation key bindings
 */
export interface NavigationKeyBindings {
  toggleHints: string[];
  scrollDown: string[];
  scrollUp: string[];
  scrollLeft: string[];
  scrollRight: string[];
  scrollToTop: string[];
  scrollToBottom: string[];
  goToInput: string[];
  goBack: string[];
  goForward: string[];
  reload: string[];
  toggleFind: string[];
  closeFind: string[];
  markSet: string[];
  markGo: string[];
  focusNext: string[];
  focusPrev: string[];
  activateLink: string[];
  openInNewTab: string[];
}

/**
 * Default key bindings
 */
export const DEFAULT_KEY_BINDINGS: NavigationKeyBindings = {
  toggleHints: ["f", "F"],
  scrollDown: ["j", "ArrowDown"],
  scrollUp: ["k", "ArrowUp"],
  scrollLeft: ["h", "ArrowLeft"],
  scrollRight: ["l", "ArrowRight"],
  scrollToTop: ["gg", "G"],
  scrollToBottom: ["G"],
  goToInput: ["i"],
  goBack: ["H"],
  goForward: ["L"],
  reload: ["r", "R"],
  toggleFind: ["/"],
  closeFind: ["Escape"],
  markSet: ["m"],
  markGo: ["`"],
  focusNext: ["Tab"],
  focusPrev: ["Shift+Tab"],
  activateLink: ["Enter"],
  openInNewTab: ["Shift+Enter"],
};

/**
 * Vimium navigation hook
 */
export function useVimiumNavigation(
  enabled: boolean = true,
  keyBindings: NavigationKeyBindings = DEFAULT_KEY_BINDINGS
) {
  const stateRef = useRef<VimiumState>({
    mode: NavigationMode.Normal,
    hintPrefix: "",
    findQuery: "",
    marks: new Map(),
  });

  const hintsContainerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<NavigationMode>(NavigationMode.Normal);
  const [findQuery, setFindQuery] = useState("");
  const [findResults, setFindResults] = useState<{ count: number; current: number }>({
    count: 0,
    current: 0,
  });

  // Create hints container
  useEffect(() => {
    if (enabled && !hintsContainerRef.current) {
      const container = document.createElement("div");
      container.id = "vimium-hints-container";
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999999;
      `;
      document.body.appendChild(container);
      hintsContainerRef.current = container;
    }

    return () => {
      if (hintsContainerRef.current) {
        hintsContainerRef.current.remove();
        hintsContainerRef.current = null;
      }
    };
  }, [enabled]);

  // Get all clickable elements
  const getClickableElements = useCallback((): HTMLElement[] => {
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
      "[onclick]",
      "[role='button']",
      ".clickable",
    ];

    const elements = new Set<HTMLElement>();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el instanceof HTMLElement && isElementVisible(el)) {
          elements.add(el);
        }
      });
    });

    return Array.from(elements).sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return aRect.top - bRect.top || aRect.left - bRect.left;
    });
  }, []);

  // Check if element is visible
  const isElementVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0"
    );
  };

  // Generate hint text for element
  const generateHintText = useCallback((index: number): string => {
    const chars = "asdfghjkl;qwertyuiopzxcvbnm";
    let num = index;
    let text = "";

    do {
      text = chars[num % chars.length] + text;
      num = Math.floor(num / chars.length);
    } while (num > 0);

    return text;
  }, []);

  // Show link hints
  const showHints = useCallback(() => {
    const container = hintsContainerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const elements = getClickableElements();

    elements.forEach((element, index) => {
      const text = generateHintText(index);
      const rect = element.getBoundingClientRect();

      const hint = document.createElement("div");
      hint.className = "vimium-hint";
      hint.textContent = text;
      hint.dataset.target = text;
      hint.style.cssText = `
        position: absolute;
        left: ${rect.left}px;
        top: ${rect.top}px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
        font-family: monospace;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        pointer-events: none;
      `;

      container.appendChild(hint);
    });

    stateRef.current.mode = NavigationMode.Hints;
    stateRef.current.hintPrefix = "";
    setMode(NavigationMode.Hints);
  }, [getClickableElements, generateHintText]);

  // Hide hints
  const hideHints = useCallback(() => {
    const container = hintsContainerRef.current;
    if (container) {
      container.innerHTML = "";
    }
    stateRef.current.mode = NavigationMode.Normal;
    stateRef.current.hintPrefix = "";
    setMode(NavigationMode.Normal);
  }, []);

  // Handle hint key press
  const handleHintKeyPress = useCallback((key: string, newTab: boolean = false) => {
    const container = hintsContainerRef.current;
    if (!container) return;

    stateRef.current.hintPrefix += key;
    const prefix = stateRef.current.hintPrefix;

    // Filter hints by prefix
    const hints = container.querySelectorAll(".vimium-hint");
    let matchFound = false;

    hints.forEach((hint) => {
      const text = hint.textContent || "";
      if (text.startsWith(prefix)) {
        hint.style.background = "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
        matchFound = true;
      } else {
        hint.style.opacity = "0.3";
      }
    });

    // Check for exact match
    const exactMatch = Array.from(hints).find((h) => h.textContent === prefix);
    if (exactMatch) {
      const hintElement = exactMatch as HTMLElement;
      const targetText = hintElement.dataset.target;
      const targetElement = getClickableElements().find((el, i) => {
        return generateHintText(i) === targetText;
      });

      if (targetElement) {
        hideHints();

        if (targetElement.tagName === "A" && newTab) {
          window.open((targetElement as HTMLAnchorElement).href, "_blank");
        } else {
          targetElement.click();
        }
      }
    } else if (!matchFound) {
      // No matches, reset
      hideHints();
    }
  }, [getClickableElements, generateHintText, hideHints]);

  // Scroll in direction
  const scroll = useCallback((direction: "up" | "down" | "left" | "right", amount: number = 100) => {
    const scrollAmount = amount;
    switch (direction) {
      case "up":
        window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
        break;
      case "down":
        window.scrollBy({ top: scrollAmount, behavior: "smooth" });
        break;
      case "left":
        window.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        break;
      case "right":
        window.scrollBy({ left: scrollAmount, behavior: "smooth" });
        break;
    }
  }, []);

  // Find text on page
  const findText = useCallback((query: string, next: boolean = false) => {
    if (!query) {
      setFindResults({ count: 0, current: 0 });
      return;
    }

    const windowFind = next
      ? window.find(query, false, true)
      : window.find(query, false, false);

    if (windowFind) {
      setFindResults((prev) => ({
        count: prev.count + (next ? 0 : 1),
        current: next ? prev.current + 1 : 1,
      }));
    }
  }, []);

  // Set mark
  const setMark = useCallback((key: string) => {
    if (key.length === 1) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        stateRef.current.marks.set(key, activeElement);
      }
    }
  }, []);

  // Go to mark
  const goToMark = useCallback((key: string) => {
    const element = stateRef.current.marks.get(key);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus();
    }
  }, []);

  // Focus first input
  const focusFirstInput = useCallback(() => {
    const inputs = document.querySelectorAll(
      "input:not([disabled]), textarea:not([disabled]), [contenteditable='true']"
    );
    for (const input of inputs) {
      if (isElementVisible(input as HTMLElement)) {
        (input as HTMLElement).focus();
        break;
      }
    }
  }, []);

  // Handle keyboard event
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input (unless in specific modes)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput && stateRef.current.mode === NavigationMode.Normal) {
        return;
      }

      // Handle hint mode
      if (stateRef.current.mode === NavigationMode.Hints) {
        if (e.key === "Escape") {
          hideHints();
          e.preventDefault();
          return;
        }

        if (e.key === "Shift") return;

        const key = e.key.toLowerCase();
        const newTab = e.shiftKey;

        handleHintKeyPress(key, newTab);
        e.preventDefault();
        return;
      }

      // Handle find mode
      if (stateRef.current.mode === NavigationMode.Find) {
        if (e.key === "Escape") {
          stateRef.current.mode = NavigationMode.Normal;
          setMode(NavigationMode.Normal);
          setFindQuery("");
          e.preventDefault();
          return;
        }

        if (e.key === "Enter") {
          findText(findQuery);
          e.preventDefault();
          return;
        }

        return; // Let input handle the key
      }

      // Normal mode key bindings
      const key = e.key;

      // Hints
      if (keyBindings.toggleHints.includes(key)) {
        showHints();
        e.preventDefault();
        return;
      }

      // Scrolling
      if (keyBindings.scrollDown.includes(key)) {
        scroll("down");
        e.preventDefault();
        return;
      }

      if (keyBindings.scrollUp.includes(key)) {
        scroll("up");
        e.preventDefault();
        return;
      }

      if (keyBindings.scrollLeft.includes(key)) {
        scroll("left");
        e.preventDefault();
        return;
      }

      if (keyBindings.scrollRight.includes(key)) {
        scroll("right");
        e.preventDefault();
        return;
      }

      if (keyBindings.scrollToTop.includes(key) && e.shiftKey) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        e.preventDefault();
        return;
      }

      if (keyBindings.scrollToBottom.includes(key) && !e.shiftKey) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        e.preventDefault();
        return;
      }

      // Input focus
      if (keyBindings.goToInput.includes(key)) {
        focusFirstInput();
        e.preventDefault();
        return;
      }

      // Find
      if (keyBindings.toggleFind.includes(key)) {
        stateRef.current.mode = NavigationMode.Find;
        setMode(NavigationMode.Find);
        e.preventDefault();
        return;
      }

      // Marks
      if (e.altKey) {
        if (e.key === "m") {
          stateRef.current.mode = NavigationMode.Mark;
          setMode(NavigationMode.Mark);
          e.preventDefault();
          return;
        }
        if (stateRef.current.mode === NavigationMode.Mark) {
          setMark(key);
          stateRef.current.mode = NavigationMode.Normal;
          setMode(NavigationMode.Normal);
          e.preventDefault();
          return;
        }
      }

      if (keyBindings.markGo.includes(key) && e.key !== "`") {
        goToMark(key);
        e.preventDefault();
        return;
      }

      // Reload
      if (keyBindings.reload.includes(key)) {
        if (e.shiftKey) {
          location.reload();
        } else {
          location.reload();
        }
        e.preventDefault();
        return;
      }
    },
    [
      enabled,
      keyBindings,
      showHints,
      hideHints,
      handleHintKeyPress,
      scroll,
      findText,
      setMark,
      goToMark,
      focusFirstInput,
      findQuery,
      mode,
    ]
  );

  // Set up keyboard listener
  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    mode,
    findQuery,
    setFindQuery,
    findResults,
    showHints,
    hideHints,
    findText,
  };
}

/**
 * Find bar component for Vimium-style find
 */
export function VimiumFindBar({
  query,
  onQueryChange,
  results,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  results: { count: number; current: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999999] bg-background border border-border rounded-lg shadow-lg p-2 flex items-center gap-2">
      <span className="text-muted-foreground">/</span>
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="Find in page..."
        className="bg-transparent border-none outline-none w-64 text-foreground"
        autoFocus
      />
      {results.count > 0 && (
        <span className="text-sm text-muted-foreground">
          {results.current}/{results.count}
        </span>
      )}
      <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">ESC</kbd>
    </div>
  );
}

/**
 * Vimium navigation provider
 */
export function VimiumNavigationProvider({
  children,
  enabled = true,
  keyBindings,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  keyBindings?: NavigationKeyBindings;
}) {
  const { mode, findQuery, setFindQuery, findResults, showHints, hideHints, findText } =
    useVimiumNavigation(enabled, keyBindings);

  return (
    <>
      {children}
      {mode === NavigationMode.Find && (
        <VimiumFindBar
          query={findQuery}
          onQueryChange={setFindQuery}
          results={findResults}
          onClose={hideHints}
        />
      )}
    </>
  );
}

/**
 * Helper to check if Vimium navigation is enabled
 */
export function useVimiumEnabled() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem("vimium-enabled");
    return stored ? stored === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("vimium-enabled", String(enabled));
  }, [enabled]);

  return [enabled, setEnabled] as const;
}

/**
 * Helper to get/set custom key bindings
 */
export function useVimiumKeyBindings() {
  const [bindings, setBindings] = useState<NavigationKeyBindings>(() => {
    const stored = localStorage.getItem("vimium-bindings");
    return stored ? JSON.parse(stored) : DEFAULT_KEY_BINDINGS;
  });

  const updateBinding = useCallback((category: keyof NavigationKeyBindings, keys: string[]) => {
    setBindings((prev) => {
      const updated = { ...prev, [category]: keys };
      localStorage.setItem("vimium-bindings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetBindings = useCallback(() => {
    setBindings(DEFAULT_KEY_BINDINGS);
    localStorage.removeItem("vimium-bindings");
  }, []);

  return { bindings, updateBinding, resetBindings };
}
