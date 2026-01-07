import { Clock, CheckCircle2, TrendingUp, Flame, Timer } from "lucide-react";

interface ReviewProgressProps {
  currentIndex: number;
  totalCards: number;
  reviewsCompleted: number;
  correctCount: number;
  estimatedTimeRemaining?: number;
  streak?: {
    current_streak: number;
    longest_streak: number;
  } | null;
}

export function ReviewProgress({
  currentIndex,
  totalCards,
  reviewsCompleted,
  correctCount,
  estimatedTimeRemaining,
  streak,
}: ReviewProgressProps) {
  const remainingCards = totalCards - currentIndex;
  const accuracy = reviewsCompleted > 0
    ? Math.round((correctCount / reviewsCompleted) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 space-y-3">
      {/* Streak Display */}
      {streak && streak.current_streak > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">
            {streak.current_streak} day streak
          </span>
          {streak.longest_streak > 1 && (
            <span className="text-xs text-muted-foreground">
              (best: {streak.longest_streak} days)
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${totalCards > 0 ? (currentIndex / totalCards) * 100 : 0}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{remainingCards} left</span>
          </div>
          {estimatedTimeRemaining !== undefined && remainingCards > 0 && (
            <div className="flex items-center gap-1" title="Estimated time remaining">
              <Timer className="w-4 h-4" />
              <span>{formatTime(estimatedTimeRemaining)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{reviewsCompleted} done</span>
          </div>
        </div>
        {reviewsCompleted > 0 && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{accuracy}% correct</span>
          </div>
        )}
      </div>
    </div>
  );
}
