// Queue and review types
export interface QueueItem {
  id: string;
  documentId: string;
  documentTitle: string;
  extractId?: string;
  learningItemId?: string;
  itemType: "document" | "extract" | "learning-item";
  priority: number;
  dueDate?: string;
  estimatedTime: number; // in minutes
  tags: string[];
  category?: string;
  progress: number; // 0-100
}

export interface ReviewSession {
  id: string;
  startTime: string;
  endTime?: string;
  itemsReviewed: number;
  correctAnswers: number;
  totalTime: number; // in seconds
  streakDays: number;
}

export interface ReviewItem {
  id: string;
  documentId: string;
  documentTitle: string;
  extractId?: string;
  learningItemId?: string;
  itemType: "learning-item";
  priority: number;
  dueDate?: string;
  estimatedTime: number;
  tags: string[];
  category?: string;
  progress: number;
  question: string;
  answer?: string;
  context?: string;
  hint?: string;
  relatedItems?: string[];
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface ReviewResult {
  itemId: string;
  rating: Rating;
  timeTaken: number; // in seconds
  newDueDate: string;
  newInterval: number;
  newEaseFactor: number;
}
