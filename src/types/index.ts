// Re-export all types
export * from "./document";
export * from "./queue";
export * from "./api";

// UI-specific types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    muted: string;
    "muted-foreground": string;
    card: string;
    "card-foreground": string;
    border: string;
    input: string;
    destructive: string;
    "destructive-foreground": string;
  };
}

export type ViewName = "queue" | "review" | "documents" | "analytics" | "settings";

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export interface KeyboardShortcut {
  id: string;
  label: string;
  defaultShortcut: string;
  currentShortcut: string;
  action: () => void;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
}
