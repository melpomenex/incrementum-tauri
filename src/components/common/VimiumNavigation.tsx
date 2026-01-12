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
  Command = "command",
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
  keySequence: string;
  lastKeyTime: number;
  markMode: "set" | "go" | null;
}

export interface VimiumCommand {
  id: string;
  name: string;
  description?: string;
  action: (args: string[]) => void | Promise<void>;
  aliases?: string[];
}

export interface VimiumActions {
  goBack?: () => void;
  goForward?: () => void;
  reload?: () => void;
  openUrl?: (url: string, newTab: boolean) => void;
  nextTab?: () => void;
  previousTab?: () => void;
  firstTab?: () => void;
  lastTab?: () => void;
  closeTab?: () => void;
  restoreTab?: () => void;
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
  keyBindings: NavigationKeyBindings = DEFAULT_KEY_BINDINGS,
  commands: VimiumCommand[] = [],
  actions: VimiumActions = {}
) {
  const stateRef = useRef<VimiumState>({
    mode: NavigationMode.Normal,
    hintPrefix: "",
    findQuery: "",
    marks: new Map(),
    keySequence: "",
    lastKeyTime: 0,
    markMode: null,
  });

  const hintsContainerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<NavigationMode>(NavigationMode.Normal);
  const [findQuery, setFindQuery] = useState("");
  const [findResults, setFindResults] = useState<{ count: number; current: number }>({
    count: 0,
    current: 0,
  });
  const [commandQuery, setCommandQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);

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

  const getScrollContainer = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const activeScrollable = active.closest("[data-vimium-scroll]");
      if (activeScrollable instanceof HTMLElement) return activeScrollable;
      if (active.scrollHeight > active.clientHeight || active.scrollWidth > active.clientWidth) {
        return active;
      }
    }

    const mainContent = document.querySelector("[data-vimium-scroll]");
    if (mainContent instanceof HTMLElement) {
      return mainContent;
    }

    return document.scrollingElement || document.documentElement;
  }, []);

  // Scroll in direction
  const scroll = useCallback((direction: "up" | "down" | "left" | "right", amount: number = 100) => {
    const scrollAmount = amount;
    const container = getScrollContainer();

    const options =
      direction === "up"
        ? { top: -scrollAmount }
        : direction === "down"
          ? { top: scrollAmount }
          : direction === "left"
            ? { left: -scrollAmount }
            : { left: scrollAmount };

    if (container === document.scrollingElement || container === document.documentElement) {
      window.scrollBy({ ...options, behavior: "smooth" });
      return;
    }

    container.scrollBy({ ...options, behavior: "smooth" });
  }, [getScrollContainer]);

  // Find text on page
  const findText = useCallback((query: string, forward: boolean = true) => {
    if (!query) {
      setFindResults({ count: 0, current: 0 });
      return;
    }

    stateRef.current.findQuery = query;

    const windowFind = window.find(query, false, !forward);

    if (windowFind) {
      setFindResults((prev) => ({
        count: prev.count + (forward ? 0 : 1),
        current: forward ? prev.current + 1 : 1,
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

  const openCommandBar = useCallback(() => {
    stateRef.current.mode = NavigationMode.Command;
    setMode(NavigationMode.Command);
    setCommandQuery("");
  }, []);

  const closeCommandBar = useCallback(() => {
    stateRef.current.mode = NavigationMode.Normal;
    setMode(NavigationMode.Normal);
    setCommandQuery("");
  }, []);

  const clearKeySequence = useCallback(() => {
    stateRef.current.keySequence = "";
    stateRef.current.lastKeyTime = 0;
  }, []);

  const pushKeySequence = useCallback((key: string) => {
    const now = Date.now();
    if (now - stateRef.current.lastKeyTime > 800) {
      stateRef.current.keySequence = "";
    }
    stateRef.current.lastKeyTime = now;
    stateRef.current.keySequence = `${stateRef.current.keySequence}${key}`.slice(-2);
    return stateRef.current.keySequence;
  }, []);

  const executeCommand = useCallback((query: string) => {
    const normalized = query.trim();
    if (!normalized) return;

    const [commandName, ...args] = normalized.split(/\s+/);
    const match = commands.find((cmd) => {
      const name = cmd.name.toLowerCase();
      const aliases = cmd.aliases?.map((alias) => alias.toLowerCase()) ?? [];
      return name === commandName.toLowerCase() || aliases.includes(commandName.toLowerCase());
    });

    if (match) {
      void match.action(args);
    }
  }, [commands]);

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

      if (showHelp) {
        if (e.key === "Escape" || e.key === "?") {
          setShowHelp(false);
          e.preventDefault();
        }
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

      // Handle command mode
      if (stateRef.current.mode === NavigationMode.Command) {
        if (e.key === "Escape") {
          closeCommandBar();
          e.preventDefault();
          return;
        }

        if (e.key === "Enter") {
          executeCommand(commandQuery);
          closeCommandBar();
          e.preventDefault();
          return;
        }

        return; // Let input handle the key
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

      if (key === "?") {
        setShowHelp((prev) => !prev);
        e.preventDefault();
        return;
      }

      if (key === ":") {
        openCommandBar();
        e.preventDefault();
        return;
      }

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

      if (key === "d") {
        scroll("down", window.innerHeight * 0.5);
        e.preventDefault();
        return;
      }

      if (key === "u") {
        scroll("up", window.innerHeight * 0.5);
        e.preventDefault();
        return;
      }

      if (key === "e") {
        scroll("down", 60);
        e.preventDefault();
        return;
      }

      if (key === "y") {
        scroll("up", 60);
        e.preventDefault();
        return;
      }

      if (key === "b") {
        scroll("up", window.innerHeight);
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

      if (key === "n") {
        findText(stateRef.current.findQuery, true);
        e.preventDefault();
        return;
      }

      if (key === "N") {
        findText(stateRef.current.findQuery, false);
        e.preventDefault();
        return;
      }

      // Marks
      if (key === "m") {
        stateRef.current.mode = NavigationMode.Mark;
        setMode(NavigationMode.Mark);
        stateRef.current.markMode = "set";
        e.preventDefault();
        return;
      }

      if (key === "`") {
        stateRef.current.mode = NavigationMode.Mark;
        setMode(NavigationMode.Mark);
        stateRef.current.markMode = "go";
        e.preventDefault();
        return;
      }

      if (stateRef.current.mode === NavigationMode.Mark) {
        if (stateRef.current.markMode === "set") {
          setMark(key);
        } else if (stateRef.current.markMode === "go") {
          goToMark(key);
        }
        stateRef.current.mode = NavigationMode.Normal;
        setMode(NavigationMode.Normal);
        stateRef.current.markMode = null;
        e.preventDefault();
        return;
      }

      if (key === "J") {
        actions.nextTab?.();
        e.preventDefault();
        return;
      }

      if (key === "K") {
        actions.previousTab?.();
        e.preventDefault();
        return;
      }

      if (key === "x") {
        actions.closeTab?.();
        e.preventDefault();
        return;
      }

      if (key === "X") {
        actions.restoreTab?.();
        e.preventDefault();
        return;
      }

      if (key === "H") {
        if (actions.goBack) {
          actions.goBack();
        } else {
          window.history.back();
        }
        e.preventDefault();
        return;
      }

      if (key === "L") {
        if (actions.goForward) {
          actions.goForward();
        } else {
          window.history.forward();
        }
        e.preventDefault();
        return;
      }

      if (key === "o" || key === "O") {
        openCommandBar();
        setCommandQuery(key === "O" ? "open " : "open ");
        e.preventDefault();
        return;
      }

      if (key === "t" || key === "T") {
        openCommandBar();
        setCommandQuery(key === "T" ? "tab " : "tab ");
        e.preventDefault();
        return;
      }

      if (key === "p" || key === "P") {
        navigator.clipboard.readText().then((text) => {
          if (text) {
            if (actions.openUrl) {
              actions.openUrl(text, key === "P");
            } else {
              window.open(text, key === "P" ? "_blank" : "_self");
            }
          }
        }).catch(() => {});
        e.preventDefault();
        return;
      }

      // Reload
      if (keyBindings.reload.includes(key)) {
        if (actions.reload) {
          actions.reload();
        } else {
          window.location.reload();
        }
        e.preventDefault();
        return;
      }

      if (key === "G") {
        const container = getScrollContainer();
        if (container === document.scrollingElement || container === document.documentElement) {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        } else {
          container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        }
        e.preventDefault();
        return;
      }

      if (key.length === 1) {
        const sequence = pushKeySequence(key);
        if (sequence === "gg") {
          const container = getScrollContainer();
          if (container === document.scrollingElement || container === document.documentElement) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            container.scrollTo({ top: 0, behavior: "smooth" });
          }
          clearKeySequence();
          e.preventDefault();
          return;
        }

        if (sequence === "g0") {
          actions.firstTab?.();
          clearKeySequence();
          e.preventDefault();
          return;
        }

        if (sequence === "g$") {
          actions.lastTab?.();
          clearKeySequence();
          e.preventDefault();
          return;
        }

        if (sequence === "gi") {
          focusFirstInput();
          clearKeySequence();
          e.preventDefault();
          return;
        }

        if (sequence === "yy") {
          navigator.clipboard.writeText(window.location.href).catch(() => {});
          clearKeySequence();
          e.preventDefault();
          return;
        }
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
      commandQuery,
      executeCommand,
      openCommandBar,
      closeCommandBar,
      actions,
      pushKeySequence,
      clearKeySequence,
      getScrollContainer,
      showHelp,
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
    commandQuery,
    setCommandQuery,
    closeCommandBar,
    showHelp,
    setShowHelp,
    commands,
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

export function VimiumCommandBar({
  query,
  onQueryChange,
  onClose,
  onSubmit,
  commands,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSubmit: (query: string) => void;
  commands: VimiumCommand[];
}) {
  const filtered = commands.filter((cmd) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    const name = cmd.name.toLowerCase();
    const desc = cmd.description?.toLowerCase() ?? "";
    const aliases = cmd.aliases?.map((alias) => alias.toLowerCase()) ?? [];
    return name.includes(normalized) || desc.includes(normalized) || aliases.some((alias) => alias.includes(normalized));
  });

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999999] bg-background border border-border rounded-lg shadow-lg overflow-hidden min-w-[420px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-muted-foreground">:</span>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit(query);
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Type a command..."
          className="bg-transparent border-none outline-none w-full text-foreground"
          autoFocus
        />
        <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">ESC</kbd>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">No commands found</div>
        ) : (
          filtered.slice(0, 8).map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => onSubmit(cmd.name)}
              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
            >
              <div className="text-sm font-medium text-foreground">{cmd.name}</div>
              {cmd.description && (
                <div className="text-xs text-muted-foreground">{cmd.description}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function VimiumHelpOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999998] bg-black/50 flex items-center justify-center">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Vimium Help</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ESC
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 text-sm text-foreground">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-2">Navigation</div>
            <div>j/k/h/l — Scroll</div>
            <div>d/u — Half page</div>
            <div>g g — Top</div>
            <div>G — Bottom</div>
            <div>H/L — Back/Forward</div>
            <div>J/K — Next/Prev tab</div>
            <div>g0 / g$ — First/Last tab</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-2">Actions</div>
            <div>f/F — Link hints</div>
            <div>/ — Find</div>
            <div>n/N — Find next/prev</div>
            <div>o/t — Open (command)</div>
            <div>p/P — Open clipboard</div>
            <div>x/X — Close/Restore tab</div>
            <div>yy — Copy URL</div>
            <div>: — Command mode</div>
            <div>? — Toggle help</div>
          </div>
        </div>
      </div>
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
  commands = [],
  actions,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  keyBindings?: NavigationKeyBindings;
  commands?: VimiumCommand[];
  actions?: VimiumActions;
}) {
  const {
    mode,
    findQuery,
    setFindQuery,
    findResults,
    showHints,
    hideHints,
    findText,
    commandQuery,
    setCommandQuery,
    closeCommandBar,
    showHelp,
    setShowHelp,
    commands: commandList,
  } = useVimiumNavigation(enabled, keyBindings, commands, actions);

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
      {mode === NavigationMode.Command && (
        <VimiumCommandBar
          query={commandQuery}
          onQueryChange={setCommandQuery}
          onClose={closeCommandBar}
          onSubmit={(query) => {
            const normalized = query.trim();
            if (!normalized) {
              closeCommandBar();
              return;
            }
            const [commandName, ...args] = normalized.split(/\s+/);
            const match = commandList.find((cmd) => {
              const name = cmd.name.toLowerCase();
              const aliases = cmd.aliases?.map((alias) => alias.toLowerCase()) ?? [];
              return name === commandName.toLowerCase() || aliases.includes(commandName.toLowerCase());
            });
            if (match) {
              void match.action(args);
            }
            closeCommandBar();
          }}
          commands={commandList}
        />
      )}
      {showHelp && <VimiumHelpOverlay onClose={() => setShowHelp(false)} />}
      {enabled && mode !== NavigationMode.Normal && (
        <div className="fixed bottom-4 right-4 z-[999997] bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground shadow">
          Vimium: {mode}
        </div>
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
