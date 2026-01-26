/**
 * Video Import Component
 * Allows users to import local video files with metadata
 */

import { useState, useCallback } from 'react';
import { Film, Upload, X, Clock, FileVideo } from 'lucide-react';
import { invokeCommand } from '../../lib/tauri';
import type { Document } from '../../types/document';

interface VideoImportProps {
  onImport?: (document: Document) => void;
  onCancel?: () => void;
}

export function VideoImport({ onImport, onCancel }: VideoImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check if it's a video file
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
    setError(null);
  }, []);

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Import via Tauri command
      const result = await invokeCommand<Document>('import_video_file', {
        filename: file.name,
        title: title.trim(),
        content: Array.from(bytes),
      });

      onImport?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import video');
    } finally {
      setProcessing(false);
    }
  };

  const getVideoDuration = async (): Promise<number> => {
    if (!file) return 0;

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(0);
      };
    });
  };

  const [duration, setDuration] = useState<number | null>(null);

  // Load duration when file is selected
  if (file && duration === null) {
    getVideoDuration().then(setDuration);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Import Video</h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Video File
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-file-input"
              />
              <div
                className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  file ? 'border-primary' : 'border-border'
                }`}
              >
                {file ? (
                  <>
                    <FileVideo className="w-5 h-5 text-primary" />
                    <span className="text-sm truncate">{file.name}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Choose file...</span>
                  </>
                )}
              </div>
              <label htmlFor="video-file-input" className="cursor-pointer">
                <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-90">
                  Browse
                </button>
              </label>
            </label>
          </div>
        </div>

        {/* Video Info */}
        {file && (
          <div className="p-3 bg-muted/30 rounded-lg space-y-1">
            <div className="text-sm text-foreground">
              <span className="font-medium">File:</span> {file.name}
            </div>
            <div className="text-sm text-foreground">
              <span className="font-medium">Size:</span> {(file.size / (1024 * 1024)).toFixed(2)} MB
            </div>
            <div className="text-sm text-foreground">
              <span className="font-medium">Type:</span> {file.type}
            </div>
            {duration !== null && duration > 0 && (
              <div className="flex items-center gap-1 text-sm text-foreground">
                <Clock className="w-3 h-3" />
                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleImport}
            disabled={!file || !title.trim() || processing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Import Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
