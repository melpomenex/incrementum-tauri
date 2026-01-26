/**
 * BookmarkManager Component
 *
 * Manages bookmarks within a document viewer with creation, listing, and deletion.
 */

import { useEffect, useState } from 'react';
import { createBookmark, deleteBookmark, listBookmarks, type Bookmark } from '../../api/position';
import type { DocumentPosition } from '../../types/position';
import { formatPosition } from '../../types/position';

interface BookmarkManagerProps {
  documentId: string;
  currentPosition: DocumentPosition;
  onCreateBookmark?: (bookmark: Bookmark) => void;
  onNavigateToBookmark?: (position: DocumentPosition) => void;
  className?: string;
}

export function BookmarkManager({
  documentId,
  currentPosition,
  onCreateBookmark,
  onNavigateToBookmark,
  className = '',
}: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, [documentId]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listBookmarks(documentId);
      setBookmarks(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBookmark = async () => {
    const name = newBookmarkName.trim() || `Bookmark at ${formatPosition(currentPosition)}`;
    try {
      setError(null);
      const bookmark = await createBookmark(documentId, name, currentPosition);
      setBookmarks([...bookmarks, bookmark]);
      setShowCreateDialog(false);
      setNewBookmarkName('');
      onCreateBookmark?.(bookmark);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bookmark');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      setError(null);
      await deleteBookmark(bookmarkId);
      setBookmarks(bookmarks.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
    }
  };

  const handleNavigateToBookmark = (bookmark: Bookmark) => {
    onNavigateToBookmark?.(bookmark.position);
  };

  return (
    <div className={`bookmark-manager ${className}`}>
      {/* Bookmark Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Bookmarks"
      >
        <svg
          className="w-5 h-5 text-gray-700 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {bookmarks.length > 0 && (
          <span className="ml-1 text-xs text-gray-500">({bookmarks.length})</span>
        )}
      </button>

      {/* Bookmark Panel */}
      {showPanel && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bookmarks</h3>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : bookmarks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No bookmarks yet</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookmarks.map((bookmark) => (
                  <li
                    key={bookmark.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNavigateToBookmark(bookmark)}
                      >
                        <div className="font-medium text-sm truncate">{bookmark.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatPosition(bookmark.position)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete bookmark"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Create Bookmark Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create Bookmark</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newBookmarkName}
                onChange={(e) => setNewBookmarkName(e.target.value)}
                placeholder={`Bookmark at ${formatPosition(currentPosition)}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBookmark();
                  } else if (e.key === 'Escape') {
                    setShowCreateDialog(false);
                  }
                }}
              />
            </div>

            <div className="mb-4 text-sm text-gray-500">
              Position: {formatPosition(currentPosition)}
            </div>

            {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewBookmarkName('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBookmark}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quick Bookmark Button
 *
 * A standalone button for quickly creating a bookmark at the current position.
 */

interface QuickBookmarkButtonProps {
  documentId: string;
  currentPosition: DocumentPosition;
  onBookmarkCreated?: (bookmark: Bookmark) => void;
  className?: string;
}

export function QuickBookmarkButton({
  documentId,
  currentPosition,
  onBookmarkCreated,
  className = '',
}: QuickBookmarkButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = async () => {
    try {
      const name = `Bookmark at ${formatPosition(currentPosition)}`;
      const bookmark = await createBookmark(documentId, name, currentPosition);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
      onBookmarkCreated?.(bookmark);
    } catch (err) {
      console.error('Failed to create bookmark:', err);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`quick-bookmark-button ${className}`}
      title={showFeedback ? 'Bookmark created!' : 'Add bookmark (Ctrl+B)'}
    >
      <svg
        className="w-5 h-5"
        fill={showFeedback ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}
