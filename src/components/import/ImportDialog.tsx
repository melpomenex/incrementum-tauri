/**
 * Enhanced Import Dialog
 *
 * Provides content preview, metadata extraction, and import options
 */

import { useState, useEffect } from 'react';
import { X, FileText, Clock, Tag, FolderOpen, AlertCircle } from 'lucide-react';
import { fetchUrlContent, type FetchedUrlContent } from '../../api/documents';
import type { Document } from '../../types/document';

interface ImportDialogProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onImport: (options: ImportOptions) => Promise<void>;
}

export interface ImportOptions {
  title: string;
  tags: string[];
  category?: string;
  collection?: string;
  priority: number;
  autoExtract: boolean;
  generateQA: boolean;
  generateCloze: boolean;
}

interface ContentPreview {
  title: string;
  author?: string;
  wordCount?: number;
  readingTime?: number;
  excerpt: string;
  content?: string;
  contentType: string;
  sourceType: 'article' | 'blog' | 'paper' | 'video' | 'other';
}

export function ImportDialog({ url, isOpen, onClose, onImport }: ImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ContentPreview | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    title: '',
    tags: [],
    priority: 0,
    autoExtract: true,
    generateQA: false,
    generateCloze: false,
  });
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && url) {
      loadPreview();
    }
  }, [isOpen, url]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await fetchUrlContent(url);
      const wordCount = content.text?.length || 0;
      const readingTime = Math.ceil(wordCount / 250); // 250 WPM

      // Detect content type and source
      const sourceType = detectSourceType(url, content);
      const contentType = detectContentType(content);

      // Generate excerpt (first 200 chars)
      const excerpt = content.text?.substring(0, 200) || '';

      setPreview({
        title: content.title || extractTitleFromUrl(url),
        author: content.author,
        wordCount,
        readingTime,
        excerpt,
        content: content.text,
        contentType,
        sourceType,
      });

      // Set default title from preview
      setImportOptions((prev) => ({
        ...prev,
        title: content.title || extractTitleFromUrl(url),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    try {
      await onImport(importOptions);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !importOptions.tags.includes(tag)) {
      setImportOptions((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setImportOptions((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const detectSourceType = (url: string, content: FetchedUrlContent): ContentPreview['sourceType'] => {
    const hostname = new URL(url).hostname.toLowerCase();

    // Check for known sources
    if (hostname.includes('medium.com')) return 'blog';
    if (hostname.includes('notion.site')) return 'article';
    if (hostname.includes('arxiv.org')) return 'paper';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'video';

    // Check content characteristics
    if (content.html?.includes('article') || content.html?.includes('post')) {
      return 'article';
    }

    return 'other';
  };

  const detectContentType = (content: FetchedUrlContent): string => {
    if (content.html?.includes('<article>') || content.html?.includes('blog-post')) {
      return 'Article';
    }
    if (content.html?.includes('abstract') || content.html?.includes('paper')) {
      return 'Research Paper';
    }
    return 'Web Page';
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts[pathParts.length - 1]?.replace(/-/g, ' ') || url;
    } catch {
      return url;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Import from Web</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading preview...</div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Failed to load content</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            </div>
          )}

          {preview && !loading && (
            <>
              {/* URL & Content Info */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{url}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{preview.contentType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-2 font-medium capitalize">{preview.sourceType}</span>
                  </div>
                  {preview.readingTime && (
                    <div>
                      <span className="text-gray-500">Reading time:</span>
                      <span className="ml-2 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {preview.readingTime} min
                      </span>
                    </div>
                  )}
                  {preview.wordCount && (
                    <div>
                      <span className="text-gray-500">Words:</span>
                      <span className="ml-2 font-medium">{preview.wordCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Excerpt */}
              {preview.excerpt && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Preview</div>
                  <p className="text-sm line-clamp-3">{preview.excerpt}...</p>
                </div>
              )}

              {/* Import Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={importOptions.title}
                    onChange={(e) => setImportOptions((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {importOptions.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auto-extract options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={importOptions.autoExtract}
                        onChange={(e) => setImportOptions((prev) => ({ ...prev, autoExtract: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Auto-extract key passages</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={importOptions.generateQA}
                        onChange={(e) => setImportOptions((prev) => ({ ...prev, generateQA: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Generate Q&A items</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={importOptions.generateCloze}
                        onChange={(e) => setImportOptions((prev) => ({ ...prev, generateCloze: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Create cloze deletions</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!preview || !importOptions.title}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * detectSourceType and helper functions
 */

function detectSourceType(url: string, content: FetchedUrlContent): 'article' | 'blog' | 'paper' | 'video' | 'other' {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('medium.com')) return 'blog';
  if (hostname.includes('notion.site')) return 'article';
  if (hostname.includes('arxiv.org')) return 'paper';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'video';

  return 'other';
}

function detectContentType(content: FetchedUrlContent): string {
  if (content.html?.includes('<article>') || content.html?.includes('blog-post')) {
    return 'Article';
  }
  if (content.html?.includes('abstract') || content.html?.includes('paper')) {
    return 'Research Paper';
  }
  return 'Web Page';
}
