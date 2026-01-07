import { useEffect } from "react";
import { useReviewStore } from "../../stores/reviewStore";
import { ReviewCard } from "../../components/review/ReviewCard";
import { RatingButtons } from "../../components/review/RatingButtons";
import { ReviewProgress } from "../../components/review/ReviewProgress";
import { ReviewComplete } from "../../components/review/ReviewComplete";
import { AlertCircle } from "lucide-react";
import { ReviewRating } from "../../api/review";

export function ReviewTab() {
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
    currentIndex,
    streak,
    getEstimatedTimeRemaining,
    loadQueue,
    showAnswer,
    submitRating,
    resetSession,
  } = useReviewStore();

  useEffect(() => {
    loadQueue();
    return () => {
      resetSession();
    };
  }, []);

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
        if (e.key === "1") submitRating(1 as ReviewRating);
        if (e.key === "2") submitRating(2 as ReviewRating);
        if (e.key === "3") submitRating(3 as ReviewRating);
        if (e.key === "4") submitRating(4 as ReviewRating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAnswerShown, currentCard, isSubmitting, showAnswer, submitRating]);

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
            onClick={loadQueue}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Try Again
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
        </div>
      </div>
    );
  }

  if (!currentCard) {
    // Review session complete
    return (
      <div className="flex items-center justify-center h-full p-6">
        <ReviewComplete
          reviewsCompleted={reviewsCompleted}
          correctCount={correctCount}
          sessionStartTime={sessionStartTime}
          streak={streak || undefined}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Review</h1>
        <p className="text-muted-foreground">
          Practice with spaced repetition
        </p>
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
                onSelectRating={submitRating}
                disabled={isSubmitting}
                previewIntervals={null} // TODO: Add preview intervals
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
  );
}
