/**
 * PositionIndicator Component
 *
 * Displays reading progress on document thumbnails and cards.
 */

import { formatProgress, getProgressGroup, type ProgressGroup } from '../../types/position';

interface PositionIndicatorProps {
  progress: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export function PositionIndicator({
  progress,
  size = 'md',
  showLabel = false,
  showPercentage = false,
  className = '',
}: PositionIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const group = getProgressGroup(clampedProgress);

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colors = getColorForGroup(group);

  return (
    <div className={`position-indicator ${className}`}>
      <div
        className={`relative ${heights[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: colors,
          }}
        />
      </div>
      {showLabel && <span className="text-xs text-gray-500 mt-1">{getGroupLabel(group)}</span>}
      {showPercentage && (
        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

function getColorForGroup(group: ProgressGroup): string {
  switch (group) {
    case 'not-started':
      return '#9CA3AF'; // gray
    case 'just-started':
      return '#60A5FA'; // blue
    case 'halfway':
      return '#818CF8'; // indigo
    case 'almost-done':
      return '#34D399'; // green
    case 'completed':
      return '#10B981'; // dark green
  }
}

function getGroupLabel(group: ProgressGroup): string {
  switch (group) {
    case 'not-started':
      return 'Not started';
    case 'just-started':
      return 'Just started';
    case 'halfway':
      return 'Halfway';
    case 'almost-done':
      return 'Almost done';
    case 'completed':
      return 'Completed';
  }
}

/**
 * ReadingTimeBadge Component
 *
 * Shows estimated reading time remaining
 */

interface ReadingTimeBadgeProps {
  wordCount?: number;
  pages?: number;
  currentPage?: number;
  totalPages?: number;
  className?: string;
}

export function ReadingTimeBadge({
  wordCount,
  pages,
  currentPage,
  totalPages,
  className = '',
}: ReadingTimeBadgeProps) {
  const timeRemaining = calculateTimeRemaining({ wordCount, pages, currentPage, totalPages });

  if (!timeRemaining) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {timeRemaining} left
    </span>
  );
}

interface TimeRemainingInput {
  wordCount?: number;
  pages?: number;
  currentPage?: number;
  totalPages?: number;
}

function calculateTimeRemaining(input: TimeRemainingInput): string | null {
  const { wordCount, pages, currentPage, totalPages } = input;
  const WORDS_PER_MINUTE = 250;
  const PAGES_PER_MINUTE = 2;

  if (wordCount) {
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  if (pages && totalPages && currentPage !== undefined) {
    const remainingPages = totalPages - currentPage;
    const minutes = Math.ceil(remainingPages / PAGES_PER_MINUTE);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return null;
}

/**
 * RecentlyViewedBadge Component
 */

interface RecentlyViewedBadgeProps {
  lastViewed: Date;
  className?: string;
}

export function RecentlyViewedBadge({ lastViewed, className = '' }: RecentlyViewedBadgeProps) {
  const timeAgo = formatTimeAgo(lastViewed);
  const isRecent = Date.now() - lastViewed.getTime() < 24 * 60 * 60 * 1000; // 24 hours

  if (!isRecent) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
      {timeAgo}
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
