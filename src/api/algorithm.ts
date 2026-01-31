import { invokeCommand } from "../lib/tauri";

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
 * Document rating request
 */
export interface DocumentRatingRequest {
  document_id: string;
  rating: number; // 1-4 (ReviewRating)
  time_taken?: number; // seconds
}

/**
 * Document rating response
 */
export interface DocumentRatingResponse {
  next_review_date: string;
  stability: number;
  difficulty: number;
  interval_days: number;
  scheduling_reason: string;
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
 * Engagement preferences for scroll mode
 */
export interface EngagementPreferences {
  /** How much novelty to inject (0.0 = never, 1.0 = frequent) */
  novelty_factor: number;
  /** Chance of a "surprise" item appearing (0.0-1.0) */
  serendipity_rate: number;
  /** Preferred variety in content (0.0 = focused, 1.0 = high variety) */
  variety_preference: number;
  /** Maximum items of same topic before forcing variety */
  max_same_topic_streak: number;
  /** Whether to boost recently added items */
  favor_recent_additions: boolean;
  /** Time window for "recent" items (in hours) */
  recent_window_hours: number;
}

/**
 * Smart start position request
 */
export interface SmartStartRequest {
  total_items: number;
  last_session_position?: number;
  items_reviewed_this_session: number;
  seed?: number;
}

/**
 * Smart start position response
 */
export interface SmartStartResponse {
  start_position: number;
  is_resuming: boolean;
  reason: string;
}

/**
 * Calculate next review state using SM-2 algorithm
 */
export async function calculateSM2Next(
  itemId: string,
  rating: number
): Promise<SM2Calculation> {
  return await invokeCommand<SM2Calculation>("calculate_sm2_next", {
    itemId,
    rating,
  });
}

/**
 * Rate a document and schedule its next reading
 * 
 * Uses the incremental scheduler (fixed intervals).
 * For FSRS-6 with engagement features, use `rateDocumentEngaging`.
 */
export async function rateDocument(
  documentId: string,
  rating: number,
  timeTaken?: number
): Promise<DocumentRatingResponse> {
  const request: DocumentRatingRequest = {
    document_id: documentId,
    rating,
    time_taken: timeTaken,
  };
  return await invokeCommand<DocumentRatingResponse>("rate_document", { request });
}

/**
 * Rate a document using the Engaging FSRS-6 scheduler
 * 
 * This scheduler extends FSRS-6 with engagement features:
 * - Novelty injection for discovery
 * - Serendipity factor for surprises  
 * - Streak-friendly scheduling
 * - Variety awareness
 */
export async function rateDocumentEngaging(
  documentId: string,
  rating: number,
  timeTaken?: number
): Promise<DocumentRatingResponse> {
  const request: DocumentRatingRequest = {
    document_id: documentId,
    rating,
    time_taken: timeTaken,
  };
  return await invokeCommand<DocumentRatingResponse>("rate_document_engaging", { request });
}

/**
 * Schedule documents for incremental reading
 */
export async function scheduleDocuments(
  request: DocumentScheduleRequest
): Promise<string[]> {
  return await invokeCommand<string[]>("schedule_documents", { request });
}

/**
 * Calculate priority scores for queue items
 */
export async function calculatePriorityScores(): Promise<PriorityScoreItem[]> {
  return await invokeCommand<PriorityScoreItem[]>("calculate_priority_scores");
}

/**
 * Compare algorithm performance
 */
export async function compareAlgorithms(): Promise<AlgorithmComparison> {
  return await invokeCommand<AlgorithmComparison>("compare_algorithms_command");
}

/**
 * Get algorithm parameters for an item
 */
export async function getAlgorithmParams(itemId: string): Promise<AlgorithmParams> {
  return await invokeCommand<AlgorithmParams>("get_algorithm_params", { itemId });
}

/**
 * Get review statistics for all items
 */
export async function getReviewStatistics(): Promise<ReviewStatistics> {
  return await invokeCommand<ReviewStatistics>("get_review_statistics");
}

/**
 * Optimize algorithm parameters
 */
export async function optimizeAlgorithmParams(
  params: OptimizationParams
): Promise<OptimizationResult> {
  return await invokeCommand<OptimizationResult>("optimize_algorithm_params", {
    initialParams: params,
  });
}

/**
 * Get default engagement preferences for scroll mode
 */
export async function getDefaultEngagementPreferences(): Promise<EngagementPreferences> {
  return await invokeCommand<EngagementPreferences>("get_default_engagement_preferences");
}

/**
 * Get smart starting position for scroll mode
 * 
 * Returns a varied starting position that considers session continuity
 * and user engagement patterns. Instead of always starting at 0, this
 * provides variety while respecting resume logic.
 */
export async function getSmartStartPosition(
  request: SmartStartRequest
): Promise<SmartStartResponse> {
  return await invokeCommand<SmartStartResponse>("get_smart_start_position", { request });
}
