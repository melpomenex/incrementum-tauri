/**
 * Streak Badge Component
 * Compact display of reading streak
 */

import { useState, useEffect } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { getReadingStreak, type ReadingStreak } from '../../api/readingGoals';
import { formatStreakDays, getStreakMilestone, getStreakColor } from '../../types/readingGoal';

interface StreakBadgeProps {
  className?: string;
  showLabel?: boolean;
  showMilestone?: boolean;
  onClick?: () => void;
}

export function StreakBadge({
  className = '',
  showLabel = true,
  showMilestone = false,
  onClick,
}: StreakBadgeProps) {
  const [streak, setStreak] = useState<ReadingStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const data = await getReadingStreak();
      setStreak(data);
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streak || streak.currentStreak === 0) {
    return null;
  }

  const milestone = getStreakMilestone(streak.currentStreak);
  const streakColor = getStreakColor(streak.currentStreak);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-200 dark:border-orange-800 rounded-lg ${className} ${onClick ? 'cursor-pointer hover:from-orange-500/20 hover:to-yellow-500/20' : ''}`}
    >
      <Flame className={`w-4 h-4 ${streakColor}`} />
      <span className={`text-sm font-bold ${streakColor}`}>
        {streak.currentStreak}
      </span>
      {showLabel && (
        <span className="text-xs text-foreground-secondary">
          {formatStreakDays(streak.currentStreak)}
        </span>
      )}
      {showMilestone && milestone && (
        <span className="text-xs text-muted-foreground ml-1">
          {milestone.icon} {milestone.label}
        </span>
      )}
    </button>
  );
}

/**
 * Mini streak indicator for use in headers and stats
 */
export function MiniStreak({ className = '' }: { className?: string }) {
  const [streak, setStreak] = useState<ReadingStreak | null>(null);

  useEffect(() => {
    getReadingStreak().then(setStreak).catch(console.error);
  }, []);

  if (!streak || streak.currentStreak === 0) {
    return null;
  }

  const streakColor = getStreakColor(streak.currentStreak);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Flame className={`w-3.5 h-3.5 ${streakColor}`} />
      <span className={`text-xs font-semibold ${streakColor}`}>
        {streak.currentStreak}
      </span>
    </div>
  );
}

/**
 * Streak calendar showing activity heatmap
 */
export function StreakCalendar({ className = '' }: { className?: string }) {
  const [streak, setStreak] = useState<ReadingStreak | null>(null);

  useEffect(() => {
    getReadingStreak().then(setStreak).catch(console.error);
  }, []);

  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  // Mock activity data - TODO: Fetch from API
  const getActivity = (date: Date) => {
    const dayOfWeek = date.getDay();
    // Weekend pattern for demo
    return dayOfWeek === 0 || dayOfWeek === 6 ? Math.random() > 0.3 : Math.random() > 0.6;
  };

  return (
    <div className={`p-4 bg-card border border-border rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-foreground">Reading Activity</span>
        </div>
        {streak && streak.currentStreak > 0 && (
          <div className="text-xs text-foreground-secondary">
            {streak.currentStreak} day streak
          </div>
        )}
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-10 gap-1">
        {days.map((date, i) => {
          const isActive = getActivity(date);
          const isToday = i === days.length - 1;
          return (
            <div
              key={i}
              className={`aspect-square rounded-sm ${
                isToday
                  ? 'ring-1 ring-primary'
                  : ''
              } ${
                isActive
                  ? 'bg-orange-500'
                  : 'bg-muted'
              }`}
              title={date.toLocaleDateString()}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-foreground-secondary">
        <span>Less</span>
        <div className="w-3 h-3 bg-muted rounded-sm" />
        <div className="w-3 h-3 bg-orange-500 rounded-sm" />
        <span>More</span>
      </div>
    </div>
  );
}
