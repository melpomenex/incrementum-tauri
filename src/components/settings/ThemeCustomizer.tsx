/**
 * Theme Customizer Dialog
 * Allows creating and editing custom themes
 */

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme, ThemeId, ThemeVariant } from '../../types/theme';
import { X, Palette, RotateCcw } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded border bg-input text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

interface ThemeCustomizerProps {
  baseTheme?: ThemeId;
  onClose: () => void;
  onSave: (theme: Theme) => void;
}

export function ThemeCustomizer({ baseTheme, onClose, onSave }: ThemeCustomizerProps) {
  const { themes } = useTheme();

  const [themeName, setThemeName] = useState('');
  const [variant, setVariant] = useState<ThemeVariant>('dark');
  const [colors, setColors] = useState<Theme['colors']>(
    baseTheme
      ? themes.find((t) => t.id === baseTheme)?.colors || themes[0].colors
      : themes[0].colors
  );

  const handleColorChange = (key: keyof Theme['colors']) => (value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    const base = baseTheme
      ? themes.find((t) => t.id === baseTheme)
      : themes.find((t) => t.id === 'modern-dark');
    if (base) {
      setColors(base.colors);
    }
  };

  const handleSave = () => {
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: themeName || 'Custom Theme',
      variant,
      colors,
      typography: themes[0].typography,
      spacing: themes[0].spacing,
      radius: themes[0].radius,
      shadows: themes[0].shadows,
    };

    onSave(newTheme);
    onClose();
  };

  const colorGroups = [
    {
      title: 'Base Colors',
      colors: [
        { key: 'background' as const, label: 'Background' },
        { key: 'onBackground' as const, label: 'On Background' },
        { key: 'surface' as const, label: 'Surface' },
        { key: 'onSurface' as const, label: 'On Surface' },
      ],
    },
    {
      title: 'Primary Colors',
      colors: [
        { key: 'primary' as const, label: 'Primary' },
        { key: 'onPrimary' as const, label: 'On Primary' },
        { key: 'primaryContainer' as const, label: 'Primary Container' },
        { key: 'onPrimaryContainer' as const, label: 'On Primary Container' },
      ],
    },
    {
      title: 'Secondary Colors',
      colors: [
        { key: 'secondary' as const, label: 'Secondary' },
        { key: 'onSecondary' as const, label: 'On Secondary' },
      ],
    },
    {
      title: 'Functional Colors',
      colors: [
        { key: 'error' as const, label: 'Error' },
        { key: 'onError' as const, label: 'On Error' },
        { key: 'success' as const, label: 'Success' },
        { key: 'warning' as const, label: 'Warning' },
      ],
    },
    {
      title: 'Component Colors',
      colors: [
        { key: 'toolbar' as const, label: 'Toolbar' },
        { key: 'sidebar' as const, label: 'Sidebar' },
        { key: 'card' as const, label: 'Card' },
        { key: 'input' as const, label: 'Input' },
        { key: 'border' as const, label: 'Border' },
      ],
    },
    {
      title: 'Text Colors',
      colors: [
        { key: 'text' as const, label: 'Text' },
        { key: 'textSecondary' as const, label: 'Text Secondary' },
        { key: 'link' as const, label: 'Link' },
      ],
    },
  ];

  return (
    <div className="theme-customizer p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Customize Theme</h2>
            <p className="text-sm text-muted-foreground">
              Create your own color scheme
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Theme Name and Variant */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Theme Name</label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="My Custom Theme"
            className="w-full px-3 py-2 rounded border bg-input"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Variant</label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as ThemeVariant)}
            className="w-full px-3 py-2 rounded border bg-input"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      {/* Color Groups */}
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {colorGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {group.colors.map((color) => (
                <ColorPicker
                  key={color.key}
                  label={color.label}
                  value={colors[color.key]}
                  onChange={handleColorChange(color.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Base
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!themeName}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}
