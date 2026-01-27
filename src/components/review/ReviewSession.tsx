import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useReviewStore, type ReviewDocumentItem, type ReviewSessionItem } from "../../stores/reviewStore";
import { ReviewCard } from "./ReviewCard";
import { ReviewDocumentCard } from "./ReviewDocumentCard";
import { RatingButtons } from "./RatingButtons";
import { ReviewProgress } from "./ReviewProgress";
import { ReviewComplete } from "./ReviewComplete";
import { ReviewTransparencyPanel } from "./ReviewTransparencyPanel";
import { QueueNavigationControls } from "../queue/QueueNavigationControls";
import { ReviewRating } from "../../api/review";
import { ReviewFeedback } from "./ReviewFeedback";
import { ReviewCardSkeleton } from "../common/Skeleton";

interface ReviewSessionProps {
  onExit: () => void;
}

export function ReviewSession({ onExit }: ReviewSessionProps) {
  const {
    currentCard,
    queue,
    isLoading,
    isAnswerShown,
    isSubmitting,
    error,
    reviewsCompleted,
    correctCount,
    sessionStartTime,
    averageTimePerCard,
    currentIndex,
    streak,
    previewIntervals,
    getEstimatedTimeRemaining,
    showAnswer,
    submitRating,
    nextCard,
    goToIndex,
  } = useReviewStore();
  const [isQueueListOpen, setIsQueueListOpen] = useState(false);
  const queueListRef = useRef<HTMLDivElement | null>(null);

  const isDocumentItem = (item: ReviewSessionItem | null): item is ReviewDocumentItem =>
    !!item && (item as ReviewDocumentItem).itemType === "document";

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: "streak" | "milestone" | "complete" | "mastered" | null;
    value?: number;
  }>({ type: null });

  const handleRating = async (rating: ReviewRating) => {
    const beforeId = currentCard?.id;
    
    // Check for milestones before submitting
    const currentStreak = streak;
    const willComplete = currentIndex >= queue.length - 1;
    
    await submitRating(rating);
    if (!beforeId) return;

    // Show feedback for milestones
    if (willComplete) {
      setFeedback({ type: "complete" });
    } else if (currentStreak?.current_streak && currentStreak.current_streak > 0 && currentStreak.current_streak % 10 === 0) {
      setFeedback({ type: "streak", value: currentStreak.current_streak });
    }

    const afterId = useReviewStore.getState().currentCard?.id;
    if (afterId === beforeId) {
      nextCard();
    }
  };

  useEffect(() => {
    if (!isQueueListOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!queueListRef.current) return;
      if (e.target instanceof Node && queueListRef.current.contains(e.target)) {
        return;
      }
      setIsQueueListOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQueueListOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isQueueListOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space to show answer for learning items
      if (e.key === " " && !isAnswerShown && currentCard && !isDocumentItem(currentCard)) {
        e.preventDefault();
        showAnswer();
      }

      // Number keys for rating (only when answer is shown)
      if (isAnswerShown && currentCard && !isSubmitting) {
        if (e.key === "1") handleRating(1 as ReviewRating);
        if (e.key === "2") handleRating(2 as ReviewRating);
        if (e.key === "3") handleRating(3 as ReviewRating);
        if (e.key === "4") handleRating(4 as ReviewRating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAnswerShown, currentCard, isSubmitting, showAnswer, submitRating, nextCard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <ReviewCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Error Loading Review
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Review Home
          </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            All Caught Up!
          </h3>
          <p className="text-muted-foreground mb-6">
            No items are due for review right now. Check back later!
          </p>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Review Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    // Review session complete
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-6">
        <ReviewComplete
          reviewsCompleted={reviewsCompleted}
          correctCount={correctCount}
          sessionStartTime={sessionStartTime}
          streak={streak || undefined}
        />
        <button
          onClick={onExit}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Back to Review Home
        </button>
      </div>
    );
  }

  const estimatedSecondsRemaining = getEstimatedTimeRemaining();
  const perItemSeconds = averageTimePerCard > 0 ? averageTimePerCard : 30;
  const remainingItems = queue.length - currentIndex;
  const safeStopCount = Math.max(1, Math.min(remainingItems, Math.floor((20 * 60) / perItemSeconds)));
  const minMinutes = Math.max(1, Math.round((estimatedSecondsRemaining / 60) * 0.85));
  const maxMinutes = Math.max(1, Math.round((estimatedSecondsRemaining / 60) * 1.15));
  const isCurrentDocument = isDocumentItem(currentCard);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onExit}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground min-h-[44px] md:min-h-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-3 md:w-3" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Review</h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
              Focused session with clear time and retention feedback
            </p>
          </div>
        </div>

        {/* Queue Navigation */}
        {queue.length > 0 && (
          <div className="relative">
            <QueueNavigationControls
              currentDocumentIndex={currentIndex}
              totalDocuments={queue.length}
              hasMoreChunks={queue.length > 0}
              onPreviousDocument={() => goToIndex(currentIndex - 1)}
              onNextDocument={() => goToIndex(currentIndex + 1)}
              onNextChunk={() => setIsQueueListOpen((prev) => !prev)}
              listButtonLabel="Review Queue"
              disabled={isSubmitting}
            />

            {isQueueListOpen && (
              <div
                ref={queueListRef}
                className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50"
              >
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  Review Queue
                </div>
                <div className="max-h-80 overflow-auto">
                  {queue.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        goToIndex(index);
                        setIsQueueListOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        index === currentIndex
                          ? "bg-muted text-foreground"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {index + 1} / {queue.length}
                      </div>
                      <div className="line-clamp-2">
                        {"documentTitle" in item ? (
                          item.documentTitle || "Untitled document"
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: item.question || item.cloze_text || "Untitled card" }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1">
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div>
              Time remaining: <span className="text-foreground font-semibold">{minMinutes}-{maxMinutes} min</span>
            </div>
            <div>
              Items remaining: <span className="text-foreground font-semibold">{remainingItems}</span>
            </div>
            <div>
              Safe stop after: <span className="text-foreground font-semibold">{safeStopCount} items</span>
            </div>
            <div>
              Session goal: <span className="text-foreground font-semibold">Retention maintenance</span>
            </div>
          </div>

          {/* Progress */}
          <ReviewProgress
            currentIndex={currentIndex}
            totalCards={queue.length}
            reviewsCompleted={reviewsCompleted}
            correctCount={correctCount}
            estimatedTimeRemaining={getEstimatedTimeRemaining()}
            streak={streak}
          />

          {/* Card and Ratings */}
          <div className="flex-1 flex flex-col justify-center">
            {isCurrentDocument ? (
              <>
                <ReviewDocumentCard item={currentCard as ReviewDocumentItem} />

                <div className="mt-6">
                  <RatingButtons
                    onSelectRating={handleRating}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            ) : isAnswerShown ? (
              <>
                {/* Card with answer shown */}
                <ReviewCard
                  card={currentCard as Exclude<ReviewSessionItem, ReviewDocumentItem>}
                  showAnswer={true}
                  onShowAnswer={() => {}}
                />

                {/* Rating Buttons */}
                <div className="mt-6">
                  <RatingButtons
                    onSelectRating={handleRating}
                    disabled={isSubmitting}
                    previewIntervals={previewIntervals}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Card with answer hidden */}
                <ReviewCard
                  card={currentCard as Exclude<ReviewSessionItem, ReviewDocumentItem>}
                  showAnswer={false}
                  onShowAnswer={showAnswer}
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!isCurrentDocument && (
            <ReviewTransparencyPanel
              card={currentCard as Exclude<ReviewSessionItem, ReviewDocumentItem>}
              previewIntervals={previewIntervals}
            />
          )}
          <div className="bg-card border border-border rounded-lg p-4 text-xs text-muted-foreground">
            Session cut-off guarantee: you can stop after item {safeStopCount} without penalty.
          </div>
        </div>
      </div>

      {/* Feedback Overlay */}
      <ReviewFeedback
        type={feedback.type}
        value={feedback.value}
        onClose={() => setFeedback({ type: null })}
      />
    </div>
  );
}
