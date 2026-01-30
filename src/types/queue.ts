// Queue and review types
export interface QueueItem {
  id: string;
  documentId: string;
  documentTitle: string;
  documentFileType?: string;
  extractId?: string;
  learningItemId?: string;
  question?: string;
  answer?: string;
  clozeText?: string;
  itemType: "document" | "extract" | "learning-item" | "playlist-video";
  priorityRating?: number;
  prioritySlider?: number;
  priority: number;
  dueDate?: string;
  estimatedTime: number; // in minutes
  tags: string[];
  category?: string;
  progress: number; // 0-100
  
  // Playlist interspersion fields
  /** Source identifier, e.g., "playlist:<subscription_id>" */
  source?: string;
  /** Position in queue for interspersion calculation */
  position?: number;
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
