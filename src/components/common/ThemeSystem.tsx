/**
 * Customizable theme system with light/dark mode support
 */

import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme mode
 */
export enum ThemeMode {
  Light = "light",
  Dark = "dark",
  System = "system",
}

/**
 * Color definition
 */
export interface ThemeColor {
  name: string;
  value: string;
  description?: string;
}

/**
 * Font definition
 */
export interface ThemeFont {
  family: string;
  size: number;
  lineHeight: number;
  weight?: number;
}

/**
 * Theme configuration
 */
export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    destructive: string;
    destructiveForeground: string;
    success: string;
    warning: string;
    info: string;
  };
  fonts: {
    sans: ThemeFont;
    mono: ThemeFont;
    ui: ThemeFont;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Built-in themes
 */
export const BUILTIN_THEMES: Theme[] = [
  {
    id: "light",
    name: "Light",
    mode: ThemeMode.Light,
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#8b5cf6",
      background: "#ffffff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      popover: "#ffffff",
      popoverForeground: "#0f172a",
      muted: "#f1f5f9",
      mutedForeground: "#64748b",
      border: "#e2e8f0",
      input: "#e2e8f0",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      success: "#22c55e",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
    fonts: {
      sans: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
      mono: { family: "JetBrains Mono, monospace", size: 14, lineHeight: 1.5 },
      ui: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    },
  },
  {
    id: "dark",
    name: "Dark",
    mode: ThemeMode.Dark,
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#8b5cf6",
      background: "#0f172a",
      foreground: "#f1f5f9",
      card: "#1e293b",
      cardForeground: "#f1f5f9",
      popover: "#1e293b",
      popoverForeground: "#f1f5f9",
      muted: "#334155",
      mutedForeground: "#94a3b8",
      border: "#334155",
      input: "#334155",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      success: "#22c55e",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
    fonts: {
      sans: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
      mono: { family: "JetBrains Mono, monospace", size: 14, lineHeight: 1.5 },
      ui: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.3)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.3)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    mode: ThemeMode.Dark,
    colors: {
      primary: "#818cf8",
      secondary: "#a78bfa",
      accent: "#c084fc",
      background: "#020617",
      foreground: "#e2e8f0",
      card: "#0f172a",
      cardForeground: "#e2e8f0",
      popover: "#0f172a",
      popoverForeground: "#e2e8f0",
      muted: "#1e293b",
      mutedForeground: "#94a3b8",
      border: "#1e293b",
      input: "#1e293b",
      destructive: "#f87171",
      destructiveForeground: "#ffffff",
      success: "#4ade80",
      warning: "#fbbf24",
      info: "#60a5fa",
    },
    fonts: {
      sans: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
      mono: { family: "JetBrains Mono, monospace", size: 14, lineHeight: 1.5 },
      ui: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.5)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.5)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    mode: ThemeMode.Dark,
    colors: {
      primary: "#4ade80",
      secondary: "#22c55e",
      accent: "#86efac",
      background: "#052e16",
      foreground: "#f0fdf4",
      card: "#14532d",
      cardForeground: "#f0fdf4",
      popover: "#14532d",
      popoverForeground: "#f0fdf4",
      muted: "#166534",
      mutedForeground: "#86efac",
      border: "#166534",
      input: "#166534",
      destructive: "#f87171",
      destructiveForeground: "#ffffff",
      success: "#4ade80",
      warning: "#fbbf24",
      info: "#60a5fa",
    },
    fonts: {
      sans: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
      mono: { family: "JetBrains Mono, monospace", size: 14, lineHeight: 1.5 },
      ui: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.4)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.4)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.4)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.4)",
    },
  },
  {
    id: "sepia",
    name: "Sepia",
    mode: ThemeMode.Light,
    colors: {
      primary: "#92400e",
      secondary: "#b45309",
      accent: "#d97706",
      background: "#fef3c7",
      foreground: "#451a03",
      card: "#fef9c3",
      cardForeground: "#451a03",
      popover: "#fef9c3",
      popoverForeground: "#451a03",
      muted: "#fde68a",
      mutedForeground: "#92400e",
      border: "#fcd34d",
      input: "#fcd34d",
      destructive: "#dc2626",
      destructiveForeground: "#ffffff",
      success: "#059669",
      warning: "#d97706",
      info: "#2563eb",
    },
    fonts: {
      sans: { family: "Merriweather, Georgia, serif", size: 15, lineHeight: 1.6 },
      mono: { family: "JetBrains Mono, monospace", size: 14, lineHeight: 1.5 },
      ui: { family: "Inter, system-ui, sans-serif", size: 14, lineHeight: 1.5 },
    },
    borderRadius: {
      sm: "0.125rem",
      md: "0.25rem",
      lg: "0.375rem",
      xl: "0.5rem",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.08)",
    },
  },
];

/**
 * Theme store
 */
interface ThemeStore {
  theme: Theme;
  customThemes: Theme[];
  setTheme: (theme: Theme) => void;
  setColor: (color: keyof Theme["colors"], value: string) => void;
  setFont: (font: keyof Theme["fonts"], font: ThemeFont) => void;
  setBorderRadius: (size: keyof Theme["borderRadius"], value: string) => void;
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (id: string) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: BUILTIN_THEMES[0],
      customThemes: [],

      setTheme: (theme) => set({ theme }),

      setColor: (color, value) => {
        set((state) => ({
          theme: {
            ...state.theme,
            colors: { ...state.theme.colors, [color]: value },
          },
        }));
      },

      setFont: (font, fontConfig) => {
        set((state) => ({
          theme: {
            ...state.theme,
            fonts: { ...state.theme.fonts, [font]: fontConfig },
          },
        }));
      },

      setBorderRadius: (size, value) => {
        set((state) => ({
          theme: {
            ...state.theme,
            borderRadius: { ...state.theme.borderRadius, [size]: value },
          },
        }));
      },

      addCustomTheme: (theme) => {
        set((state) => ({
          customThemes: [...state.customThemes, theme],
        }));
      },

      removeCustomTheme: (id) => {
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.id !== id),
        }));
      },

      resetTheme: () => {
        const currentTheme = get().theme;
        const defaultTheme = BUILTIN_THEMES.find((t) => t.id === currentTheme.id) || BUILTIN_THEMES[0];
        set({ theme: defaultTheme });
      },
    }),
    {
      name: "theme-storage",
    }
  )
);

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Apply colors with --color- prefix and kebab-case naming
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVarName = toKebabCase(key);
    root.style.setProperty(`--color-${cssVarName}`, value);
  });

  // Apply fonts
  Object.entries(theme.fonts).forEach(([key, font]) => {
    root.style.setProperty(`--font-${key}-family`, font.family);
    root.style.setProperty(`--font-${key}-size`, `${font.size}px`);
    root.style.setProperty(`--font-${key}-line-height`, String(font.lineHeight));
  });

  // Apply border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Apply spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Apply data attribute for mode
  root.setAttribute("data-theme", theme.mode);
}

/**
 * Theme provider component
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}

/**
 * Hook to get current theme
 */
export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const setColor = useThemeStore((state) => state.setColor);
  const setFont = useThemeStore((state) => state.setFont);
  const setBorderRadius = useThemeStore((state) => state.setBorderRadius);
  const resetTheme = useThemeStore((state) => state.resetTheme);

  return {
    theme,
    setTheme,
    setColor,
    setFont,
    setBorderRadius,
    resetTheme,
  };
}

/**
 * Hook to get all available themes
 */
export function useAvailableThemes() {
  const customThemes = useThemeStore((state) => state.customThemes);
  return [...BUILTIN_THEMES, ...customThemes];
}

/**
 * Hook to manage custom themes
 */
export function useCustomThemes() {
  const customThemes = useThemeStore((state) => state.customThemes);
  const addCustomTheme = useThemeStore((state) => state.addCustomTheme);
  const removeCustomTheme = useThemeStore((state) => state.removeCustomTheme);

  const createCustomTheme = (baseTheme: Theme, name: string) => {
    const newTheme: Theme = {
      ...baseTheme,
      id: `custom-${Date.now()}`,
      name,
    };
    addCustomTheme(newTheme);
    return newTheme;
  };

  const duplicateTheme = (theme: Theme) => {
    return createCustomTheme(theme, `${theme.name} (Copy)`);
  };

  return {
    customThemes,
    addCustomTheme,
    removeCustomTheme,
    createCustomTheme,
    duplicateTheme,
  };
}

/**
 * Hook to detect system theme preference
 */
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return ThemeMode.Light;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? ThemeMode.Dark
      : ThemeMode.Light;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? ThemeMode.Dark : ThemeMode.Light);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return systemTheme;
}

/**
 * Get theme for mode
 */
export function getThemeForMode(mode: ThemeMode): Theme {
  if (mode === ThemeMode.System) {
    const systemTheme = useSystemTheme();
    return BUILTIN_THEMES.find((t) => t.mode === systemTheme) || BUILTIN_THEMES[0];
  }
  return BUILTIN_THEMES.find((t) => t.id === mode) || BUILTIN_THEMES[0];
}

/**
 * Export theme to JSON
 */
export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Import theme from JSON
 */
export function importTheme(json: string): Theme | null {
  try {
    const theme = JSON.parse(json);
    if (theme.id && theme.name && theme.colors) {
      return theme as Theme;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate theme
 */
export function validateTheme(theme: any): theme is Theme {
  return (
    typeof theme === "object" &&
    typeof theme.id === "string" &&
    typeof theme.name === "string" &&
    typeof theme.colors === "object" &&
    typeof theme.colors.primary === "string" &&
    typeof theme.fonts === "object"
  );
}
