import { Flame } from "lucide-react";

interface StudyStreakProps {
  streak: number;
}

export function StudyStreak({ streak }: StudyStreakProps) {
  const getStreakMessage = () => {
    if (streak === 0) return "Start your streak today!";
    if (streak < 7) return "Keep going!";
    if (streak < 30) return "Great consistency!";
    if (streak < 100) return "Amazing dedication!";
    return "Incredible commitment!";
  };

  const getFlameColor = () => {
    if (streak === 0) return "text-muted-foreground";
    if (streak < 7) return "text-orange-500";
    if (streak < 30) return "text-orange-400";
    if (streak < 100) return "text-red-500";
    return "text-red-600";
  };

  const getFlameSize = () => {
    if (streak >= 100) return "w-12 h-12";
    if (streak >= 30) return "w-10 h-10";
    return "w-8 h-8";
  };

  return (
    <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center ${getFlameSize()}`}>
          <Flame className={`w-full h-full ${getFlameColor()}`} />
        </div>

        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Study Streak</p>
          <p className="text-2xl font-bold text-foreground">
            {streak} day{streak !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {getStreakMessage()}
          </p>
        </div>

        {streak > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best</div>
            <div className="text-lg font-semibold text-foreground">{streak}</div>
          </div>
        )}
      </div>
    </div>
  );
}
