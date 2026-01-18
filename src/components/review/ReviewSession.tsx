import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useReviewStore } from "../../stores/reviewStore";
import { ReviewCard } from "./ReviewCard";
import { RatingButtons } from "./RatingButtons";
import { ReviewProgress } from "./ReviewProgress";
import { ReviewComplete } from "./ReviewComplete";
import { ReviewTransparencyPanel } from "./ReviewTransparencyPanel";
import { QueueNavigationControls } from "../queue/QueueNavigationControls";
import { ReviewRating } from "../../api/review";
import { useStudyDeckStore } from "../../stores/studyDeckStore";

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
  const decks = useStudyDeckStore((state) => state.decks);
  const activeDeckId = useStudyDeckStore((state) => state.activeDeckId);
  const activeDeck = decks.find((deck) => deck.id === activeDeckId) ?? null;

  const [isQueueListOpen, setIsQueueListOpen] = useState(false);
  const queueListRef = useRef<HTMLDivElement | null>(null);

  const handleRating = async (rating: ReviewRating) => {
    const beforeId = currentCard?.id;
    await submitRating(rating);
    if (!beforeId) return;

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

      // Space to show answer
      if (e.key === " " && !isAnswerShown && currentCard) {
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-muted-foreground">Loading review queue...</div>
        </div>
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
            No cards are due for review right now. Check back later!
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

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review</h1>
            <p className="text-muted-foreground">
              Focused session with clear time and retention feedback
            </p>
            {activeDeck && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                Deck: <span className="font-semibold">{activeDeck.name}</span>
              </div>
            )}
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
                      <div
                        className="line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: item.question || item.cloze_text || "Untitled card" }}
                      />
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
            {isAnswerShown ? (
              <>
                {/* Card with answer shown */}
                <ReviewCard
                  card={currentCard}
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
                  card={currentCard}
                  showAnswer={false}
                  onShowAnswer={showAnswer}
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ReviewTransparencyPanel card={currentCard} previewIntervals={previewIntervals} />
          <div className="bg-card border border-border rounded-lg p-4 text-xs text-muted-foreground">
            Session cut-off guarantee: you can stop after item {safeStopCount} without penalty.
          </div>
        </div>
      </div>
    </div>
  );
}
