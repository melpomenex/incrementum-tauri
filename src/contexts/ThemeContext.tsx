/**
 * Theme Provider Context
 * Manages theme state and CSS variable injection
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeContextValue, ThemeId } from '../types/theme';
import { builtInThemes } from '../themes/builtin';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeId;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Apply theme CSS variables to document root
 */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;

  // Apply colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Map theme colors to shared UI tokens used by Tailwind classes.
  root.style.setProperty('--color-foreground', theme.colors.onBackground || theme.colors.text);
  root.style.setProperty('--color-muted', theme.colors.surfaceVariant || theme.colors.surface);
  root.style.setProperty(
    '--color-muted-foreground',
    theme.colors.textSecondary || theme.colors.onSurface || theme.colors.onBackground
  );
  root.style.setProperty('--color-card', theme.colors.card || theme.colors.surface);
  root.style.setProperty('--color-card-foreground', theme.colors.onSurface || theme.colors.text);
  root.style.setProperty('--color-border', theme.colors.border || theme.colors.outline);
  root.style.setProperty(
    '--color-input',
    theme.colors.input || theme.colors.surfaceVariant || theme.colors.surface
  );
  root.style.setProperty('--color-destructive', theme.colors.error);
  root.style.setProperty('--color-destructive-foreground', theme.colors.onError || theme.colors.onBackground);
  root.style.setProperty('--color-primary-foreground', theme.colors.onPrimary);
  root.style.setProperty('--color-secondary-foreground', theme.colors.onSecondary || theme.colors.onPrimary);

  // Apply typography
  root.style.setProperty('--font-family', theme.typography.fontFamily);
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, value.toString());
  });

  // Apply spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Apply radius
  Object.entries(theme.radius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Set theme variant on data attribute
  root.setAttribute('data-theme', theme.variant);
}

/**
 * Load custom themes from localStorage
 */
function loadCustomThemes(): Theme[] {
  try {
    const stored = localStorage.getItem('incrementum-custom-themes');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom themes:', error);
  }
  return [];
}

/**
 * Save custom themes to localStorage
 */
function saveCustomThemes(themes: Theme[]): void {
  try {
    localStorage.setItem('incrementum-custom-themes', JSON.stringify(themes));
  } catch (error) {
    console.error('Failed to save custom themes:', error);
  }
}

/**
 * Load last selected theme from localStorage
 */
function loadLastThemeId(): ThemeId {
  try {
    const stored = localStorage.getItem('incrementum-last-theme');
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.error('Failed to load last theme:', error);
  }
  return 'modern-dark'; // Default theme
}

/**
 * Save last selected theme to localStorage
 */
function saveLastThemeId(themeId: ThemeId): void {
  try {
    localStorage.setItem('incrementum-last-theme', themeId);
  } catch (error) {
    console.error('Failed to save last theme:', error);
  }
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [themes, setThemes] = useState<Theme[]>(() => [
    ...builtInThemes,
    ...loadCustomThemes(),
  ]);

  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    return defaultTheme || loadLastThemeId();
  });

  const currentTheme = themes.find((t) => t.id === currentThemeId) || themes[0];

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
    saveLastThemeId(currentThemeId);
  }, [currentTheme, currentThemeId]);

  const setTheme = (themeId: ThemeId) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentThemeId(themeId);
    }
  };

  const addCustomTheme = (theme: Theme) => {
    const newThemes = [...themes, theme];
    setThemes(newThemes);
    saveCustomThemes(newThemes.filter((t) => !builtInThemes.find((bt) => bt.id === t.id)));
  };

  const removeCustomTheme = (themeId: ThemeId) => {
    // Prevent removing built-in themes
    if (builtInThemes.find((t) => t.id === themeId)) {
      console.warn('Cannot remove built-in theme');
      return;
    }

    const newThemes = themes.filter((t) => t.id !== themeId);
    setThemes(newThemes);
    saveCustomThemes(newThemes.filter((t) => !builtInThemes.find((bt) => bt.id === t.id)));

    // Switch to default theme if current theme is removed
    if (currentThemeId === themeId) {
      setCurrentThemeId('modern-dark');
    }
  };

  const exportTheme = (themeId: ThemeId): string => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }
    return JSON.stringify(theme, null, 2);
  };

  const importTheme = (themeJson: string): Theme => {
    try {
      const theme = JSON.parse(themeJson) as Theme;

      // Validate theme structure
      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Invalid theme structure');
      }

      // Check if theme already exists
      const existing = themes.find((t) => t.id === theme.id);
      if (existing) {
        // Update existing theme
        const newThemes = themes.map((t) => (t.id === theme.id ? theme : t));
        setThemes(newThemes);
      } else {
        // Add new theme
        addCustomTheme(theme);
      }

      return theme;
    } catch (error) {
      console.error('Failed to import theme:', error);
      throw new Error('Invalid theme JSON');
    }
  };

  const value: ThemeContextValue = {
    theme: currentTheme,
    themes,
    setTheme,
    addCustomTheme,
    removeCustomTheme,
    exportTheme,
    importTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
