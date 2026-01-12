import { useState, useEffect, useCallback } from "react";
import { cn } from "../../utils";
import { submitReview, previewReviewIntervals, type ReviewRating, type PreviewIntervals, RATING_LABELS, formatInterval } from "../../api/review";

export interface HoverRatingControlsProps {
  itemId?: string | null;
  documentId?: string;
  onRatingSubmitted?: (rating: ReviewRating) => void;
  disabled?: boolean;
  forceVisible?: boolean;
  context: "review" | "document";
  previewIntervals?: PreviewIntervals | null;
  className?: string;
}

// Rating colors from the plan
const RATING_COLORS: Record<ReviewRating, { bg: string; hover: string; text: string }> = {
  1: { bg: "#B00020", hover: "#8B0018", text: "text-white" },     // Again - red
  2: { bg: "#F57C00", hover: "#C56300", text: "text-white" },     // Hard - orange
  3: { bg: "#388E3C", hover: "#2C702F", text: "text-white" },     // Good - green
  4: { bg: "#1976D2", hover: "#1464B8", text: "text-white" },     // Easy - blue
};

const RATING_SHORTCUTS: Record<ReviewRating, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};

export function HoverRatingControls({
  itemId,
  documentId,
  onRatingSubmitted,
  disabled = false,
  forceVisible = false,
  context,
  previewIntervals: initialPreviewIntervals = null,
  className,
}: HoverRatingControlsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewIntervals, setPreviewIntervals] = useState<PreviewIntervals | null>(initialPreviewIntervals);
  const [hoverZoneActive, setHoverZoneActive] = useState(false);

  // Load preview intervals when itemId changes
  useEffect(() => {
    if (itemId && context === "review") {
      previewReviewIntervals(itemId)
        .then(setPreviewIntervals)
        .catch((err) => console.error("Failed to load preview intervals:", err));
    }
  }, [itemId, context]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (disabled || !isVisible && !forceVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle 1-4 keys
      if (e.key >= "1" && e.key <= "4") {
        const rating = parseInt(e.key) as ReviewRating;
        handleRating(rating);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, isVisible, forceVisible]);

  const handleRating = useCallback(async (rating: ReviewRating) => {
    if (disabled || isSubmitting) return;
    if (context === "review" && !itemId) return;

    setIsSubmitting(true);
    try {
      // In document context, we still submit but might not have a learning item
      if (context === "review") {
        await submitReview(itemId, rating, 0);
      }

      onRatingSubmitted?.(rating);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, isSubmitting, itemId, context, onRatingSubmitted]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none",
        className
      )}
      onMouseEnter={() => setHoverZoneActive(true)}
      onMouseLeave={() => setHoverZoneActive(false)}
    >
      {/* Large invisible hover zone */}
      <div
        className="h-32 w-full pointer-events-auto"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />

      {/* Rating controls */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border",
          "transition-all duration-200 ease-out pointer-events-auto",
          (isVisible || forceVisible || hoverZoneActive)
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        )}
        style={{ zIndex: 50 }}
      >
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3">
            {(Object.keys(RATING_LABELS) as Array<keyof typeof RATING_LABELS>).map((ratingKey) => {
              const rating = parseInt(ratingKey) as ReviewRating;
              const colors = RATING_COLORS[rating];
              const label = RATING_LABELS[rating];
              const shortcut = RATING_SHORTCUTS[rating];
              const interval = previewIntervals?.[rating === 1 ? "again" : rating === 2 ? "hard" : rating === 3 ? "good" : "easy"];

              return (
                <button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  disabled={disabled || isSubmitting}
                  className={cn(
                    "flex flex-col items-center gap-1 px-6 py-3 rounded-lg",
                    "transition-all duration-150 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "hover:shadow-md hover:-translate-y-0.5",
                    colors.text
                  )}
                  style={{
                    backgroundColor: colors.bg,
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSubmitting) {
                      e.currentTarget.style.backgroundColor = colors.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bg;
                  }}
                  title={`${label} (${shortcut})`}
                >
                  <span className="text-lg font-bold">{label}</span>
                  <span className="text-xs opacity-80">[{shortcut}]</span>
                  {context === "review" && interval !== undefined && (
                    <span className="text-xs opacity-70">
                      {formatInterval(interval)}
                    </span>
                  )}
                </button>
              );
            })}

            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Submitting...
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="text-center mt-2 text-xs text-muted-foreground">
            Press 1-4 to rate • Hover near bottom to show controls
          </div>
        </div>
      </div>
    </div>
  );
}
