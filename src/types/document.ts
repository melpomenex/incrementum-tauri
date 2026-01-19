// Document types matching the C++ schema
export interface Document {
  id: string;
  title: string;
  filePath: string;
  fileType: "pdf" | "epub" | "markdown" | "html" | "youtube" | "audio" | "video" | "other";
  content?: string;  // Extracted text content
  contentHash?: string;
  totalPages?: number;
  currentPage?: number;
  currentScrollPercent?: number;
  currentCfi?: string;
  category?: string;
  tags: string[];
  dateAdded: string;
  dateModified: string;
  dateLastReviewed?: string;
  extractCount: number;
  learningItemCount: number;
  priorityRating: number;
  prioritySlider: number;
  priorityScore: number;
  isArchived: boolean;
  isFavorite: boolean;
  metadata?: DocumentMetadata;
  nextReadingDate?: string;
  readingCount?: number;
  stability?: number;
  difficulty?: number;
  reps?: number;
  totalTimeSpent?: number;
}

export interface DocumentMetadata {
  author?: string;
  subject?: string;
  keywords?: string[];
  createdAt?: string;
  modifiedAt?: string;
  fileSize?: number;
  language?: string;
  pageCount?: number;
  wordCount?: number;
  collectionId?: string;
}

export interface Extract {
  id: string;
  documentId: string;
  content: string;
  pageTitle?: string;
  pageNumber?: number;
  highlightColor?: string;
  notes?: string;
  progressiveDisclosureLevel: number;
  maxDisclosureLevel: number;
  dateCreated: string;
  dateModified: string;
  tags: string[];
  category?: string;
  learningItems: LearningItem[];
}

export interface LearningItem {
  id: string;
  extractId?: string;
  documentId?: string;
  itemType: "flashcard" | "cloze" | "qa" | "basic";
  question: string;
  answer?: string;
  clozeText?: string;
  clozeRanges?: [number, number][];
  difficulty: 1 | 2 | 3 | 4 | 5;
  interval: number;
  easeFactor: number;
  dueDate: string;
  dateCreated: string;
  dateModified: string;
  lastReviewDate?: string;
  reviewCount: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  isSuspended: boolean;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  description?: string;
  dateCreated: string;
  dateModified: string;
  documentCount: number;
  children?: Category[];
}

export interface Annotation {
  id: string;
  documentId: string;
  type: "highlight" | "underline" | "strikeout" | "comment" | "bookmark";
  pageNumber: number;
  content?: string;
  rect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  color: string;
  dateCreated: string;
  dateModified: string;
}
