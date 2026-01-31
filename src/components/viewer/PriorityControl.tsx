/**
 * Document Priority Control
 * 
 * Allows users to set the priority of a document, which affects:
 * 1. How often it appears in the queue (higher = more frequent)
 * 2. How "Hard" ratings are handled (high priority = shorter max interval)
 * 
 * UI/UX Principles:
 * - Clean, unobtrusive design
 * - Clear visual feedback
 * - Preset buttons for quick selection
 * - Slider for fine-tuning
 * - Immediate save on interaction
 */

import { useState, useCallback } from "react";
import { cn } from "../../utils";
import { Flag, ChevronUp, ChevronDown } from "lucide-react";
import { updateDocumentPriority } from "../../api/documents";

interface PriorityControlProps {
  documentId: string;
  prioritySlider?: number; // 0-100
  priorityRating?: number; // 1-5
  onPriorityChange?: (slider: number, rating: number) => void;
  className?: string;
  variant?: "compact" | "full";
}

// Priority presets with labels and colors
const PRIORITY_PRESETS = [
  { value: 10, label: "Lowest", color: "#6B7280", description: "Review rarely" },
  { value: 30, label: "Low", color: "#9CA3AF", description: "Review occasionally" },
  { value: 50, label: "Normal", color: "#3B82F6", description: "Standard frequency" },
  { value: 70, label: "High", color: "#F59E0B", description: "Review frequently" },
  { value: 90, label: "Highest", color: "#EF4444", description: "Review often" },
];

function getPriorityInfo(slider: number) {
  if (slider >= 81) return PRIORITY_PRESETS[4];
  if (slider >= 61) return PRIORITY_PRESETS[3];
  if (slider >= 41) return PRIORITY_PRESETS[2];
  if (slider >= 21) return PRIORITY_PRESETS[1];
  return PRIORITY_PRESETS[0];
}

function sliderToRating(slider: number): number {
  // Convert 0-100 slider to 1-5 rating
  if (slider >= 81) return 5;
  if (slider >= 61) return 4;
  if (slider >= 41) return 3;
  if (slider >= 21) return 2;
  return 1;
}

export function PriorityControl({
  documentId,
  prioritySlider = 50,
  priorityRating = 3,
  onPriorityChange,
  className,
  variant = "compact",
}: PriorityControlProps) {
  const [slider, setSlider] = useState(prioritySlider);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentInfo = getPriorityInfo(slider);

  const handleSliderChange = useCallback(async (newSlider: number) => {
    setSlider(newSlider);
    const newRating = sliderToRating(newSlider);
    
    setIsSaving(true);
    try {
      await updateDocumentPriority(documentId, newRating, newSlider);
      onPriorityChange?.(newSlider, newRating);
    } catch (error) {
      console.error("Failed to update priority:", error);
      // Could show toast here
    } finally {
      setIsSaving(false);
    }
  }, [documentId, onPriorityChange]);

  const handlePresetClick = useCallback((presetValue: number) => {
    handleSliderChange(presetValue);
    if (variant === "compact") {
      setIsExpanded(false);
    }
  }, [handleSliderChange, variant]);

  if (variant === "compact") {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isExpanded && "bg-muted"
          )}
          title={`Priority: ${currentInfo.label} - ${currentInfo.description}`}
        >
          <Flag 
            className="h-4 w-4" 
            style={{ color: currentInfo.color }}
            fill={currentInfo.color}
          />
          <span className="text-muted-foreground">{currentInfo.label}</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Set Priority</span>
                  {isSaving && (
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  )}
                </div>
                
                {/* Preset buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {PRIORITY_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetClick(preset.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        slider === preset.value && "bg-muted ring-1 ring-ring"
                      )}
                      title={preset.description}
                    >
                      <Flag 
                        className="h-4 w-4" 
                        style={{ color: preset.color }}
                        fill={preset.color}
                      />
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Fine-tune slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fine-tune</span>
                    <span className="font-medium" style={{ color: currentInfo.color }}>
                      {slider}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={slider}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    style={{ accentColor: currentInfo.color }}
                  />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground text-center">
                  {currentInfo.description}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Reading Priority</span>
        {isSaving && (
          <span className="text-xs text-muted-foreground ml-auto">Saving...</span>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRIORITY_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              slider === preset.value 
                ? "border-ring bg-muted" 
                : "border-border bg-card"
            )}
          >
            <Flag 
              className="h-4 w-4" 
              style={{ color: preset.color }}
              fill={preset.color}
            />
            <span className="text-xs font-medium">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Adjust</span>
          <span className="font-medium" style={{ color: currentInfo.color }}>
            {slider}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={slider}
          onChange={(e) => handleSliderChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: currentInfo.color }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {currentInfo.description}. Higher priority items appear more frequently in your queue.
      </p>
    </div>
  );
}
