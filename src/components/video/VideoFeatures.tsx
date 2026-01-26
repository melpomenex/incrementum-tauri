/**
 * Video Features Component
 * Adds bookmarks, chapters, and transcript support to video players
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bookmark,
  Bookmark as BookmarkIcon,
  List,
  Plus,
  Trash2,
  ChevronRight,
  FileText,
  Clock,
  Hash,
} from 'lucide-react';
import { invokeCommand } from '../../lib/tauri';

interface VideoBookmark {
  id: string;
  document_id: string;
  title: string;
  time: number; // Timestamp in seconds
  thumbnail_url?: string;
  created_at: string;
}

interface VideoChapter {
  id: string;
  document_id: string;
  title: string;
  start_time: number;
  end_time: number;
  order: number;
}

interface VideoTranscriptSegment {
  time: number;
  text: string;
}

interface VideoFeaturesProps {
  documentId: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function VideoFeatures({
  documentId,
  currentTime,
  duration,
  onSeek,
  className = '',
}: VideoFeaturesProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'chapters' | 'transcript'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data when tab changes
  useEffect(() => {
    if (!documentId) return;
    loadData(activeTab);
  }, [documentId, activeTab]);

  const loadData = async (tab: string) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'bookmarks':
          const bookmarksData = await invokeCommand<VideoBookmark[]>('get_video_bookmarks', {
            documentId,
          });
          setBookmarks(bookmarksData);
          break;
        case 'chapters':
          const chaptersData = await invokeCommand<VideoChapter[]>('get_video_chapters', {
            documentId,
          });
          setChapters(chaptersData);
          break;
        case 'transcript':
          // Transcript is loaded directly in TranscriptView component
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${tab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Add bookmark
  const addBookmark = async (title?: string) => {
    if (!documentId) return;

    const bookmarkTitle = title || `Bookmark at ${formatTime(currentTime)}`;

    try {
      const newBookmark = await invokeCommand<VideoBookmark>('add_video_bookmark', {
        documentId,
        title: bookmarkTitle,
        time: currentTime,
      });

      setBookmarks((prev) => [...prev, newBookmark].sort((a, b) => a.time - b.time));
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    }
  };

  // Remove bookmark
  const removeBookmark = async (bookmarkId: string) => {
    try {
      await invokeCommand('delete_video_bookmark', {
        bookmarkId,
      });
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col bg-card border border-border rounded-lg ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'bookmarks'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground hover:text-foreground-secondary'
          }`}
        >
          <BookmarkIcon className="w-4 h-4" />
          Bookmarks
          {bookmarks.length > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {bookmarks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('chapters')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'chapters'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground hover:text-foreground-secondary'
          }`}
        >
          <List className="w-4 h-4" />
          Chapters
          {chapters.length > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {chapters.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'transcript'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground hover:text-foreground-secondary'
          }`}
        >
          <FileText className="w-4 h-4" />
          Transcript
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {activeTab === 'bookmarks' && (
              <BookmarksView
                bookmarks={bookmarks}
                currentTime={currentTime}
                onSeek={onSeek}
                onAdd={addBookmark}
                onRemove={removeBookmark}
              />
            )}

            {activeTab === 'chapters' && (
              <ChaptersView
                chapters={chapters}
                currentTime={currentTime}
                duration={duration}
                onSeek={onSeek}
              />
            )}

            {activeTab === 'transcript' && (
              <TranscriptView documentId={documentId} currentTime={currentTime} onSeek={onSeek} />
            )}
          </>
        )}
      </div>

      {/* Add button for current tab */}
      <div className="p-3 border-t border-border">
        {activeTab === 'bookmarks' && (
          <button
            onClick={() => addBookmark()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Bookmark at {formatTime(currentTime)}
          </button>
        )}
      </div>
    </div>
  );
}

// Bookmarks View Component
interface BookmarksViewProps {
  bookmarks: VideoBookmark[];
  currentTime: number;
  onSeek: (time: number) => void;
  onAdd: (title?: string) => void;
  onRemove: (id: string) => void;
}

function BookmarksView({ bookmarks, currentTime, onSeek, onAdd, onRemove }: BookmarksViewProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <BookmarkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-foreground-secondary">
          No bookmarks yet. Click the button below to add one at the current position.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center gap-3 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors group"
        >
          <button
            onClick={() => onSeek(bookmark.time)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {bookmark.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(bookmark.time)}
              </div>
            </div>
          </button>
          <button
            onClick={() => onRemove(bookmark.id)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Remove bookmark"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Chapters View Component
interface ChaptersViewProps {
  chapters: VideoChapter[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function ChaptersView({ chapters, currentTime, duration, onSeek }: ChaptersViewProps) {
  if (chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <List className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-foreground-secondary">
          No chapters available. Chapters can be added manually or detected from video metadata.
        </p>
      </div>
    );
  }

  const getCurrentChapter = () => {
    return chapters.find((ch) => currentTime >= ch.start_time && currentTime < ch.end_time);
  };

  const currentChapter = getCurrentChapter();

  return (
    <div className="space-y-2">
      {/* Current Chapter Indicator */}
      {currentChapter && (
        <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg text-sm text-primary">
          Currently watching: {currentChapter.title}
        </div>
      )}

      {chapters.map((chapter, index) => {
        const isCurrent = currentTime >= chapter.start_time && currentTime < chapter.end_time;
        const progress = ((currentTime - chapter.start_time) / (chapter.end_time - chapter.start_time)) * 100;
        const isCompleted = currentTime >= chapter.end_time;

        return (
          <button
            key={chapter.id}
            onClick={() => onSeek(chapter.start_time)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
              isCurrent
                ? 'bg-primary text-primary-foreground'
                : isCompleted
                ? 'opacity-50'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
          >
            <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{chapter.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
              </div>
            </div>
            {isCurrent && (
              <div className="text-xs text-primary-foreground">
                {Math.round(progress)}%
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Transcript View Component
interface TranscriptViewProps {
  documentId: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

function TranscriptView({ documentId, currentTime, onSeek }: TranscriptViewProps) {
  const [transcript, setTranscript] = useState<VideoTranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTranscript();
  }, [documentId]);

  const loadTranscript = async () => {
    setLoading(true);
    try {
      const result = await invokeCommand<{ document_id: string; transcript: string; segments: VideoTranscriptSegment[] } | null>(
        'get_video_transcript',
        { documentId }
      );
      if (result) {
        setTranscript(result.segments);
      } else {
        setTranscript([]);
      }
    } catch (error) {
      console.error('Failed to load transcript:', error);
      setTranscript([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading transcript...</div>
      </div>
    );
  }

  if (transcript.length === 0) {
    return (
      <div className="text-center py-8">
        <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-foreground-secondary">
          No transcript available. Transcripts can be generated automatically or uploaded manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transcript.map((segment, index) => {
        const isActive = Math.abs(currentTime - segment.time) < 1;

        return (
          <button
            key={index}
            onClick={() => onSeek(segment.time)}
            className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <span className="text-xs text-muted-foreground font-mono">
              {formatTime(segment.time)}
            </span>
            <span className="text-sm text-foreground">{segment.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
