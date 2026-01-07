import { invoke } from "@tauri-apps/api/core";

/**
 * SM-2 calculation result
 */
export interface SM2Calculation {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

/**
 * Document scheduling request
 */
export interface DocumentScheduleRequest {
  max_daily_documents: number;
  cards_per_document: number;
}

/**
 * Algorithm type selection
 */
export enum AlgorithmType {
  Fsrs = "Fsrs",
  SM2 = "SM2",
}

/**
 * Priority score item
 */
export interface PriorityScoreItem {
  item_id: string;
  priority_score: number;
  due_date: string;
  interval: number;
  review_count: number;
  difficulty: number;
}

/**
 * Algorithm comparison result
 */
export interface AlgorithmComparison {
  algorithm: string;
  avg_retention: number;
  total_reviews: number;
  avg_interval: number;
}

/**
 * Algorithm parameters for an item
 */
export interface AlgorithmParams {
  algorithm: string;
  stability?: number;
  difficulty?: number;
  ease_factor?: number;
  interval: number;
  review_count: number;
}

/**
 * Optimization parameters
 */
export interface OptimizationParams {
  min_ease_factor: number;
  initial_ease_factor: number;
  desired_retention: number;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  best_params: OptimizationParams;
  expected_retention: number;
  iterations: number;
  converged: boolean;
}

/**
 * Review statistics
 */
export interface ReviewStatistics {
  total_items: number;
  total_reviews: number;
  total_lapses: number;
  avg_interval: number;
  retention_estimate: number;
  due_today: number;
  due_week: number;
  due_month: number;
}

/**
 * Calculate next review state using SM-2 algorithm
 */
export async function calculateSM2Next(
  itemId: string,
  rating: number
): Promise<SM2Calculation> {
  return await invoke<SM2Calculation>("calculate_sm2_next", {
    itemId,
    rating,
  });
}

/**
 * Schedule documents for incremental reading
 */
export async function scheduleDocuments(
  request: DocumentScheduleRequest
): Promise<string[]> {
  return await invoke<string[]>("schedule_documents", { request });
}

/**
 * Calculate priority scores for queue items
 */
export async function calculatePriorityScores(): Promise<PriorityScoreItem[]> {
  return await invoke<PriorityScoreItem[]>("calculate_priority_scores");
}

/**
 * Compare algorithm performance
 */
export async function compareAlgorithms(): Promise<AlgorithmComparison> {
  return await invoke<AlgorithmComparison>("compare_algorithms_command");
}

/**
 * Get algorithm parameters for an item
 */
export async function getAlgorithmParams(itemId: string): Promise<AlgorithmParams> {
  return await invoke<AlgorithmParams>("get_algorithm_params", { itemId });
}

/**
 * Get review statistics for all items
 */
export async function getReviewStatistics(): Promise<ReviewStatistics> {
  return await invoke<ReviewStatistics>("get_review_statistics");
}

/**
 * Optimize algorithm parameters
 */
export async function optimizeAlgorithmParams(
  params: OptimizationParams
): Promise<OptimizationResult> {
  return await invoke<OptimizationResult>("optimize_algorithm_params", {
    initialParams: params,
  });
}
