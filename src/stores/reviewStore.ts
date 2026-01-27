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
import { getDueDocumentsOnly } from "../api/queue";
import { rateDocument } from "../api/algorithm";
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

export type ReviewDocumentItem = {
  id: string;
  itemType: "document";
  documentId: string;
  documentTitle: string;
  tags: string[];
  dueDate?: string;
  estimatedTime?: number;
  category?: string;
  progress?: number;
};

export type ReviewSessionItem = LearningItem | ReviewDocumentItem;

interface ReviewState {
  // Data
  queue: ReviewSessionItem[];
  currentIndex: number;
  currentCard: ReviewSessionItem | null;
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
      const [items, dueDocuments] = await Promise.all([getDueItems(), getDueDocumentsOnly()]);

      const documentItems: ReviewDocumentItem[] = dueDocuments.map((doc) => ({
        id: `doc:${doc.documentId}`,
        itemType: "document",
        documentId: doc.documentId,
        documentTitle: doc.documentTitle,
        tags: doc.tags ?? [],
        dueDate: doc.dueDate,
        estimatedTime: doc.estimatedTime,
        category: doc.category,
        progress: doc.progress,
      }));

      const { activeCollectionId, documentAssignments } = useCollectionStore.getState();
      const collectionFilteredItems = activeCollectionId
        ? items.filter((item) => {
            if (!item.document_id) return true;
            const assigned = documentAssignments[item.document_id];
            return assigned ? assigned === activeCollectionId : true;
          })
        : items;
      const collectionFilteredDocuments = activeCollectionId
        ? documentItems.filter((item) => {
            const assigned = documentAssignments[item.documentId];
            return assigned ? assigned === activeCollectionId : true;
          })
        : documentItems;
      const storedSession = loadStoredSession();
      const reviewedIds = new Set(storedSession?.reviewedIds ?? []);
      const pendingCards = collectionFilteredItems.filter((item) => !reviewedIds.has(item.id));
      const pendingDocuments = collectionFilteredDocuments.filter((item) => !reviewedIds.has(item.id));

      const sortByDueDate = (date: string | undefined) => {
        if (!date) return 0;
        const ts = new Date(date).getTime();
        return Number.isNaN(ts) ? 0 : ts;
      };

      const sortedCards = [...pendingCards].sort(
        (a, b) => sortByDueDate(a.due_date) - sortByDueDate(b.due_date)
      );
      const sortedDocuments = [...pendingDocuments].sort(
        (a, b) => sortByDueDate(a.dueDate) - sortByDueDate(b.dueDate)
      );

      const interleaved: ReviewSessionItem[] = [];
      let cardIndex = 0;
      let docIndex = 0;
      let useCards = true;
      if (sortedCards.length > 0 && sortedDocuments.length > 0) {
        useCards = sortByDueDate(sortedCards[0].due_date) <= sortByDueDate(sortedDocuments[0].dueDate);
      }

      while (cardIndex < sortedCards.length || docIndex < sortedDocuments.length) {
        if (useCards && cardIndex < sortedCards.length) {
          interleaved.push(sortedCards[cardIndex++]);
        } else if (!useCards && docIndex < sortedDocuments.length) {
          interleaved.push(sortedDocuments[docIndex++]);
        } else if (cardIndex < sortedCards.length) {
          interleaved.push(sortedCards[cardIndex++]);
        } else if (docIndex < sortedDocuments.length) {
          interleaved.push(sortedDocuments[docIndex++]);
        }
        useCards = !useCards;
      }

      // Start a review session on the backend
      const sessionId = interleaved.length > 0 ? await startReview() : "";
      const firstItem = interleaved[0] || null;
      const isFirstDocument = firstItem && (firstItem as ReviewDocumentItem).itemType === "document";

      set({
        queue: interleaved,
        currentIndex: 0,
        currentCard: firstItem,
        sessionStartTime: Date.now(),
        isLoading: false,
        reviewsCompleted: 0,
        correctCount: 0,
        sessionId,
        averageTimePerCard: 0,
        isAnswerShown: isFirstDocument ? true : false,
        previewIntervals: null,
      });

      if (interleaved.length > 0) {
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
      if (interleaved.length > 0 && firstItem && !isFirstDocument) {
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
      const nextItem = remainingQueue[nextIndex];
      const nextIsDocument = nextItem && (nextItem as ReviewDocumentItem).itemType === "document";
      set({
        queue: remainingQueue,
        currentIndex: nextIndex,
        currentCard: nextItem,
        isAnswerShown: nextIsDocument ? true : false,
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
        if (!nextIsDocument) {
          get().loadPreviewIntervals();
        }
      }, 100);
    }

    try {
      if ((currentCard as ReviewDocumentItem).itemType === "document") {
        const docItem = currentCard as ReviewDocumentItem;
        await rateDocument(docItem.documentId, rating, timeTaken);
      } else {
        await submitReview(currentCard.id, rating, timeTaken, sessionId);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to submit review",
      });
    }
  },

  loadPreviewIntervals: async () => {
    const { currentCard } = get();
    if (!currentCard) return;
    if ((currentCard as ReviewDocumentItem).itemType === "document") return;

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
      const nextItem = queue[nextIndex];
      const nextIsDocument = nextItem && (nextItem as ReviewDocumentItem).itemType === "document";
      set({
        currentIndex: nextIndex,
        currentCard: nextItem,
        isAnswerShown: nextIsDocument ? true : false,
        isSubmitting: false,
        previewIntervals: null,
        sessionStartTime: Date.now(), // Reset for next card
      });

      // Load preview intervals for the next card
      setTimeout(() => {
        if (!nextIsDocument) {
          get().loadPreviewIntervals();
        }
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
    const nextItem = queue[clampedIndex];
    const nextIsDocument = nextItem && (nextItem as ReviewDocumentItem).itemType === "document";
    set({
      currentIndex: clampedIndex,
      currentCard: nextItem,
      isAnswerShown: nextIsDocument ? true : false,
      isSubmitting: false,
      previewIntervals: null,
      sessionStartTime: Date.now(),
    });

    if (!nextIsDocument) {
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
    clearStoredSession();
  },

  startReviewAtItem: async (itemId: string) => {
    await get().loadQueue();
    const { queue } = get();
    const index = queue.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    const nextItem = queue[index];
    const nextIsDocument = nextItem && (nextItem as ReviewDocumentItem).itemType === "document";
    set({
      currentIndex: index,
      currentCard: nextItem,
      isAnswerShown: nextIsDocument ? true : false,
      isSubmitting: false,
      previewIntervals: null,
      sessionStartTime: Date.now(),
    });
    if (!nextIsDocument) {
      setTimeout(() => {
        get().loadPreviewIntervals();
      }, 100);
    }
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
