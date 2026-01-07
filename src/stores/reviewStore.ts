import { create } from "zustand";
import {
  getDueItems,
  submitReview,
  previewReviewIntervals,
  getReviewStreak,
  LearningItem,
  ReviewRating,
  PreviewIntervals,
  ReviewStreak,
} from "../api/review";

interface ReviewState {
  // Data
  queue: LearningItem[];
  currentIndex: number;
  currentCard: LearningItem | null;
  previewIntervals: PreviewIntervals | null;

  // UI State
  isLoading: boolean;
  isAnswerShown: boolean;
  isSubmitting: boolean;
  error: string | null;
  sessionId: string;

  // Statistics for current session
  reviewsCompleted: number;
  correctCount: number;
  sessionStartTime: number;
  averageTimePerCard: number; // in seconds

  // Streak information
  streak: ReviewStreak | null;
  streakLoading: boolean;

  // Actions
  loadQueue: () => Promise<void>;
  loadStreak: () => Promise<void>;
  showAnswer: () => void;
  hideAnswer: () => void;
  submitRating: (rating: ReviewRating) => Promise<void>;
  loadPreviewIntervals: () => Promise<void>;
  nextCard: () => void;
  resetSession: () => void;
  getEstimatedTimeRemaining: () => number; // in seconds
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  // Initial State
  queue: [],
  currentIndex: 0,
  currentCard: null,
  previewIntervals: null,
  isLoading: false,
  isAnswerShown: false,
  isSubmitting: false,
  error: null,
  sessionId: "",
  reviewsCompleted: 0,
  correctCount: 0,
  sessionStartTime: 0,
  averageTimePerCard: 0,
  streak: null,
  streakLoading: false,

  // Actions
  loadQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await getDueItems();
      set({
        queue: items,
        currentIndex: 0,
        currentCard: items[0] || null,
        sessionStartTime: Date.now(),
        isLoading: false,
        reviewsCompleted: 0,
        correctCount: 0,
        sessionId: crypto.randomUUID(),
        averageTimePerCard: 0,
      });

      // Load streak information
      get().loadStreak();

      // Load preview intervals for the first card
      if (items[0]) {
        get().loadPreviewIntervals();
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load review queue",
        isLoading: false,
      });
    }
  },

  loadStreak: async () => {
    set({ streakLoading: true });
    try {
      const streak = await getReviewStreak();
      set({ streak, streakLoading: false });
    } catch (error) {
      console.error("Failed to load streak:", error);
      set({ streakLoading: false });
    }
  },

  showAnswer: () => {
    set({ isAnswerShown: true });
  },

  hideAnswer: () => {
    set({ isAnswerShown: false });
  },

  submitRating: async (rating: ReviewRating) => {
    const { currentCard, reviewsCompleted, correctCount, sessionStartTime } = get();
    if (!currentCard) return;

    const timeTaken = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds since session start
    set({ isSubmitting: true, error: null });

    try {
      await submitReview(currentCard.id, rating, timeTaken);

      // Update statistics and average time per card
      const newCorrectCount = rating >= 3 ? correctCount + 1 : correctCount;
      const newReviewsCompleted = reviewsCompleted + 1;
      const newAverageTime = (reviewsCompleted * (get().averageTimePerCard || 0) + timeTaken) / (reviewsCompleted + 1);

      set({
        reviewsCompleted: newReviewsCompleted,
        correctCount: newCorrectCount,
        averageTimePerCard: newAverageTime,
        sessionStartTime: Date.now(), // Reset for next card
      });

      // Move to next card
      get().nextCard();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to submit review",
        isSubmitting: false,
      });
    }
  },

  loadPreviewIntervals: async () => {
    const { currentCard } = get();
    if (!currentCard) return;

    try {
      const intervals = await previewReviewIntervals(currentCard.id);
      set({ previewIntervals: intervals });
    } catch (error) {
      // Non-critical, just log but don't set error
      console.error("Failed to load preview intervals:", error);
    }
  },

  nextCard: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      // No more cards
      set({
        currentCard: null,
        currentIndex: nextIndex,
        isAnswerShown: false,
        isSubmitting: false,
        previewIntervals: null,
        sessionStartTime: Date.now(), // Reset for next card
      });
    } else {
      set({
        currentIndex: nextIndex,
        currentCard: queue[nextIndex],
        isAnswerShown: false,
        isSubmitting: false,
        previewIntervals: null,
        sessionStartTime: Date.now(), // Reset for next card
      });

      // Load preview intervals for the next card
      setTimeout(() => {
        get().loadPreviewIntervals();
      }, 100);
    }
  },

  resetSession: () => {
    set({
      queue: [],
      currentIndex: 0,
      currentCard: null,
      previewIntervals: null,
      isAnswerShown: false,
      isSubmitting: false,
      error: null,
      sessionId: "",
      reviewsCompleted: 0,
      correctCount: 0,
      sessionStartTime: 0,
      averageTimePerCard: 0,
      streak: null,
      streakLoading: false,
    });
  },

  getEstimatedTimeRemaining: () => {
    const { queue, currentIndex, averageTimePerCard } = get();
    const remainingCards = queue.length - currentIndex;

    if (averageTimePerCard > 0) {
      return Math.round(remainingCards * averageTimePerCard);
    }

    // Default estimate: 30 seconds per card
    return remainingCards * 30;
  },
}));

