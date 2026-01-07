import { CheckCircle2, Home, Flame, Trophy, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReviewCompleteProps {
  reviewsCompleted: number;
  correctCount: number;
  sessionStartTime: number;
  streak?: {
    current_streak: number;
    longest_streak: number;
  } | null;
}

export function ReviewComplete({
  reviewsCompleted,
  correctCount,
  sessionStartTime,
  streak,
}: ReviewCompleteProps) {
  const navigate = useNavigate();
  const accuracy = reviewsCompleted > 0
    ? Math.round((correctCount / reviewsCompleted) * 100)
    : 0;
  const duration = Math.round((Date.now() - sessionStartTime) / 1000 / 60); // in minutes

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Review Complete!
      </h2>
      <p className="text-muted-foreground mb-8">
        Great job! You've reviewed all your due cards.
      </p>

      {/* Streak Achievement */}
      {streak && streak.current_streak > 0 && (
        <div className="mb-6 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-lg inline-flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">
            {streak.current_streak} day streak!
          </span>
          {streak.current_streak === streak.longest_streak && streak.longest_streak > 1 && (
            <Trophy className="w-4 h-4 text-yellow-500 ml-1" title="New personal best!" />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {reviewsCompleted}
            </div>
            <div className="text-sm text-muted-foreground">Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {accuracy}%
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {duration}m
            </div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {correctCount}
            </div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {reviewsCompleted - correctCount}
            </div>
            <div className="text-xs text-muted-foreground">Needs Review</div>
          </div>
        </div>

        {/* Average Time Per Card */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {reviewsCompleted > 0
              ? `${Math.round(duration * 60 / reviewsCompleted)}s per card`
              : "--"
            }
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate("/queue")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Back to Queue
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
