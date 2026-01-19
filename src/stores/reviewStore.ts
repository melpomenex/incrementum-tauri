import { create } from "zustand";
import {
  getDueItems,
  submitReview,
  previewReviewIntervals,
  getReviewStreak,
  startReview,
  LearningItem,
  ReviewRating,
  PreviewIntervals,
  ReviewStreak,
} from "../api/review";
import { useStudyDeckStore } from "./studyDeckStore";
import { filterByDeck } from "../utils/studyDecks";
import { useCollectionStore } from "./collectionStore";
import { getUser } from "../lib/sync-client";

interface StoredReviewSession {
  reviewedIds: string[];
  sessionId?: string;
  updatedAt: number;
}

const getReviewSessionKey = () => {
  const user = getUser();
  const collectionId = useCollectionStore.getState().activeCollectionId ?? "default";
  const userKey = user?.id ?? "demo";
  return `review-session:${userKey}:${collectionId}`;
};

const loadStoredSession = (): StoredReviewSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getReviewSessionKey());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredReviewSession;
  } catch {
    return null;
  }
};

const saveStoredSession = (session: StoredReviewSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getReviewSessionKey(), JSON.stringify(session));
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getReviewSessionKey());
};

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
  goToIndex: (index: number) => void;
  resetSession: () => void;
  startReviewAtItem: (itemId: string) => Promise<void>;
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
      const { decks, activeDeckId } = useStudyDeckStore.getState();
      const activeDeck = decks.find((deck) => deck.id === activeDeckId) ?? null;
      const filteredItems = activeDeck ? filterByDeck(items, activeDeck) : items;
      const { activeCollectionId, documentAssignments } = useCollectionStore.getState();
      const collectionFilteredItems = activeCollectionId
        ? filteredItems.filter((item) => {
            if (!item.documentId) return true;
            const assigned = documentAssignments[item.documentId];
            return assigned ? assigned === activeCollectionId : true;
          })
        : filteredItems;
      const storedSession = loadStoredSession();
      const reviewedIds = new Set(storedSession?.reviewedIds ?? []);
      const pendingItems = collectionFilteredItems.filter((item) => !reviewedIds.has(item.id));

      // Start a review session on the backend
      const sessionId = pendingItems.length > 0 ? await startReview() : "";

      set({
        queue: pendingItems,
        currentIndex: 0,
        currentCard: pendingItems[0] || null,
        sessionStartTime: Date.now(),
        isLoading: false,
        reviewsCompleted: 0,
        correctCount: 0,
        sessionId,
        averageTimePerCard: 0,
      });

      if (pendingItems.length > 0) {
        saveStoredSession({
          reviewedIds: Array.from(reviewedIds),
          sessionId,
          updatedAt: Date.now(),
        });
      } else {
        clearStoredSession();
      }

      // Load streak information
      get().loadStreak();

      // Load preview intervals for the first card
      if (pendingItems[0]) {
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
    const { currentCard, reviewsCompleted, correctCount, sessionStartTime, sessionId } = get();
    if (!currentCard) return;

    const timeTaken = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds since session start
    set({ isSubmitting: true, error: null });

    // Optimistically advance to keep the review flow moving.
    const newCorrectCount = rating >= 3 ? correctCount + 1 : correctCount;
    const newReviewsCompleted = reviewsCompleted + 1;
    const newAverageTime = (reviewsCompleted * (get().averageTimePerCard || 0) + timeTaken) / (reviewsCompleted + 1);
    const { queue, currentIndex } = get();
    const remainingQueue = queue.filter((item) => item.id !== currentCard.id);
    const storedSession = loadStoredSession();
    const reviewedIds = new Set(storedSession?.reviewedIds ?? []);
    reviewedIds.add(currentCard.id);

    if (remainingQueue.length === 0) {
      set({
        queue: [],
        currentCard: null,
        currentIndex: 0,
        isAnswerShown: false,
        isSubmitting: false,
        previewIntervals: null,
        reviewsCompleted: newReviewsCompleted,
        correctCount: newCorrectCount,
        averageTimePerCard: newAverageTime,
        sessionStartTime: Date.now(),
      });
      clearStoredSession();
    } else {
      const nextIndex = Math.min(currentIndex, remainingQueue.length - 1);
      set({
        queue: remainingQueue,
        currentIndex: nextIndex,
        currentCard: remainingQueue[nextIndex],
        isAnswerShown: false,
        isSubmitting: false,
        previewIntervals: null,
        reviewsCompleted: newReviewsCompleted,
        correctCount: newCorrectCount,
        averageTimePerCard: newAverageTime,
        sessionStartTime: Date.now(),
      });
      saveStoredSession({
        reviewedIds: Array.from(reviewedIds),
        sessionId,
        updatedAt: Date.now(),
      });

      setTimeout(() => {
        get().loadPreviewIntervals();
      }, 100);
    }

    try {
      await submitReview(currentCard.id, rating, timeTaken, sessionId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to submit review",
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

  goToIndex: (index: number) => {
    const { queue } = get();
    if (queue.length === 0) {
      set({
        currentIndex: 0,
        currentCard: null,
        isAnswerShown: false,
        isSubmitting: false,
        previewIntervals: null,
        sessionStartTime: Date.now(),
      });
      return;
    }

    const clampedIndex = Math.max(0, Math.min(index, queue.length - 1));
    set({
      currentIndex: clampedIndex,
      currentCard: queue[clampedIndex],
      isAnswerShown: false,
      isSubmitting: false,
      previewIntervals: null,
      sessionStartTime: Date.now(),
    });

    setTimeout(() => {
      get().loadPreviewIntervals();
    }, 100);
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
    clearStoredSession();
  },

  startReviewAtItem: async (itemId: string) => {
    await get().loadQueue();
    const { queue } = get();
    const index = queue.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    set({
      currentIndex: index,
      currentCard: queue[index],
      isAnswerShown: false,
      isSubmitting: false,
      previewIntervals: null,
      sessionStartTime: Date.now(),
    });
    setTimeout(() => {
      get().loadPreviewIntervals();
    }, 100);
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
