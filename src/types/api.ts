// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ImportProgress {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  fileTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  minPriority?: number;
  maxPriority?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface SortOptions {
  field: "title" | "dateAdded" | "dateModified" | "priority" | "dueDate";
  direction: "asc" | "desc";
}
