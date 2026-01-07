import { ReviewRating, PreviewIntervals, formatInterval } from "../../api/review";
import { RotateCcw, ThumbsDown, ThumbsUp, Zap } from "lucide-react";

interface RatingButtonsProps {
  onSelectRating: (rating: ReviewRating) => void;
  disabled?: boolean;
  previewIntervals?: PreviewIntervals | null;
}

export function RatingButtons({
  onSelectRating,
  disabled = false,
  previewIntervals,
}: RatingButtonsProps) {
  const ratings: {
    value: ReviewRating;
    label: string;
    icon: typeof RotateCcw;
    color: string;
    description: string;
  }[] = [
    {
      value: 1,
      label: "Again",
      icon: RotateCcw,
      color: "bg-red-500 hover:bg-red-600",
      description: "Forgot, will see again soon",
    },
    {
      value: 2,
      label: "Hard",
      icon: ThumbsDown,
      color: "bg-orange-500 hover:bg-orange-600",
      description: "Difficult, barely remembered",
    },
    {
      value: 3,
      label: "Good",
      icon: ThumbsUp,
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Remembered correctly",
    },
    {
      value: 4,
      label: "Easy",
      icon: Zap,
      color: "bg-green-500 hover:bg-green-600",
      description: "Easy, knew it well",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {ratings.map((rating) => {
          const Icon = rating.icon;
          const interval = previewIntervals
            ? formatInterval(
                previewIntervals[
                  rating.value === 1
                    ? "again"
                    : rating.value === 2
                      ? "hard"
                      : rating.value === 3
                        ? "good"
                        : "easy"
                ]
              )
            : null;

          return (
            <button
              key={rating.value}
              onClick={() => onSelectRating(rating.value)}
              disabled={disabled}
              className={`
                ${rating.color}
                text-white rounded-lg p-4 transition-all
                hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                flex flex-col items-center gap-2
              `}
              title={rating.description}
            >
              <Icon className="w-6 h-6" />
              <span className="font-semibold">{rating.label}</span>
              {interval && (
                <span className="text-xs opacity-90">{interval}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">1</kbd>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">2</kbd>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">3</kbd>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">4</kbd>
        to rate
      </div>
    </div>
  );
}
