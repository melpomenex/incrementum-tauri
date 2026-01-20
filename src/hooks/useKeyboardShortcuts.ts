import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  handler: (event: KeyboardEvent) => void;
  disabled?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

export function formatShortcut(shortcut: Omit<KeyboardShortcut, "handler" | "description">): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push(isMac ? "⌃" : "Ctrl");
  if (shortcut.metaKey) parts.push(isMac ? "⌘" : "Win");
  if (shortcut.shiftKey) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.altKey) parts.push(isMac ? "⌥" : "Alt");
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}

export function useKeyboardShortcuts(shortcutGroups: ShortcutGroup[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contentEditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      for (const group of shortcutGroups) {
        for (const shortcut of group.shortcuts) {
          if (shortcut.disabled) continue;

          const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
          const ctrlMatch = event.ctrlKey === (shortcut.ctrlKey || false);
          const metaMatch = event.metaKey === (shortcut.metaKey || false);
          const shiftMatch = event.shiftKey === (shortcut.shiftKey || false);
          const altMatch = event.altKey === (shortcut.altKey || false);

          if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
            event.preventDefault();
            event.stopPropagation();
            shortcut.handler(event);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutGroups]);
}

export function useGlobalShortcuts() {
  // Navigation shortcuts
  const navigateToQueue = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "/queue" }));
  }, []);

  const navigateToReview = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "/review" }));
  }, []);

  const navigateToDocuments = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "/documents" }));
  }, []);

  const navigateToAnalytics = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "/analytics" }));
  }, []);

  const navigateToSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "/settings" }));
  }, []);

  // Command palette
  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent("command-palette-toggle"));
  }, []);

  const shortcuts: ShortcutGroup[] = [
    {
      name: "Navigation",
      shortcuts: [
        {
          key: "1",
          metaKey: true,
          description: "Navigate to Queue",
          handler: navigateToQueue,
        },
        {
          key: "2",
          metaKey: true,
          description: "Navigate to Review",
          handler: navigateToReview,
        },
        {
          key: "3",
          metaKey: true,
          description: "Navigate to Documents",
          handler: navigateToDocuments,
        },
        {
          key: "4",
          metaKey: true,
          description: "Navigate to Analytics",
          handler: navigateToAnalytics,
        },
        {
          key: ",",
          metaKey: true,
          description: "Navigate to Settings",
          handler: navigateToSettings,
        },
      ],
    },
    {
      name: "Commands",
      shortcuts: [
        {
          key: "k",
          metaKey: true,
          description: "Open command palette",
          handler: openCommandPalette,
        },
        {
          key: "p",
          metaKey: true,
          shiftKey: true,
          description: "Open command palette",
          handler: openCommandPalette,
        },
      ],
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return { shortcuts };
}
