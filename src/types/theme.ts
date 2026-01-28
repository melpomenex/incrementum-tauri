/**
 * Theme System Types
 * Based on Incrementum-CPP QSS themes
 */

export type ThemeVariant = 'light' | 'dark';

export interface ThemeColors {
  // Base colors (Material Design 3 inspired)
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  outline: string;
  outlineVariant: string;

  // Functional colors
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  warning: string;

  // Component-specific colors
  toolbar: string;
  sidebar: string;
  card: string;
  input: string;
  border: string;
  text: string;
  textSecondary: string;
  link: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  id: string;
  name: string;
  variant: ThemeVariant;
  description?: string;
  author?: string;
  version?: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  customCSS?: string;
}

export type ThemeId = string;

export interface ThemeContextValue {
  theme: Theme;
  themes: Theme[];
  setTheme: (themeId: ThemeId) => void;
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (themeId: ThemeId) => void;
  exportTheme: (themeId: ThemeId) => string;
  importTheme: (themeJson: string) => Theme;
}

/**
 * Built-in theme IDs
 */
export const BUILTIN_THEMES = {
  MODERN_DARK: 'modern-dark',
  MATERIAL_YOU: 'material-you',
  SNOW: 'snow',
  MISTRAL_DARK: 'mistral-dark',
  MISTRAL_LIGHT: 'mistral-light',
  AURORA_LIGHT: 'aurora-light',
  FOREST_LIGHT: 'forest-light',
  ICE_BLUE: 'ice-blue',
  MAPQUEST: 'mapquest',
  MILKY_MATCHA: 'milky-matcha',
  MINECRAFT: 'minecraft',
  NOCTURNE_DARK: 'nocturne-dark',
  OMAR_CHY_BLISS: 'omar-chy-bliss',
  SANDSTONE_LIGHT: 'sandstone-light',
  SUPER_GAME_BRO: 'super-game-bro',
  CARTOGRAPHER: 'cartographer',
  MODERN_POLISHED: 'modern-polished',
  HIGH_CONTRAST_LIGHT: 'high-contrast-light',
  HIGH_CONTRAST_DARK: 'high-contrast-dark',
  LEMON_SLICE: 'lemon-slice',
} as const;

export type BuiltInThemeId = typeof BUILTIN_THEMES[keyof typeof BUILTIN_THEMES];
