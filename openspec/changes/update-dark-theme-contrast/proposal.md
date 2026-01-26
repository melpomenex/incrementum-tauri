# Change: Update dark theme contrast and readability

## Why
Some built-in dark themes render buttons and text with insufficient contrast, making UI elements hard to read across the app. We need consistent, readable dark themes that feel polished on every surface.

## What Changes
- Tune built-in dark theme color tokens to meet contrast targets across all UI surfaces.
- Ensure semantic colors (success/warning/error) remain legible in dark themes.
- Audit key screens to confirm readability and consistent theme token usage.

## Impact
- Affected specs: `dark-theme-contrast` (new capability)
- Affected code: `src/themes/builtin.ts`, `src/contexts/ThemeContext.tsx`, and any UI components using theme tokens for foreground/background colors
