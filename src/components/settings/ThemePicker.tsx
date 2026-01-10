/**
 * Theme Picker Component
 * Allows browsing and selecting themes with live preview
 */

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme, ThemeId } from '../../types/theme';
import { Check, Palette, Download, Upload, Trash2, Eye } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ThemeGallery } from './ThemeGallery';

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: (themeId: ThemeId) => void;
  onPreview: (themeId: ThemeId) => void;
}

function ThemeCard({ theme, isSelected, onSelect, onPreview }: ThemeCardProps) {
  const handleMouseEnter = () => {
    onPreview(theme.id);
  };

  return (
    <button
      onClick={() => onSelect(theme.id)}
      onMouseEnter={handleMouseEnter}
      className={`
        relative p-4 rounded-lg border-2 transition-all
        hover:scale-105 hover:shadow-lg
        ${isSelected ? 'border-primary' : 'border-transparent'}
      `}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
      }}
    >
      {isSelected && (
        <div
          className="absolute top-2 right-2 p-1 rounded-full"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Check className="w-4 h-4" style={{ color: theme.colors.onPrimary }} />
        </div>
      )}

      {/* Theme Preview */}
      <div className="space-y-2 mb-3">
        <div className="flex gap-1">
          {Object.values(theme.colors).slice(0, 8).map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Theme Info */}
      <div className="text-left">
        <h3
          className="font-semibold text-sm mb-1"
          style={{ color: theme.colors.onSurface }}
        >
          {theme.name}
        </h3>
        {theme.description && (
          <p
            className="text-xs opacity-70 line-clamp-2"
            style={{ color: theme.colors.onSurface }}
          >
            {theme.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: theme.variant === 'dark' ? '#1a1a1a' : '#f0f0f0',
              border: `1px solid ${theme.colors.outline}`,
            }}
          />
          <span
            className="text-xs opacity-70"
            style={{ color: theme.colors.onSurface }}
          >
            {theme.variant}
          </span>
        </div>
      </div>
    </button>
  );
}

interface ThemePickerProps {
  onClose?: () => void;
}

export function ThemePicker({ onClose }: ThemePickerProps) {
  const { theme, themes, setTheme, exportTheme, importTheme, addCustomTheme, removeCustomTheme } =
    useTheme();

  const [showCustomize, setShowCustomize] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);

  const handleSelectTheme = (themeId: ThemeId) => {
    setTheme(themeId);
    setPreviewTheme(null);
  };

  const handlePreviewTheme = (themeId: ThemeId) => {
    if (previewTheme !== themeId) {
      setPreviewTheme(themeId);
      // Temporarily apply preview theme
      const previewThemeObj = themes.find((t) => t.id === themeId);
      if (previewThemeObj) {
        // We could add a preview mode here if desired
        // For now, just show in the card
      }
    }
  };

  const handleExportTheme = async (themeId: ThemeId) => {
    try {
      const json = exportTheme(themeId);
      const theme = themes.find((t) => t.id === themeId);

      // Use Tauri to save file
      const filePath = await invoke<string>('dialog_save_file', {
        defaultPath: `${theme?.name || 'theme'}.json`,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (filePath) {
        await invoke('write_file', {
          path: filePath,
          contents: json,
        });
      }
    } catch (error) {
      console.error('Failed to export theme:', error);
    }
  };

  const handleImportTheme = async () => {
    try {
      const filePath = await invoke<string>('dialog_open_file', {
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (filePath) {
        const contents = await invoke<string>('read_file', { path: filePath });
        const importedTheme = importTheme(contents);
        setTheme(importedTheme.id);
      }
    } catch (error) {
      console.error('Failed to import theme:', error);
    }
  };

  const handleDeleteCustomTheme = (themeId: ThemeId) => {
    if (confirm('Are you sure you want to delete this custom theme?')) {
      removeCustomTheme(themeId);
    }
  };

  const builtinThemes = themes.filter((t) =>
    [
      'modern-dark',
      'material-you',
      'snow',
      'mistral-dark',
      'aurora-light',
      'forest-light',
      'ice-blue',
      'nocturne-dark',
      'mapquest',
      'milky-matcha',
      'sandstone-light',
      'minecraft',
      'mistral-light',
      'modern-polished',
      'omar-chy-bliss',
      'super-game-bro',
      'cartographer',
    ].includes(t.id)
  );

  const customThemes = themes.filter(
    (t) =>
      ![
        'modern-dark',
        'material-you',
        'snow',
        'mistral-dark',
        'aurora-light',
        'forest-light',
        'ice-blue',
        'nocturne-dark',
        'mapquest',
        'milky-matcha',
        'sandstone-light',
        'minecraft',
        'mistral-light',
        'modern-polished',
        'omar-chy-bliss',
        'super-game-bro',
        'cartographer',
      ].includes(t.id)
  );

  return (
    <div className="theme-picker p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Theme Picker</h2>
            <p className="text-sm text-muted-foreground">
              Choose a theme or create your own
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            title="View all themes in gallery"
          >
            <Eye className="w-4 h-4" />
            Gallery
          </button>
          <button
            onClick={handleImportTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            title="Import theme"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => handleExportTheme(theme.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            title="Export current theme"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Built-in Themes */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Built-in Themes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {builtinThemes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              isSelected={theme.id === t.id}
              onSelect={handleSelectTheme}
              onPreview={handlePreviewTheme}
            />
          ))}
        </div>
      </section>

      {/* Custom Themes */}
      {customThemes.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Custom Themes</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customThemes.map((t) => (
              <div key={t.id} className="relative">
                <ThemeCard
                  theme={t}
                  isSelected={theme.id === t.id}
                  onSelect={handleSelectTheme}
                  onPreview={handlePreviewTheme}
                />
                <button
                  onClick={() => handleDeleteCustomTheme(t.id)}
                  className="absolute top-2 left-2 p-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
                  title="Delete custom theme"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Preview Notice */}
      {previewTheme && previewTheme !== theme.id && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
          <Eye className="w-4 h-4" />
          <span>Previewing: {themes.find((t) => t.id === previewTheme)?.name}</span>
          <button
            onClick={() => setPreviewTheme(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Click to apply
          </button>
        </div>
      )}

      {/* Customize Button */}
      <div className="flex justify-center pt-4 border-t">
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed hover:border-primary transition-colors"
        >
          <Palette className="w-5 h-5" />
          <span className="font-semibold">Create Custom Theme</span>
        </button>
      </div>

      {/* Theme Gallery Modal */}
      {showGallery && (
        <ThemeGallery
          onClose={() => setShowGallery(false)}
          onThemeSelect={(themeId) => {
            setTheme(themeId);
            setShowGallery(false);
          }}
        />
      )}
    </div>
  );
}
