/**
 * Custom date range picker for analytics
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Date range preset
 */
export interface DateRangePreset {
  id: string;
  label: string;
  range: () => { start: Date; end: Date };
}

/**
 * Common date range presets
 */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, -1);
      return { start, end };
    },
  },
  {
    id: "last-7-days",
    label: "Last 7 Days",
    range: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    },
  },
  {
    id: "last-30-days",
    label: "Last 30 Days",
    range: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end };
    },
  },
  {
    id: "this-week",
    label: "This Week",
    range: () => {
      const now = new Date();
      const day = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { start, end };
    },
  },
  {
    id: "last-week",
    label: "Last Week",
    range: () => {
      const now = new Date();
      const day = now.getDay();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      return { start, end };
    },
  },
  {
    id: "this-month",
    label: "This Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "last-month",
    label: "Last Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "this-quarter",
    label: "This Quarter",
    range: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "last-quarter",
    label: "Last Quarter",
    range: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3 - 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "this-year",
    label: "This Year",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "last-year",
    label: "Last Year",
    range: () => {
      const start = new Date(new Date().getFullYear() - 1, 0, 1);
      const end = new Date(new Date().getFullYear() - 1, 11, 31, 23, 59, 59);
      return { start, end };
    },
  },
  {
    id: "all-time",
    label: "All Time",
    range: () => {
      return { start: new Date(2020, 0, 1), end: new Date() };
    },
  },
];

/**
 * Date range picker props
 */
export interface DateRangePickerProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  presets?: DateRangePreset[];
  minDate?: Date;
  maxDate?: Date;
  align?: "left" | "right";
}

/**
 * Simple date range picker component
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DATE_RANGE_PRESETS,
  minDate,
  maxDate,
  align = "left",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  useEffect(() => {
    setCustomStart(value.start);
    setCustomEnd(value.end);
  }, [value.start, value.end]);

  const handlePresetClick = useCallback(
    (preset: DateRangePreset) => {
      const range = preset.range();
      onChange(range);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    if (customStart <= customEnd) {
      onChange({ start: customStart, end: customEnd });
      setIsOpen(false);
    }
  }, [customStart, customEnd, onChange]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Find current preset
  const currentPreset = useMemo(() => {
    const range = presets.find((preset) => {
      const range = preset.range();
      return (
        range.start.getTime() === value.start.getTime() &&
        range.end.getTime() === value.end.getTime()
      );
    });
    return range;
  }, [presets, value]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">
          {currentPreset ? currentPreset.label : `${formatDate(value.start)} - ${formatDate(value.end)}`}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 z-20 bg-card border border-border rounded-lg shadow-lg w-72`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Date Range</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="max-h-64 overflow-y-auto p-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Presets
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    currentPreset?.id === preset.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Custom Range */}
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                  Custom Range
                </div>
                <div className="space-y-2 p-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setCustomStart(new Date(e.target.value + "T00:00:00"))
                      }
                      min={minDate?.toISOString().split("T")[0]}
                      max={maxDate?.toISOString().split("T")[0] || customEnd.toISOString().split("T")[0]}
                      className="w-full px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setCustomEnd(new Date(e.target.value + "T23:59:59"))
                      }
                      min={customStart.toISOString().split("T")[0]}
                      max={maxDate?.toISOString().split("T")[0]}
                      className="w-full px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={customStart > customEnd}
                    className="w-full px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Date range comparison tool
 */
export function DateRangeComparison({
  primaryRange,
  onPrimaryChange,
  comparisonRange,
  onComparisonChange,
  presets,
}: {
  primaryRange: { start: Date; end: Date };
  onPrimaryChange: (range: { start: Date; end: Date }) => void;
  comparisonRange: { start: Date; end: Date };
  onComparisonChange: (range: { start: Date; end: Date }) => void;
  presets?: DateRangePreset[];
}) {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Primary:</span>
        <DateRangePicker
          value={primaryRange}
          onChange={onPrimaryChange}
          presets={presets}
        />
      </div>

      <button
        onClick={() => setShowComparison(!showComparison)}
        className={`px-3 py-2 text-sm rounded-md transition-colors ${
          showComparison
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        Compare
      </button>

      {showComparison && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">vs:</span>
          <DateRangePicker
            value={comparisonRange}
            onChange={onComparisonChange}
            presets={presets}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Date range navigation component
 */
export function DateRangeNavigation({
  value,
  onChange,
  step = "month",
}: {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  step?: "day" | "week" | "month" | "quarter" | "year";
}) {
  const navigate = useCallback(
    (direction: "prev" | "next") => {
      const multiplier = direction === "next" ? 1 : -1;
      let newStart = new Date(value.start);
      let newEnd = new Date(value.end);

      switch (step) {
        case "day":
          newStart.setDate(newStart.getDate() + multiplier);
          newEnd.setDate(newEnd.getDate() + multiplier);
          break;
        case "week":
          newStart.setDate(newStart.getDate() + multiplier * 7);
          newEnd.setDate(newEnd.getDate() + multiplier * 7);
          break;
        case "month":
          newStart.setMonth(newStart.getMonth() + multiplier);
          newEnd.setMonth(newEnd.getMonth() + multiplier);
          break;
        case "quarter":
          newStart.setMonth(newStart.getMonth() + multiplier * 3);
          newEnd.setMonth(newEnd.getMonth() + multiplier * 3);
          break;
        case "year":
          newStart.setFullYear(newStart.getFullYear() + multiplier);
          newEnd.setFullYear(newEnd.getFullYear() + multiplier);
          break;
      }

      onChange({ start: newStart, end: newEnd });
    },
    [value, onChange, step]
  );

  const getRangeLabel = useCallback(() => {
    if (value.start.getTime() === value.end.getTime()) {
      return value.start.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    const sameYear = value.start.getFullYear() === value.end.getFullYear();
    const sameMonth = value.start.getMonth() === value.end.getMonth();

    if (sameYear && sameMonth) {
      return value.start.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    }

    if (sameYear) {
      return `${value.start.toLocaleDateString("en-US", {
        month: "short",
      })} - ${value.end.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}`;
    }

    return `${value.start.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })} - ${value.end.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate("prev")}
        className="p-2 hover:bg-muted rounded"
        title={`Previous ${step}`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="text-sm font-medium min-w-[200px] text-center">
        {getRangeLabel()}
      </div>

      <button
        onClick={() => navigate("next")}
        className="p-2 hover:bg-muted rounded"
        title={`Next ${step}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Hook for managing date range in analytics
 */
export function useAnalyticsDateRange() {
  const [primaryRange, setPrimaryRange] = useState(() => {
    const preset = DATE_RANGE_PRESETS.find((p) => p.id === "last-30-days");
    return preset ? preset.range() : DATE_RANGE_PRESETS[0].range();
  });

  const [comparisonRange, setComparisonRange] = useState(() => {
    const preset = DATE_RANGE_PRESETS.find((p) => p.id === "last-30-days");
    if (!preset) return DATE_RANGE_PRESETS[0].range();

    const range = preset.range();
    // Calculate previous period
    const duration = range.end.getTime() - range.start.getTime();
    return {
      start: new Date(range.start.getTime() - duration),
      end: new Date(range.end.getTime() - duration),
    };
  });

  const setPreset = useCallback((presetId: string) => {
    const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const newRange = preset.range();
      setPrimaryRange(newRange);

      // Update comparison range to match duration
      const duration = newRange.end.getTime() - newRange.start.getTime();
      setComparisonRange({
        start: new Date(newRange.start.getTime() - duration),
        end: new Date(newRange.end.getTime() - duration),
      });
    }
  }, []);

  return {
    primaryRange,
    setPrimaryRange,
    comparisonRange,
    setComparisonRange,
    setPreset,
  };
}
