/**
 * Keyboard shortcut customization system
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Keyboard key combination
 */
export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Command on Mac, Windows key on Windows
}

/**
 * Keyboard shortcut action
 */
export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  defaultCombo: KeyCombo;
  currentCombo?: KeyCombo;
  editable?: boolean;
}

/**
 * Shortcut categories
 */
export enum ShortcutCategory {
  Navigation = "Navigation",
  Editing = "Editing",
  View = "View",
  Review = "Review",
  Documents = "Documents",
  Flashcards = "Flashcards",
  General = "General",
}

/**
 * Default shortcuts
 */
export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  // Navigation
  {
    id: "nav.forward",
    name: "Go Forward",
    description: "Navigate to next page",
    category: ShortcutCategory.Navigation,
    defaultCombo: { key: "ArrowRight", alt: true },
  },
  {
    id: "nav.back",
    name: "Go Back",
    description: "Navigate to previous page",
    category: ShortcutCategory.Navigation,
    defaultCombo: { key: "ArrowLeft", alt: true },
  },
  {
    id: "nav.up",
    name: "Navigate Up",
    description: "Navigate up in hierarchy",
    category: ShortcutCategory.Navigation,
    defaultCombo: { key: "ArrowUp", alt: true },
  },
  {
    id: "nav.command-palette",
    name: "Open Command Palette",
    description: "Quickly access commands",
    category: ShortcutCategory.Navigation,
    defaultCombo: { key: "k", ctrl: true, meta: true },
  },

  // Editing
  {
    id: "edit.new-document",
    name: "New Document",
    description: "Create a new document",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "n", ctrl: true, meta: true },
  },
  {
    id: "edit.new-extract",
    name: "New Extract",
    description: "Create a new extract",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "e", ctrl: true, meta: true },
  },
  {
    id: "edit.new-flashcard",
    name: "New Flashcard",
    description: "Create a new flashcard",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "f", ctrl: true, shift: true, meta: true },
  },
  {
    id: "edit.save",
    name: "Save",
    description: "Save current changes",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "s", ctrl: true, meta: true },
  },
  {
    id: "edit.undo",
    name: "Undo",
    description: "Undo last action",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "z", ctrl: true, meta: true },
  },
  {
    id: "edit.redo",
    name: "Redo",
    description: "Redo last action",
    category: ShortcutCategory.Editing,
    defaultCombo: { key: "z", ctrl: true, shift: true, meta: true },
  },

  // View
  {
    id: "view.zoom-in",
    name: "Zoom In",
    description: "Increase zoom level",
    category: ShortcutCategory.View,
    defaultCombo: { key: "=", ctrl: true, meta: true },
  },
  {
    id: "view.zoom-out",
    name: "Zoom Out",
    description: "Decrease zoom level",
    category: ShortcutCategory.View,
    defaultCombo: { key: "-", ctrl: true, meta: true },
  },
  {
    id: "view.fullscreen",
    name: "Toggle Fullscreen",
    description: "Toggle fullscreen mode",
    category: ShortcutCategory.View,
    defaultCombo: { key: "f11", ctrl: false, meta: false },
  },
  {
    id: "view.sidebar",
    name: "Toggle Sidebar",
    description: "Toggle sidebar visibility",
    category: ShortcutCategory.View,
    defaultCombo: { key: "b", ctrl: true, meta: true },
  },

  // Review
  {
    id: "review.start",
    name: "Start Review",
    description: "Begin review session",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "r", ctrl: true, meta: true },
  },
  {
    id: "review.again",
    name: "Rate Again",
    description: "Rate card as Again",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "1" },
  },
  {
    id: "review.hard",
    name: "Rate Hard",
    description: "Rate card as Hard",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "2" },
  },
  {
    id: "review.good",
    name: "Rate Good",
    description: "Rate card as Good",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "3" },
  },
  {
    id: "review.easy",
    name: "Rate Easy",
    description: "Rate card as Easy",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "4" },
  },
  {
    id: "review.skip",
    name: "Skip Card",
    description: "Skip current card",
    category: ShortcutCategory.Review,
    defaultCombo: { key: "s" },
  },

  // Documents
  {
    id: "doc.import",
    name: "Import Document",
    description: "Import a document",
    category: ShortcutCategory.Documents,
    defaultCombo: { key: "o", ctrl: true, meta: true },
  },
  {
    id: "doc.search",
    name: "Search Documents",
    description: "Search through documents",
    category: ShortcutCategory.Documents,
    defaultCombo: { key: "f", ctrl: true, meta: true },
  },
  {
    id: "doc.next",
    name: "Next Document",
    description: "Go to next document",
    category: ShortcutCategory.Documents,
    defaultCombo: { key: "]", ctrl: true },
  },
  {
    id: "doc.prev",
    name: "Previous Document",
    description: "Go to previous document",
    category: ShortcutCategory.Documents,
    defaultCombo: { key: "[", ctrl: true },
  },

  // General
  {
    id: "gen.screenshot",
    name: "Capture Screenshot",
    description: "Capture a screenshot with selection",
    category: ShortcutCategory.General,
    defaultCombo: { key: "s", ctrl: true, shift: true, meta: true },
  },
  {
    id: "gen.settings",
    name: "Open Settings",
    description: "Open settings page",
    category: ShortcutCategory.General,
    defaultCombo: { key: ",", ctrl: true, meta: true },
  },
  {
    id: "gen.help",
    name: "Show Help",
    description: "Show keyboard shortcuts",
    category: ShortcutCategory.General,
    defaultCombo: { key: "?" },
  },
  {
    id: "gen.quit",
    name: "Quit",
    description: "Quit application",
    category: ShortcutCategory.General,
    defaultCombo: { key: "q", ctrl: true, meta: true },
  },
];

/**
 * Shortcut store
 */
interface ShortcutStore {
  shortcuts: ShortcutAction[];
  updateShortcut: (id: string, combo: KeyCombo) => void;
  resetShortcut: (id: string) => void;
  resetAll: () => void;
  exportShortcuts: () => string;
  importShortcuts: (json: string) => boolean;
}

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,

      updateShortcut: (id, combo) => {
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id && s.editable !== false ? { ...s, currentCombo: combo } : s
          ),
        }));
      },

      resetShortcut: (id) => {
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, currentCombo: undefined } : s
          ),
        }));
      },

      resetAll: () => {
        set({ shortcuts: DEFAULT_SHORTCUTS });
      },

      exportShortcuts: () => {
        const customShortcuts = get().shortcuts
          .filter((s) => s.currentCombo)
          .map((s) => ({ id: s.id, combo: s.currentCombo }));
        return JSON.stringify(customShortcuts, null, 2);
      },

      importShortcuts: (json) => {
        try {
          const imported = JSON.parse(json);
          if (!Array.isArray(imported)) return false;

          set((state) => ({
            shortcuts: state.shortcuts.map((s) => {
              const importedShortcut = imported.find((i: any) => i.id === s.id);
              return importedShortcut
                ? { ...s, currentCombo: importedShortcut.combo }
                : s;
            }),
          }));
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "shortcut-storage",
    }
  )
);

/**
 * Get current combo for a shortcut
 */
export function getShortcutCombo(id: string): KeyCombo | null {
  const shortcuts = useShortcutStore.getState().shortcuts;
  const shortcut = shortcuts.find((s) => s.id === id);
  return shortcut?.currentCombo || shortcut?.defaultCombo || null;
}

/**
 * Format key combo for display
 */
export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (combo.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (combo.alt) parts.push(isMac ? "⌥" : "Alt");
  if (combo.shift) parts.push(isMac ? "⇧" : "Shift");
  if (combo.meta) parts.push(isMac ? "⌘" : "⊞");

  // Format key
  let key = combo.key;
  if (key === " ") key = "Space";
  if (key.startsWith("arrow")) key = key.charAt(5).toUpperCase() + key.slice(6);
  else key = key.charAt(0).toUpperCase() + key.slice(1);

  parts.push(key);

  return isMac ? parts.join("") : parts.join("+");
}

/**
 * Check if keyboard event matches key combo
 */
export function eventMatchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const key = event.key.toLowerCase();
  const comboKey = combo.key.toLowerCase();

  return (
    key === comboKey &&
    !!event.ctrlKey === !!combo.ctrl &&
    !!event.altKey === !!combo.alt &&
    !!event.shiftKey === !!combo.shift &&
    !!event.metaKey === !!combo.meta
  );
}

/**
 * Hook to use keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const handlersRef = useRef<Map<string, (e: KeyboardEvent) => void>>(new Map());

  // Register shortcut handler
  const registerShortcut = useCallback((id: string, handler: (e: KeyboardEvent) => void) => {
    handlersRef.current.set(id, handler);
  }, []);

  // Unregister shortcut handler
  const unregisterShortcut = useCallback((id: string) => {
    handlersRef.current.delete(id);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const combo = shortcut.currentCombo || shortcut.defaultCombo;
        if (eventMatchesCombo(e, combo)) {
          const handler = handlersRef.current.get(shortcut.id);
          if (handler) {
            e.preventDefault();
            handler(e);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  return {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
  };
}

/**
 * Hook for a specific shortcut
 */
export function useShortcut(id: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const combo = getShortcutCombo(id);
      if (combo && eventMatchesCombo(e, combo)) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [id, handler, enabled]);
}

/**
 * Shortcut recording hook
 */
export function useShortcutRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState<KeyCombo | null>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedCombo(null);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const combo: KeyCombo = {
        key: e.key,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      };

      setRecordedCombo(combo);
      setIsRecording(false);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isRecording]);

  return {
    isRecording,
    recordedCombo,
    startRecording,
    stopRecording,
  };
}

/**
 * Keyboard shortcuts help component
 */
export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = useShortcutStore((state) => state.shortcuts);

  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.name}</span>
                    <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded font-mono">
                      {formatKeyCombo(shortcut.currentCombo || shortcut.defaultCombo)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Press{" "}
            <kbd className="px-1 py-0.5 bg-background border border-border rounded font-mono">?</kbd>{" "}
            to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
}
