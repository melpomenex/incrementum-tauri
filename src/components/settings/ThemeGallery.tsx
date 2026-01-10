/**
 * Theme Gallery Component
 * Shows visual previews of themes with mini UI mockups
 */

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Theme, ThemeId } from "../../types/theme";
import { Check, X, Maximize2, Smartphone } from "lucide-react";
import { cn } from "../../utils";

interface ThemeGalleryProps {
  onClose?: () => void;
  onThemeSelect?: (themeId: ThemeId) => void;
}

/**
 * Mini UI mockup showing theme in action
 */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      className="w-full h-32 rounded-lg overflow-hidden border relative"
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.outline,
      }}
    >
      {/* Mini mock header */}
      <div
        className="h-6 flex items-center px-2 gap-1"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: theme.colors.error }}
        />
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: theme.colors.warning }}
        />
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: theme.colors.success }}
        />
      </div>

      {/* Mini mock content */}
      <div className="p-2 space-y-1.5">
        {/* Title bar */}
        <div
          className="h-2 rounded w-3/4"
          style={{ backgroundColor: theme.colors.onSurface }}
        />

        {/* Content blocks */}
        <div className="flex gap-1">
          <div
            className="h-8 w-8 rounded"
            style={{ backgroundColor: theme.colors.primaryContainer }}
          />
          <div className="flex-1 space-y-1">
            <div
              className="h-1.5 rounded w-full"
              style={{ backgroundColor: theme.colors.outline }}
            />
            <div
              className="h-1.5 rounded w-2/3"
              style={{ backgroundColor: theme.colors.outlineVariant }}
            />
            <div
              className="h-1.5 rounded w-1/2"
              style={{ backgroundColor: theme.colors.outlineVariant }}
            />
          </div>
        </div>

        {/* Action button */}
        <div
          className="h-4 rounded w-16 text-center text-xs"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.onPrimary,
          }}
        >
          Action
        </div>
      </div>
    </div>
  );
}

/**
 * Color palette display
 */
function ColorPalette({ theme }: { theme: Theme }) {
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.primaryContainer,
    theme.colors.error,
    theme.colors.warning,
    theme.colors.success,
    theme.colors.surface,
    theme.colors.background,
    theme.colors.onPrimary,
    theme.colors.onSurface,
  ];

  return (
    <div className="flex gap-0.5">
      {colors.map((color, i) => (
        <div
          key={i}
          className="flex-1 h-6 rounded-sm first:rounded-l-lg last:rounded-r-lg"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

/**
 * Theme card in gallery
 */
function ThemeGalleryCard({
  theme,
  isSelected,
  onClick,
}: {
  theme: Theme;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-lg border-2 transition-all hover:scale-[1.02] hover:shadow-lg",
        isSelected ? "border-primary shadow-lg" : "border-transparent hover:border-outline"
      )}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
      }}
    >
      {isSelected && (
        <div
          className="absolute top-2 right-2 p-1 rounded-full shadow-sm"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Check className="w-3 h-3" style={{ color: theme.colors.onPrimary }} />
        </div>
      )}

      {/* Theme Preview */}
      <ThemePreview theme={theme} />

      {/* Color Palette */}
      <div className="mt-2 rounded-full overflow-hidden">
        <ColorPalette theme={theme} />
      </div>

      {/* Theme Info */}
      <div className="mt-2 text-left">
        <h3
          className="font-semibold text-sm truncate"
          style={{ color: theme.colors.onSurface }}
        >
          {theme.name}
        </h3>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className="text-xs"
            style={{ color: theme.colors.textSecondary }}
          >
            {theme.variant}
          </span>
          <Smartphone
            className="w-3 h-3"
            style={{ color: theme.colors.textSecondary }}
          />
        </div>
      </div>
    </button>
  );
}

/**
 * Full screen gallery modal
 */
export function ThemeGallery({ onClose, onThemeSelect }: ThemeGalleryProps) {
  const { theme, themes, setTheme } = useTheme();

  const handleSelectTheme = (themeId: ThemeId) => {
    setTheme(themeId);
    onThemeSelect?.(themeId);
  };

  const allThemeIds: ThemeId[] = [
    "modern-dark",
    "material-you",
    "snow",
    "mistral-dark",
    "aurora-light",
    "forest-light",
    "ice-blue",
    "nocturne-dark",
    "mapquest",
    "milky-matcha",
    "sandstone-light",
    "minecraft",
    "mistral-light",
    "modern-polished",
    "omar-chy-bliss",
    "super-game-bro",
    "cartographer",
  ];

  // Group themes by variant
  const darkThemes = allThemeIds
    .map((id) => themes.find((t) => t.id === id))
    .filter((t): t is Theme => !!t && t.variant === "dark");

  const lightThemes = allThemeIds
    .map((id) => themes.find((t) => t.id === id))
    .filter((t): t is Theme => !!t && t.variant === "light");

  const customThemes = themes.filter(
    (t) => !allThemeIds.includes(t.id as ThemeId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: theme.colors.outline }}
        >
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: theme.colors.onSurface }}
            >
              Theme Gallery
            </h2>
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
              Preview all available themes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: theme.colors.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Light Themes */}
          {lightThemes.length > 0 && (
            <section>
              <h3
                className="text-sm font-semibold mb-3 uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Light Themes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {lightThemes.map((t) => (
                  <ThemeGalleryCard
                    key={t.id}
                    theme={t}
                    isSelected={theme.id === t.id}
                    onClick={() => handleSelectTheme(t.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Dark Themes */}
          {darkThemes.length > 0 && (
            <section>
              <h3
                className="text-sm font-semibold mb-3 uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Dark Themes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {darkThemes.map((t) => (
                  <ThemeGalleryCard
                    key={t.id}
                    theme={t}
                    isSelected={theme.id === t.id}
                    onClick={() => handleSelectTheme(t.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <section>
              <h3
                className="text-sm font-semibold mb-3 uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Custom Themes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {customThemes.map((t) => (
                  <ThemeGalleryCard
                    key={t.id}
                    theme={t}
                    isSelected={theme.id === t.id}
                    onClick={() => handleSelectTheme(t.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-4 border-t"
          style={{ borderColor: theme.colors.outline }}
        >
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            {themes.length} themes available
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.onPrimary,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Button to open the gallery
 */
export function ThemeGalleryButton({ onSelect }: { onSelect?: (themeId: ThemeId) => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { theme } = useTheme();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
        style={{ color: theme.colors.textSecondary }}
      >
        <Maximize2 className="w-4 h-4" />
        <span className="text-sm">Open Gallery</span>
      </button>

      {isOpen && (
        <ThemeGallery
          onClose={() => setIsOpen(false)}
          onThemeSelect={(themeId) => {
            onSelect?.(themeId);
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}
