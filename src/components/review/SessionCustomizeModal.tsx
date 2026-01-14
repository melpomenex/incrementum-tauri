import { X, Clock, Tag, Sliders, Target, Layers } from "lucide-react";

export interface SessionCustomization {
  sessionDurationMinutes: number;
  maxItems: number;
  blockTimeBudgets: {
    overdue: number;
    maintenance: number;
    explore: number;
    empty: number;
  };
  filters: {
    tags: string[];
    categories: string[];
    priorityRange: { min: number; max: number };
    excludeSuspended: boolean;
  };
  itemTypes: {
    documents: boolean;
    extracts: boolean;
    learningItems: boolean;
  };
}

export const DEFAULT_CUSTOMIZATION: SessionCustomization = {
  sessionDurationMinutes: 60,
  maxItems: 50,
  blockTimeBudgets: {
    overdue: 10,
    maintenance: 15,
    explore: 20,
    empty: 15,
  },
  filters: {
    tags: [],
    categories: [],
    priorityRange: { min: 0, max: 100 },
    excludeSuspended: true,
  },
  itemTypes: {
    documents: true,
    extracts: false,
    learningItems: false,
  },
};

interface SessionCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: SessionCustomization;
  onChange: (customization: SessionCustomization) => void;
  onApply: () => void;
  availableTags?: string[];
  availableCategories?: string[];
}

export function SessionCustomizeModal({
  isOpen,
  onClose,
  customization,
  onChange,
  onApply,
  availableTags = [],
  availableCategories = [],
}: SessionCustomizeModalProps) {
  if (!isOpen) return null;

  const updateCustomization = (updates: Partial<SessionCustomization>) => {
    onChange({ ...customization, ...updates });
  };

  const updateFilters = (updates: Partial<SessionCustomization["filters"]>) => {
    onChange({
      ...customization,
      filters: { ...customization.filters, ...updates },
    });
  };

  const updateBlockTimeBudgets = (updates: Partial<SessionCustomization["blockTimeBudgets"]>) => {
    onChange({
      ...customization,
      blockTimeBudgets: { ...customization.blockTimeBudgets, ...updates },
    });
  };

  const updateItemTypes = (updates: Partial<SessionCustomization["itemTypes"]>) => {
    onChange({
      ...customization,
      itemTypes: { ...customization.itemTypes, ...updates },
    });
  };

  const toggleTag = (tag: string) => {
    const tags = customization.filters.tags.includes(tag)
      ? customization.filters.tags.filter((t) => t !== tag)
      : [...customization.filters.tags, tag];
    updateFilters({ tags });
  };

  const toggleCategory = (category: string) => {
    const categories = customization.filters.categories.includes(category)
      ? customization.filters.categories.filter((c) => c !== category)
      : [...customization.filters.categories, category];
    updateFilters({ categories });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto m-4">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Customize Session</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Session Duration */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Session Duration</h3>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15"
                max="180"
                step="15"
                value={customization.sessionDurationMinutes}
                onChange={(e) =>
                  updateCustomization({ sessionDurationMinutes: Number(e.target.value) })
                }
                className="flex-1"
              />
              <div className="min-w-[80px] text-sm text-foreground/80 text-right">
                {customization.sessionDurationMinutes} min
              </div>
            </div>
            <div className="flex gap-2">
              {[30, 45, 60, 90, 120].map((duration) => (
                <button
                  key={duration}
                  onClick={() => updateCustomization({ sessionDurationMinutes: duration })}
                  className={`px-3 py-1 text-xs rounded border ${
                    customization.sessionDurationMinutes === duration
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted/60"
                  }`}
                >
                  {duration}m
                </button>
              ))}
            </div>
          </section>

          {/* Max Items */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Maximum Items</h3>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={customization.maxItems}
                onChange={(e) => updateCustomization({ maxItems: Number(e.target.value) })}
                className="flex-1"
              />
              <div className="min-w-[80px] text-sm text-foreground/80 text-right">
                {customization.maxItems} items
              </div>
            </div>
          </section>

          {/* Block Time Budgets */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Block Time Budgets</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-foreground/80 font-medium">Overdue Rescue (min)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customization.blockTimeBudgets.overdue}
                  onChange={(e) =>
                    updateBlockTimeBudgets({ overdue: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/80 font-medium">Maintenance Block (min)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customization.blockTimeBudgets.maintenance}
                  onChange={(e) =>
                    updateBlockTimeBudgets({ maintenance: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/80 font-medium">Exploration Block (min)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customization.blockTimeBudgets.explore}
                  onChange={(e) =>
                    updateBlockTimeBudgets({ explore: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/80 font-medium">Focus Block (min)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={customization.blockTimeBudgets.empty}
                  onChange={(e) =>
                    updateBlockTimeBudgets({ empty: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground"
                />
              </div>
            </div>
          </section>

          {/* Item Types */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Item Types</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={customization.itemTypes.documents}
                  onChange={(e) => updateItemTypes({ documents: e.target.checked })}
                  className="rounded"
                />
                Documents
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={customization.itemTypes.extracts}
                  onChange={(e) => updateItemTypes({ extracts: e.target.checked })}
                  className="rounded"
                />
                Extracts
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={customization.itemTypes.learningItems}
                  onChange={(e) => updateItemTypes({ learningItems: e.target.checked })}
                  className="rounded"
                />
                Learning Items
              </label>
            </div>
          </section>

          {/* Priority Range */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Priority Range</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-foreground/80 font-medium">Minimum Priority</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customization.filters.priorityRange.min}
                  onChange={(e) =>
                    updateFilters({
                      priorityRange: {
                        ...customization.filters.priorityRange,
                        min: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <div className="text-xs text-foreground/80 text-right">
                  {customization.filters.priorityRange.min}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-foreground/80 font-medium">Maximum Priority</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customization.filters.priorityRange.max}
                  onChange={(e) =>
                    updateFilters({
                      priorityRange: {
                        ...customization.filters.priorityRange,
                        max: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <div className="text-xs text-foreground/80 text-right">
                  {customization.filters.priorityRange.max}
                </div>
              </div>
            </div>
          </section>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Filter by Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded border ${
                      customization.filters.tags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted/60"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Categories Filter */}
          {availableCategories.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Filter by Category</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 text-xs rounded border ${
                      customization.filters.categories.includes(category)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted/60"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Exclude Suspended */}
          <section className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
            <span className="text-sm text-foreground">Exclude suspended items</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={customization.filters.excludeSuspended}
                onChange={(e) => updateFilters({ excludeSuspended: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-background peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => onChange(DEFAULT_CUSTOMIZATION)}
            className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-background border border-border rounded hover:bg-muted/60 text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Apply Customization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
