/**
 * Command palette for quick actions
 * Inspired by VS Code command palette
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Command as CommandIcon, FileText, Zap, Settings, Plus, List, BarChart3, Palette } from "lucide-react";

/**
 * Command definition
 */
export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category: CommandCategory;
  action: () => void | Promise<void>;
  keywords?: string[];
  shortcut?: string;
}

/**
 * Command categories
 */
export enum CommandCategory {
  General = "General",
  Documents = "Documents",
  Extracts = "Extracts",
  Flashcards = "Flashcards",
  Review = "Review",
  Settings = "Settings",
  Navigation = "Navigation",
}

/**
 * Command palette props
 */
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

/**
 * Hook to manage keyboard shortcut for opening command palette
 */
export function useCommandPaletteShortcut(): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return isMac ? "⌘K" : "Ctrl+K";
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on query
  const filteredCommands = useCallback(() => {
    if (!query.trim()) {
      return commands;
    }

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(lowerQuery);
      const descMatch = cmd.description?.toLowerCase().includes(lowerQuery) || false;
      const keywordMatch = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)) || false;
      const categoryMatch = cmd.category.toLowerCase().includes(lowerQuery);

      return labelMatch || descMatch || keywordMatch || categoryMatch;
    });
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filtered = filteredCommands();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Group commands by category
  const groupedCommands = useCallback(() => {
    const filtered = filteredCommands();
    const groups: Record<CommandCategory, Command[]> = {
      [CommandCategory.General]: [],
      [CommandCategory.Documents]: [],
      [CommandCategory.Extracts]: [],
      [CommandCategory.Flashcards]: [],
      [CommandCategory.Review]: [],
      [CommandCategory.Settings]: [],
      [CommandCategory.Navigation]: [],
    };

    filtered.forEach((cmd) => {
      if (groups[cmd.category]) {
        groups[cmd.category].push(cmd);
      }
    });

    return groups;
  }, [filteredCommands]);

  const shortcut = useCommandPaletteShortcut();

  if (!isOpen) return null;

  const groups = groupedCommands();
  const hasResults = Object.values(groups).some((cmds) => cmds.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-2xl">
        <div
          className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
            <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
              {shortcut}
            </kbd>
            <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {!hasResults ? (
              <div className="p-8 text-center text-muted-foreground">
                <CommandIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No commands found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div>
                {Object.entries(groups).map(([category, cmds]) => {
                  if (cmds.length === 0) return null;

                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>

                      {/* Commands */}
                      {cmds.map((cmd, index) => {
                        const globalIndex = commands.indexOf(cmd);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={cmd.id}
                            onClick={() => {
                              cmd.action();
                              onClose();
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted transition-colors ${
                              isSelected ? "bg-muted" : ""
                            }`}
                          >
                            {/* Icon */}
                            {cmd.icon && (
                              <div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                                {cmd.icon}
                              </div>
                            )}

                            {/* Label and Description */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {cmd.label}
                              </div>
                              {cmd.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>

                            {/* Shortcut */}
                            {cmd.shortcut && (
                              <kbd className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↵</kbd>
                  Select
                </span>
              </div>
              <span>{filteredCommands().length} commands</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Provider for command palette
 */
export interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);

  // Register commands
  const registerCommands = (cmds: Command[]) => {
    setCommands(cmds);
  };

  // Add a single command
  const addCommand = (cmd: Command) => {
    setCommands((prev) => [...prev, cmd]);
  };

  // Remove a command
  const removeCommand = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  };

  // Handle global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

      if ((isMac && e.metaKey && e.key === "k") ||
          (!isMac && e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        commands={commands}
      />
    </>
  );
}

/**
 * Hook to use command palette
 */
export function useCommandPalette() {
  // This would be used within the CommandPaletteProvider context
  // For now, return empty functions
  return {
    open: () => {},
    close: () => {},
    registerCommands: () => {},
    addCommand: () => {},
    removeCommand: () => {},
  };
}

/**
 * Helper to create standard commands
 */
export function createCommand(config: {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category: CommandCategory;
  action: () => void | Promise<void>;
  keywords?: string[];
  shortcut?: string;
}): Command {
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    icon: config.icon,
    category: config.category,
    action: config.action,
    keywords: config.keywords,
    shortcut: config.shortcut,
  };
}

/**
 * Default commands for Incrementum
 */
export function getDefaultCommands(): Command[] {
  return [
    createCommand({
      id: "new-document",
      label: "Import Document",
      description: "Import a new document from file",
      icon: <Plus className="w-4 h-4" />,
      category: CommandCategory.Documents,
      action: () => { window.dispatchEvent(new CustomEvent('import-document')); },
      keywords: ["create", "add", "import", "file", "pdf", "epub"],
      shortcut: "⌘N",
    }),
    createCommand({
      id: "go-documents",
      label: "Go to Documents",
      description: "View all documents",
      icon: <FileText className="w-4 h-4" />,
      category: CommandCategory.Navigation,
      action: () => { window.dispatchEvent(new CustomEvent('navigate', { detail: '/documents' })); },
      keywords: ["documents", "files", "library"],
      shortcut: "⌘1",
    }),
    createCommand({
      id: "go-queue",
      label: "Go to Queue",
      description: "View review queue",
      icon: <List className="w-4 h-4" />,
      category: CommandCategory.Navigation,
      action: () => { window.dispatchEvent(new CustomEvent('navigate', { detail: '/queue' })); },
      keywords: ["queue", "list", "items"],
      shortcut: "⌘2",
    }),
    createCommand({
      id: "start-review",
      label: "Start Review",
      description: "Begin flashcard review session",
      icon: <Zap className="w-4 h-4" />,
      category: CommandCategory.Review,
      action: () => { window.dispatchEvent(new CustomEvent('navigate', { detail: '/review' })); },
      keywords: ["study", "practice", "learn", "review"],
      shortcut: "⌘R",
    }),
    createCommand({
      id: "go-analytics",
      label: "Go to Analytics",
      description: "View statistics and progress",
      icon: <BarChart3 className="w-4 h-4" />,
      category: CommandCategory.Navigation,
      action: () => { window.dispatchEvent(new CustomEvent('navigate', { detail: '/analytics' })); },
      keywords: ["stats", "analytics", "charts", "progress"],
      shortcut: "⌘3",
    }),
    createCommand({
      id: "open-settings",
      label: "Open Settings",
      description: "Open application settings",
      icon: <Settings className="w-4 h-4" />,
      category: CommandCategory.Settings,
      action: () => { window.dispatchEvent(new CustomEvent('navigate', { detail: '/settings' })); },
      keywords: ["preferences", "config", "options"],
      shortcut: "⌘,",
    }),
    createCommand({
      id: "toggle-theme",
      label: "Toggle Theme",
      description: "Switch between light and dark mode",
      icon: <Palette className="w-4 h-4" />,
      category: CommandCategory.Settings,
      action: () => { window.dispatchEvent(new CustomEvent('toggle-theme')); },
      keywords: ["theme", "dark", "light", "mode", "appearance"],
    }),
    createCommand({
      id: "keyboard-shortcuts",
      label: "Keyboard Shortcuts",
      description: "View all keyboard shortcuts",
      icon: <CommandIcon className="w-4 h-4" />,
      category: CommandCategory.General,
      action: () => { window.dispatchEvent(new CustomEvent('show-shortcuts-help')); },
      keywords: ["keyboard", "shortcuts", "hotkeys", "help"],
      shortcut: "?",
    }),
  ];
}
