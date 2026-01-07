import { invoke } from "@tauri-apps/api/core";

export interface PreviewIntervals {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface ReviewStreak {
  current_streak: number;
  longest_streak: number;
  total_reviews: number;
  last_review_date?: string;
}

export async function startReview(): Promise<string> {
  return await invoke<string>("start_review");
}

export async function submitReview(
  itemId: string,
  rating: number,
  timeTaken: number
): Promise<LearningItem> {
  return await invoke<LearningItem>("submit_review", {
    itemId,
    rating,
    timeTaken,
  });
}

export async function getDueItems(): Promise<LearningItem[]> {
  return await invoke<LearningItem[]>("get_due_items");
}

export async function previewReviewIntervals(
  itemId: string
): Promise<PreviewIntervals> {
  return await invoke<PreviewIntervals>("preview_review_intervals", {
    itemId,
  });
}

export async function getReviewStreak(): Promise<ReviewStreak> {
  return await invoke<ReviewStreak>("get_review_streak");
}

export interface LearningItem {
  id: string;
  extract_id?: string;
  document_id?: string;
  item_type: "flashcard" | "cloze" | "qa" | "basic";
  question: string;
  answer?: string;
  cloze_text?: string;
  difficulty: number;
  interval: number;
  ease_factor: number;
  due_date: string;
  date_created: string;
  date_modified: string;
  last_review_date?: string;
  review_count: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  is_suspended: boolean;
  tags: string[];
  memory_state?: {
    stability: number;
    difficulty: number;
  };
}

export type ReviewRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export const RATING_LABELS: Record<ReviewRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

export const RATING_COLORS: Record<ReviewRating, string> = {
  1: "bg-red-500 hover:bg-red-600",
  2: "bg-orange-500 hover:bg-orange-600",
  3: "bg-blue-500 hover:bg-blue-600",
  4: "bg-green-500 hover:bg-green-600",
};

export function formatInterval(days: number): string {
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}
