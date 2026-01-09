import { useEffect, useState, useCallback } from "react";
import { useReviewStore } from "../stores/reviewStore";
import { invoke } from "@tauri-apps/api/core";
import {
  RotateCcw,
  RotateCw,
  ArrowRight,
  Check,
  X,
  Clock,
  Star,
  Play,
  Pause,
} from "lucide-react";

type Rating = "again" | "hard" | "good" | "easy";

const ratingConfig: Record<
  Rating,
  { label: string; color: string; shortcut: string; icon: React.ReactNode }
> = {
  again: {
    label: "Again",
    color: "bg-red-500 hover:bg-red-600",
    shortcut: "1",
    icon: <RotateCcw className="w-4 h-4" />,
  },
  hard: {
    label: "Hard",
    color: "bg-orange-500 hover:bg-orange-600",
    shortcut: "2",
    icon: <RotateCw className="w-4 h-4" />,
  },
  good: {
    label: "Good",
    color: "bg-green-500 hover:bg-green-600",
    shortcut: "3",
    icon: <Check className="w-4 h-4" />,
  },
  easy: {
    label: "Easy",
    color: "bg-blue-500 hover:bg-blue-600",
    shortcut: "4",
    icon: <Star className="w-4 h-4" />,
  },
};

export function ReviewPage() {
  const {
    currentCard,
    isShowingAnswer,
    reviewStats,
    sessionActive,
    isLoading,
    startReview,
    submitReview,
    showAnswer,
    skipCard,
  } = useReviewStore();

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    startReview();
  }, [startReview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isShowingAnswer && currentCard) {
          showAnswer();
        }
      } else if (e.key === "Escape") {
        setIsPaused(!isPaused);
      } else if (isShowingAnswer && currentCard) {
        const rating = e.key as Rating;
        if (["1", "2", "3", "4"].includes(rating)) {
          const ratingKey = ["again", "hard", "good", "easy"][parseInt(rating) - 1] as Rating;
          await handleRating(ratingKey);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isShowingAnswer, currentCard, isPaused]);

  const handleRating = useCallback(
    async (rating: Rating) => {
      await submitReview(rating);
    },
    [submitReview]
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!sessionActive || !currentCard) {
    return <ReviewComplete stats={reviewStats} />;
  }

  if (isPaused) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center p-8 bg-card border border-border rounded">
          <Pause className="w-12 h-12 mx-auto mb-4 text-foreground-secondary" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Review Paused</h2>
          <p className="text-sm text-foreground-secondary mb-4">
            Press Escape to continue
          </p>
          <button
            onClick={() => setIsPaused(false)}
            className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90"
          >
            Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Stats Bar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-foreground-secondary">Remaining:</span>{" "}
            <span className="font-semibold text-foreground">
              {reviewStats?.remaining || 0}
            </span>
          </div>
          <div>
            <span className="text-foreground-secondary">Reviewed:</span>{" "}
            <span className="font-semibold text-foreground">
              {reviewStats?.reviewed || 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-foreground-secondary">
            Space/Enter: Show answer • 1-4: Rate • Esc: Pause
          </div>
          <button
            onClick={() => skipCard()}
            className="px-3 py-1 bg-background border border-border rounded text-sm hover:bg-muted"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Question */}
            <div
              className={`p-8 min-h-[300px] flex items-center justify-center text-center ${
                isShowingAnswer ? "border-b border-border" : ""
              }`}
            >
              <div>
                {currentCard.cardType === "cloze" && (
                  <div className="text-xs text-foreground-secondary mb-2 uppercase">
                    Cloze Deletion
                  </div>
                )}
                <div className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentCard.question}
                </div>
                {!isShowingAnswer && (
                  <div className="mt-6 text-xs text-foreground-secondary">
                    Press Space or Enter to reveal
                  </div>
                )}
              </div>
            </div>

            {/* Answer */}
            {isShowingAnswer && (
              <div className="p-8 min-h-[200px] flex items-center justify-center text-center bg-muted/30">
                <div>
                  <div className="text-xs text-foreground-secondary mb-4 uppercase">
                    Answer
                  </div>
                  <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentCard.answer}
                  </div>
                  {currentCard.extractContent && (
                    <div className="mt-4 p-3 bg-background border border-border rounded text-sm text-foreground-secondary">
                      <div className="text-xs text-foreground-secondary mb-2">
                        From: {currentCard.documentTitle}
                      </div>
                      <div className="line-clamp-3">{currentCard.extractContent}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!isShowingAnswer && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={showAnswer}
                className="px-6 py-3 bg-primary-300 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                Show Answer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rating Buttons */}
      {isShowingAnswer && (
        <div className="p-6 bg-card border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(ratingConfig) as Rating[]).map((rating) => {
                const config = ratingConfig[rating];
                return (
                  <button
                    key={rating}
                    onClick={() => handleRating(rating)}
                    className={`p-4 ${config.color} text-white rounded-lg flex flex-col items-center gap-1 transition-opacity hover:opacity-90`}
                  >
                    {config.icon}
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs opacity-75">{config.shortcut}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewComplete({ stats }: { stats: any }) {
  return (
    <div className="h-full flex items-center justify-center bg-cream">
      <div className="text-center p-8 bg-card border border-border rounded max-w-md">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Review Complete!
        </h2>
        <p className="text-sm text-foreground-secondary mb-6">
          Great job! You've reviewed all cards for now.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.reviewed || 0}
            </div>
            <div className="text-xs text-foreground-secondary">Reviewed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.correct || 0}
            </div>
            <div className="text-xs text-foreground-secondary">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {Math.round((stats?.correct || 0) / Math.max(1, stats?.reviewed || 1) * 100)}%
            </div>
            <div className="text-xs text-foreground-secondary">Accuracy</div>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90"
          >
            Start New Review
          </button>
        </div>
      </div>
    </div>
  );
}
