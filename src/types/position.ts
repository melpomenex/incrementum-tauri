/**
 * Position tracking types for incremental reading
 */

/**
 * Unified position representation for all document types
 */
export type DocumentPosition =
  | { type: 'page'; page: number; offset?: number }
  | { type: 'scroll'; percent: number; element_id?: string }
  | { type: 'cfi'; cfi: string; offset?: number }
  | { type: 'time'; seconds: number; total_duration?: number };

/**
 * Calculate progress percentage from a DocumentPosition
 */
export function getPositionProgress(position: DocumentPosition): number | null {
  switch (position.type) {
    case 'page':
      // Without total pages, we can't calculate percentage
      return null;
    case 'scroll':
      return position.percent;
    case 'cfi':
      // CFI doesn't directly give us progress
      return null;
    case 'time':
      if (position.total_duration) {
        return (position.seconds / position.total_duration) * 100;
      }
      return null;
  }
}

/**
 * Create a page position
 */
export function pagePosition(page: number, offset?: number): DocumentPosition {
  return { type: 'page', page, offset };
}

/**
 * Create a scroll position
 */
export function scrollPosition(percent: number, elementId?: string): DocumentPosition {
  return { type: 'scroll', percent, element_id: elementId };
}

/**
 * Create a CFI position (EPUB)
 */
export function cfiPosition(cfi: string, offset?: number): DocumentPosition {
  return { type: 'cfi', cfi, offset };
}

/**
 * Create a time position (video/audio)
 */
export function timePosition(seconds: number, totalDuration?: number): DocumentPosition {
  return { type: 'time', seconds, total_duration: totalDuration };
}

/**
 * Format position for display
 */
export function formatPosition(position: DocumentPosition): string {
  switch (position.type) {
    case 'page':
      return position.offset !== undefined
        ? `Page ${position.page} (${Math.round(position.offset * 100)}%)`
        : `Page ${position.page}`;
    case 'scroll':
      return `${position.percent.toFixed(1)}%`;
    case 'cfi':
      return `CFI: ${position.cfi.substring(0, 20)}...`;
    case 'time':
      if (position.total_duration) {
        const formatTime = (s: number) => {
          const mins = Math.floor(s / 60);
          const secs = s % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        return `${formatTime(position.seconds)} / ${formatTime(position.total_duration)}`;
      }
      const mins = Math.floor(position.seconds / 60);
      const secs = position.seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Bookmark for a specific position in a document
 */
export interface Bookmark {
  id: string;
  document_id: string;
  name: string;
  position: DocumentPosition;
  thumbnail?: string; // Base64 encoded thumbnail
  created_at: string;
}

/**
 * Reading session tracking
 */
export interface ReadingSession {
  id: string;
  document_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  pages_read: number | null;
  progress_start: number;
  progress_end: number;
}

/**
 * Daily reading statistics
 */
export interface DailyReadingStats {
  date: string; // YYYY-MM-DD
  total_seconds: number;
  documents_read: number;
  total_pages_read: number;
  session_count: number;
}

/**
 * Reading streak information
 */
export interface ReadingStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  is_active: boolean;
}

/**
 * Document with progress information
 */
export interface DocumentWithProgress {
  id: string;
  progress: number;
  title: string;
  date_modified: number;
}

/**
 * Progress grouping for Continue Reading page
 */
export type ProgressGroup = 'not-started' | 'just-started' | 'halfway' | 'almost-done' | 'completed';

export function getProgressGroup(progress: number): ProgressGroup {
  if (progress === 0) return 'not-started';
  if (progress < 25) return 'just-started';
  if (progress < 75) return 'halfway';
  if (progress < 99) return 'almost-done';
  return 'completed';
}

export interface ProgressGroupInfo {
  group: ProgressGroup;
  label: string;
  icon: string;
  description: string;
}

export const PROGRESS_GROUPS: Record<ProgressGroup, ProgressGroupInfo> = {
  'not-started': {
    group: 'not-started',
    label: 'Not Started',
    icon: '📚',
    description: "Documents you haven't started reading yet",
  },
  'just-started': {
    group: 'just-started',
    label: 'Just Started',
    icon: '🔖',
    description: "Documents you've started (0-25% progress)",
  },
  'halfway': {
    group: 'halfway',
    label: 'Halfway Through',
    icon: '📖',
    description: "Documents you're making progress on (25-75%)",
  },
  'almost-done': {
    group: 'almost-done',
    label: 'Almost Done',
    icon: '🏁',
    description: "Documents you're nearly finished with (75-99%)",
  },
  'completed': {
    group: 'completed',
    label: 'Completed',
    icon: '✅',
    description: "Documents you've finished reading",
  },
};
