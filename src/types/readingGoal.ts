/**
 * Reading goals and streaks types
 */

export type GoalType = 'daily_minutes' | 'daily_pages' | 'weekly_minutes';

export interface ReadingGoal {
  id: string;
  goalType: GoalType;
  targetValue: number;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD format
  currentValue: number;
  isCompleted: boolean;
  updatedAt: string;
}

export type AchievementCategory = 'goals' | 'streaks' | 'milestones' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  unlockedAt: string;
}

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  isActive: boolean;
}

export interface GoalWithProgress extends ReadingGoal {
  progress?: GoalProgress;
  completionPercentage: number;
}

// Helper functions
export function createReadingGoal(
  goalType: GoalType,
  targetValue: number
): Omit<ReadingGoal, 'id' | 'createdAt' | 'modifiedAt'> {
  return {
    goalType,
    targetValue,
    isActive: true,
  };
}

export function getGoalLabel(goalType: GoalType): string {
  switch (goalType) {
    case 'daily_minutes':
      return 'Daily Reading Time (minutes)';
    case 'daily_pages':
      return 'Daily Pages Read';
    case 'weekly_minutes':
      return 'Weekly Reading Time (minutes)';
  }
}

export function getGoalUnit(goalType: GoalType): string {
  switch (goalType) {
    case 'daily_minutes':
    case 'weekly_minutes':
      return 'minutes';
    case 'daily_pages':
      return 'pages';
  }
}

export function formatStreakDays(days: number): string {
  if (days === 0) return 'No streak';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function getStreakMilestone(streak: number): { icon: string; label: string } | null {
  if (streak >= 100) {
    return { icon: '💎', label: 'Century Club' };
  }
  if (streak >= 30) {
    return { icon: '⚡', label: 'Monthly Master' };
  }
  if (streak >= 7) {
    return { icon: '🔥', label: 'Week Warrior' };
  }
  if (streak >= 3) {
    return { icon: '✨', label: 'Building Momentum' };
  }
  return null;
}

export function getStreakColor(streak: number): string {
  if (streak >= 100) return 'text-purple-500';
  if (streak >= 30) return 'text-blue-500';
  if (streak >= 7) return 'text-orange-500';
  if (streak >= 3) return 'text-yellow-500';
  return 'text-gray-500';
}
