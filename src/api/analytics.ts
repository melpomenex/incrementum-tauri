import { invokeCommand } from "../lib/tauri";

export interface DashboardStats {
  total_cards: number;
  cards_due_today: number;
  cards_learned: number;
  reviews_today: number;
  study_streak: number;
  retention_rate: number;
  average_difficulty: number;
  total_documents: number;
  total_extracts: number;
}

export interface ActivityDay {
  date: string;
  reviews_count: number;
  cards_learned: number;
  time_spent_minutes: number;
}

export interface MemoryStats {
  average_stability: number;
  average_difficulty: number;
  mature_cards: number;
  young_cards: number;
  new_cards: number;
}

export interface CategoryStats {
  category: string;
  card_count: number;
  reviews_count: number;
  retention_rate: number;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return await invokeCommand<DashboardStats>("get_dashboard_stats");
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  return await invokeCommand<MemoryStats>("get_memory_stats");
}

/**
 * Get activity data for the last N days
 */
export async function getActivityData(days: number = 30): Promise<ActivityDay[]> {
  return await invokeCommand<ActivityDay[]>("get_activity_data", { days });
}

/**
 * Get category statistics
 */
export async function getCategoryStats(): Promise<CategoryStats[]> {
  return await invokeCommand<CategoryStats[]>("get_category_stats");
}
