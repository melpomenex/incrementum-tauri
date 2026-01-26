/**
 * Reading goals and streaks API
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Achievement,
  GoalProgress,
  GoalType,
  ReadingGoal,
  ReadingStreak,
} from '../types/readingGoal';

/**
 * Create a new reading goal
 */
export async function createReadingGoal(
  goalType: GoalType,
  targetValue: number
): Promise<ReadingGoal> {
  return await invoke<ReadingGoal>('create_reading_goal', {
    goalType,
    targetValue,
  });
}

/**
 * Get the active reading goal
 */
export async function getActiveReadingGoal(): Promise<ReadingGoal | null> {
  return await invoke<ReadingGoal | null>('get_active_reading_goal');
}

/**
 * Update a reading goal
 */
export async function updateReadingGoal(
  goalId: string,
  targetValue: number,
  isActive: boolean
): Promise<ReadingGoal> {
  return await invoke<ReadingGoal>('update_reading_goal', {
    goalId,
    targetValue,
    isActive,
  });
}

/**
 * Get progress for a specific goal on a specific date
 */
export async function getGoalProgress(
  goalId: string,
  date: string
): Promise<GoalProgress> {
  return await invoke<GoalProgress>('get_goal_progress', {
    goalId,
    date,
  });
}

/**
 * Update progress for a goal
 */
export async function updateGoalProgress(
  goalId: string,
  date: string,
  currentValue: number
): Promise<GoalProgress> {
  return await invoke<GoalProgress>('update_goal_progress', {
    goalId,
    date,
    currentValue,
  });
}

/**
 * Get current reading streak
 */
export async function getReadingStreak(): Promise<ReadingStreak> {
  return await invoke<ReadingStreak>('get_reading_streak');
}

/**
 * Get all unlocked achievements
 */
export async function getAchievements(): Promise<Achievement[]> {
  return await invoke<Achievement[]>('get_achievements');
}

/**
 * Check and unlock new achievements
 */
export async function checkAndUnlockAchievements(): Promise<Achievement[]> {
  return await invoke<Achievement[]>('check_and_unlock_achievements');
}
