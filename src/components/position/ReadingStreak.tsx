/**
 * ReadingStreak Component
 *
 * Displays reading streak information with heatmap visualization.
 */

import { useEffect, useState } from 'react';
import { getDailyReadingStats } from '../../api/position';
import type { DailyReadingStats } from '../../types/position';

interface ReadingStreakProps {
  days?: number;
  showHeatmap?: boolean;
  showStreakCount?: boolean;
  className?: string;
}

export function ReadingStreak({
  days = 30,
  showHeatmap = true,
  showStreakCount = true,
  className = '',
}: ReadingStreakProps) {
  const [stats, setStats] = useState<DailyReadingStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await getDailyReadingStats(days);
      setStats(result);
    } catch (err) {
      console.error('Failed to load reading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate streak
  const streak = calculateStreak(stats);
  const longestStreak = calculateLongestStreak(stats);
  const todayMinutes = stats.length > 0 ? stats[0].total_seconds / 60 : 0;

  return (
    <div className={`reading-streak ${className}`}>
      <div className="flex items-center gap-6">
        {/* Current Streak */}
        {showStreakCount && (
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">
              {streak}
              <span className="text-lg text-gray-500 ml-1">days</span>
            </div>
            <div className="text-xs text-gray-500">Current streak</div>
          </div>
        )}

        {/* Fire emoji for active streak */}
        {streak >= 7 && (
          <div className="text-4xl animate-pulse" title={`${streak} day streak!`}>
            {getStreakEmoji(streak)}
          </div>
        )}

        {/* Today's reading time */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {Math.round(todayMinutes)}
            <span className="text-sm text-gray-500 ml-1">min</span>
          </div>
          <div className="text-xs text-gray-500">Today</div>
        </div>

        {/* Longest streak */}
        {longestStreak > 0 && (
          <div className="text-center">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Best: {longestStreak}
            </div>
            <div className="text-xs text-gray-500">Longest streak</div>
          </div>
        )}
      </div>

      {/* Heatmap */}
      {showHeatmap && !loading && stats.length > 0 && (
        <div className="mt-4">
          <ActivityHeatmap stats={stats} />
        </div>
      )}
    </div>
  );
}

/**
 * ActivityHeatmap Component
 *
 * GitHub-style contribution graph showing reading activity.
 */

interface ActivityHeatmapProps {
  stats: DailyReadingStats[];
}

export function ActivityHeatmap({ stats }: ActivityHeatmapProps) {
  // Find max seconds for color scaling
  const maxSeconds = Math.max(...stats.map((s) => s.total_seconds), 1);

  // Get activity level for a day (0-4)
  const getActivityLevel = (seconds: number): number => {
    if (seconds === 0) return 0;
    const ratio = seconds / maxSeconds;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  // Get color for activity level
  const getActivityColor = (level: number): string => {
    const colors = [
      'bg-gray-100 dark:bg-gray-800', // 0: no activity
      'bg-green-200 dark:bg-green-900', // 1: low
      'bg-green-400 dark:bg-green-700', // 2: medium-low
      'bg-green-600 dark:bg-green-500', // 3: medium-high
      'bg-green-800 dark:bg-green-400', // 4: high
    ];
    return colors[level];
  };

  // Group stats by week for display
  const weeks: DailyReadingStats[][] = [];
  const reversedStats = [...stats].reverse();
  for (let i = 0; i < reversedStats.length; i += 7) {
    weeks.push(reversedStats.slice(i, i + 7));
  }

  return (
    <div className="activity-heatmap">
      <div className="flex gap-1 flex-wrap">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-1">
            {week.map((day) => {
              const level = getActivityLevel(day.total_seconds);
              return (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`}
                  title={`${day.date}: ${Math.round(day.total_seconds / 60)} minutes`}
                />
              );
            })}
            {/* Pad incomplete week */}
            {week.length < 7 &&
              Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`empty-${weekIndex}-${i}`} className="w-3 h-3 rounded-sm bg-transparent" />
              ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

/**
 * StreakDisplay Component
 *
 * Simple display of current streak with visual indicator.
 */

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  size = 'md',
  showLabel = true,
  className = '',
}: StreakDisplayProps) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const emoji = getStreakEmoji(currentStreak);
  const isOnFire = currentStreak >= 7;

  return (
    <div className={`streak-display ${className}`}>
      <div className="flex items-center gap-2">
        {isOnFire && (
          <span className={`animate-pulse ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`}>
            {emoji}
          </span>
        )}
        <div className={sizes[size]} className="font-bold">
          {currentStreak}
        </div>
        {showLabel && (
          <div className="text-sm text-gray-500">
            {currentStreak === 1 ? 'day' : 'days'}
            {longestStreak && longestStreak > currentStreak && (
              <span className="ml-2 text-gray-400">
                (best: {longestStreak})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StreakMilestone Component
 *
 * Shows celebration for reaching streak milestones.
 */

interface StreakMilestoneProps {
  streak: number;
  onClose?: () => void;
}

export function StreakMilestone({ streak, onClose }: StreakMilestoneProps) {
  const milestone = getMilestone(streak);
  if (!milestone) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">{milestone.emoji}</div>
        <h2 className="text-2xl font-bold mb-2">{milestone.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{milestone.message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Continue Reading
        </button>
      </div>
    </div>
  );
}

// Utility functions

function calculateStreak(stats: DailyReadingStats[]): number {
  if (stats.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  // Check if there's activity today or yesterday to start counting
  for (let i = 0; i < stats.length; i++) {
    if (stats[i].date === today || stats[i].date === getYesterday()) {
      if (stats[i].total_seconds > 0) {
        streak = 1;
        // Count consecutive days going backward
        for (let j = i + 1; j < stats.length; j++) {
          if (stats[j].total_seconds > 0 && areConsecutiveDays(stats[j - 1].date, stats[j].date)) {
            streak++;
          } else {
            break;
          }
        }
        break;
      }
    }
  }

  return streak;
}

function calculateLongestStreak(stats: DailyReadingStats[]): number {
  let longestStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < stats.length; i++) {
    if (stats[i].total_seconds > 0) {
      if (i === 0 || areConsecutiveDays(stats[i - 1].date, stats[i].date)) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return longestStreak;
}

function areConsecutiveDays(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.abs(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

function getYesterday(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '💎';
  if (streak >= 30) return '⚡';
  if (streak >= 14) return '🔥';
  if (streak >= 7) return '✨';
  if (streak >= 3) return '🌟';
  return '📖';
}

function getMilestone(streak: number) {
  const milestones: Record<number, { emoji: string; title: string; message: string }> = {
    3: { emoji: '🌟', title: '3 Day Streak!', message: "You're building a habit!" },
    7: { emoji: '✨', title: 'Week Warrior!', message: "A full week of reading!" },
    14: { emoji: '🔥', title: 'Two Weeks!', message: "14 days of consistent reading!" },
    30: { emoji: '⚡', title: 'Monthly Master!', message: "30 days! You're unstoppable!" },
    100: { emoji: '💎', title: 'Century Club!', message: "100 days! Incredible dedication!" },
  };

  return milestones[streak];
}
