/**
 * RSS Customization Panel
 *
 * Provides ultra-customizability for RSS feeds including:
 * - Filter preferences (keywords, authors, categories)
 * - Display preferences (view mode, theme, density)
 * - Layout preferences (columns, thumbnails)
 * - Sorting preferences
 */

import { useState, useEffect } from "react";
import {
  Settings,
  X,
  Filter,
  Eye,
  LayoutGrid,
  ArrowUpDown,
  Save,
  RotateCcw,
  Check,
  Sliders,
} from "lucide-react";
import { useToast } from "../common/Toast";

interface RSSCustomizationPanelProps {
  feedId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: RSSUserPreferenceUpdate) => void;
}

export interface RSSUserPreferenceUpdate {
  // Filter preferences
  keyword_include?: string | null;
  keyword_exclude?: string | null;
  author_whitelist?: string | null;
  author_blacklist?: string | null;
  category_filter?: string | null;
  // Display preferences
  view_mode?: string | null;
  theme_mode?: string | null;
  density?: string | null;
  column_count?: number | null;
  show_thumbnails?: boolean | null;
  excerpt_length?: number | null;
  show_author?: boolean | null;
  show_date?: boolean | null;
  show_feed_icon?: boolean | null;
  // Sorting preferences
  sort_by?: string | null;
  sort_order?: string | null;
}

export interface RSSUserPreference {
  id: string;
  user_id?: string;
  feed_id?: string;
  keyword_include?: string | null;
  keyword_exclude?: string | null;
  author_whitelist?: string | null;
  author_blacklist?: string | null;
  category_filter?: string | null;
  view_mode?: string | null;
  theme_mode?: string | null;
  density?: string | null;
  column_count?: number | null;
  show_thumbnails?: boolean | null;
  excerpt_length?: number | null;
  show_author?: boolean | null;
  show_date?: boolean | null;
  show_feed_icon?: boolean | null;
  sort_by?: string | null;
  sort_order?: string | null;
}

type TabType = "filters" | "display" | "layout" | "sorting";

export function RSSCustomizationPanel({
  feedId,
  isOpen,
  onClose,
  onSave,
}: RSSCustomizationPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("display");
  const [preferences, setPreferences] = useState<RSSUserPreferenceUpdate>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset to defaults
  const resetToDefaults = () => {
    const defaults: RSSUserPreferenceUpdate = {
      view_mode: "card",
      theme_mode: "system",
      density: "normal",
      column_count: 2,
      show_thumbnails: true,
      excerpt_length: 150,
      show_author: true,
      show_date: true,
      show_feed_icon: true,
      sort_by: "date",
      sort_order: "desc",
    };
    setPreferences(defaults);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(preferences);
    setHasChanges(false);
    toast.success("Preferences saved!", "Your RSS customization has been updated.");
  };

  const updatePreference = <K extends keyof RSSUserPreferenceUpdate>(
    key: K,
    value: RSSUserPreferenceUpdate[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-foreground">RSS Customization</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Tabs */}
          <div className="w-48 border-r border-border bg-muted/30 p-2 space-y-1">
            <TabButton
              active={activeTab === "filters"}
              icon={Filter}
              label="Filters"
              onClick={() => setActiveTab("filters")}
            />
            <TabButton
              active={activeTab === "display"}
              icon={Eye}
              label="Display"
              onClick={() => setActiveTab("display")}
            />
            <TabButton
              active={activeTab === "layout"}
              icon={LayoutGrid}
              label="Layout"
              onClick={() => setActiveTab("layout")}
            />
            <TabButton
              active={activeTab === "sorting"}
              icon={ArrowUpDown}
              label="Sorting"
              onClick={() => setActiveTab("sorting")}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "filters" && <FiltersTab preferences={preferences} updatePreference={updatePreference} />}
            {activeTab === "display" && <DisplayTab preferences={preferences} updatePreference={updatePreference} />}
            {activeTab === "layout" && <LayoutTab preferences={preferences} updatePreference={updatePreference} />}
            {activeTab === "sorting" && <SortingTab preferences={preferences} updatePreference={updatePreference} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ============================================================================
// Filter Preferences Tab
// ============================================================================

function FiltersTab({
  preferences,
  updatePreference,
}: {
  preferences: RSSUserPreferenceUpdate;
  updatePreference: <K extends keyof RSSUserPreferenceUpdate>(
    key: K,
    value: RSSUserPreferenceUpdate[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Keyword Filters"
        description="Filter articles by keywords in title or content"
      >
        <FormField
          label="Include Keywords"
          description="Show articles containing these keywords (comma-separated)"
          value={preferences.keyword_include || ""}
          onChange={(value) => updatePreference("keyword_include", value || null)}
          placeholder="e.g., AI, machine learning, technology"
        />
        <FormField
          label="Exclude Keywords"
          description="Hide articles containing these keywords (comma-separated)"
          value={preferences.keyword_exclude || ""}
          onChange={(value) => updatePreference("keyword_exclude", value || null)}
          placeholder="e.g., ads, sponsored, clickbait"
        />
      </Section>

      <Section
        title="Author Filters"
        description="Filter articles by author"
      >
        <FormField
          label="Allowed Authors"
          description="Only show articles from these authors (comma-separated)"
          value={preferences.author_whitelist || ""}
          onChange={(value) => updatePreference("author_whitelist", value || null)}
          placeholder="e.g., John Doe, Jane Smith"
        />
        <FormField
          label="Blocked Authors"
          description="Hide articles from these authors (comma-separated)"
          value={preferences.author_blacklist || ""}
          onChange={(value) => updatePreference("author_blacklist", value || null)}
          placeholder="e.g., Spam Author"
        />
      </Section>

      <Section
        title="Category Filter"
        description="Filter articles by category or tag"
      >
        <FormField
          label="Categories"
          description="Show only these categories (comma-separated)"
          value={preferences.category_filter || ""}
          onChange={(value) => updatePreference("category_filter", value || null)}
          placeholder="e.g., tech, science, politics"
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Display Preferences Tab
// ============================================================================

function DisplayTab({
  preferences,
  updatePreference,
}: {
  preferences: RSSUserPreferenceUpdate;
  updatePreference: <K extends keyof RSSUserPreferenceUpdate>(
    key: K,
    value: RSSUserPreferenceUpdate[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="View Mode"
        description="Choose how articles are displayed"
      >
        <RadioGroup
          value={preferences.view_mode || "card"}
          options={[
            { value: "card", label: "Card", description: "Rich cards with thumbnails" },
            { value: "list", label: "List", description: "Compact list view" },
            { value: "compact", label: "Compact", description: "Minimal list view" },
          ]}
          onChange={(value) => updatePreference("view_mode", value)}
        />
      </Section>

      <Section
        title="Theme"
        description="Color theme for articles"
      >
        <RadioGroup
          value={preferences.theme_mode || "system"}
          options={[
            { value: "system", label: "System", description: "Match system preference" },
            { value: "light", label: "Light", description: "Always light theme" },
            { value: "dark", label: "Dark", description: "Always dark theme" },
          ]}
          onChange={(value) => updatePreference("theme_mode", value)}
        />
      </Section>

      <Section
        title="Display Options"
        description="Toggle additional information"
      >
        <ToggleField
          label="Show Thumbnails"
          checked={preferences.show_thumbnails ?? true}
          onChange={(checked) => updatePreference("show_thumbnails", checked)}
        />
        <ToggleField
          label="Show Author"
          checked={preferences.show_author ?? true}
          onChange={(checked) => updatePreference("show_author", checked)}
        />
        <ToggleField
          label="Show Date"
          checked={preferences.show_date ?? true}
          onChange={(checked) => updatePreference("show_date", checked)}
        />
        <ToggleField
          label="Show Feed Icon"
          checked={preferences.show_feed_icon ?? true}
          onChange={(checked) => updatePreference("show_feed_icon", checked)}
        />
      </Section>

      <Section
        title="Content Preview"
        description="Configure article excerpt display"
      >
        <RangeField
          label="Excerpt Length"
          value={preferences.excerpt_length ?? 150}
          onChange={(value) => updatePreference("excerpt_length", value)}
          min={50}
          max={500}
          step={10}
          suffix="characters"
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Layout Preferences Tab
// ============================================================================

function LayoutTab({
  preferences,
  updatePreference,
}: {
  preferences: RSSUserPreferenceUpdate;
  updatePreference: <K extends keyof RSSUserPreferenceUpdate>(
    key: K,
    value: RSSUserPreferenceUpdate[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Density"
        description="Control the spacing and sizing of articles"
      >
        <RadioGroup
          value={preferences.density || "normal"}
          options={[
            { value: "compact", label: "Compact", description: "Tight spacing, more articles visible" },
            { value: "normal", label: "Normal", description: "Balanced spacing" },
            { value: "comfortable", label: "Comfortable", description: "More whitespace, easier reading" },
          ]}
          onChange={(value) => updatePreference("density", value)}
        />
      </Section>

      <Section
        title="Columns"
        description="Number of article columns"
      >
        <RangeField
          label="Column Count"
          value={preferences.column_count ?? 2}
          onChange={(value) => updatePreference("column_count", value)}
          min={1}
          max={4}
          step={1}
          suffix="columns"
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Sorting Preferences Tab
// ============================================================================

function SortingTab({
  preferences,
  updatePreference,
}: {
  preferences: RSSUserPreferenceUpdate;
  updatePreference: <K extends keyof RSSUserPreferenceUpdate>(
    key: K,
    value: RSSUserPreferenceUpdate[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Sort By"
        description="Choose how articles are sorted"
      >
        <RadioGroup
          value={preferences.sort_by || "date"}
          options={[
            { value: "date", label: "Date", description: "Sort by publication date" },
            { value: "title", label: "Title", description: "Sort alphabetically by title" },
            { value: "read_status", label: "Read Status", description: "Unread articles first" },
            { value: "reading_time", label: "Reading Time", description: "Sort by estimated read time" },
          ]}
          onChange={(value) => updatePreference("sort_by", value)}
        />
      </Section>

      <Section
        title="Sort Order"
        description="Choose ascending or descending order"
      >
        <RadioGroup
          value={preferences.sort_order || "desc"}
          options={[
            { value: "desc", label: "Descending", description: "Newest first (or A-Z)" },
            { value: "asc", label: "Ascending", description: "Oldest first (or Z-A)" },
          ]}
          onChange={(value) => updatePreference("sort_order", value)}
        />
      </Section>

      <Section
        title="Smart View Modes"
        description="Pre-configured views for different reading scenarios"
      >
        <div className="grid grid-cols-3 gap-3">
          <SmartViewButton
            label="Briefing"
            description="Last 24h"
            onClick={() => {
              updatePreference("sort_by", "date");
              updatePreference("sort_order", "desc");
            }}
          />
          <SmartViewButton
            label="Deep Dive"
            description="Long-form"
            onClick={() => {
              updatePreference("sort_by", "date");
              updatePreference("sort_order", "desc");
              updatePreference("view_mode", "list");
            }}
          />
          <SmartViewButton
            label="Trending"
            description="Most read"
            onClick={() => {
              updatePreference("sort_by", "read_status");
              updatePreference("sort_order", "desc");
            }}
          />
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function RadioGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; description: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer transition-colors ${
            value === option.value
              ? "bg-primary/10 border-primary/50"
              : "hover:bg-muted"
          }`}
        >
          <input
            type="radio"
            name={value}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
          />
          <div>
            <div className="text-sm font-medium text-foreground">{option.label}</div>
            <div className="text-xs text-muted-foreground">{option.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            } mt-0.5`}
          />
        </div>
      </div>
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm text-muted-foreground">
          {value} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
      />
    </div>
  );
}

function SmartViewButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
    </button>
  );
}
