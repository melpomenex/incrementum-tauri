/**
 * Continue Reading Page
 *
 * Displays documents with active reading sessions, grouped by progress.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentsWithProgress } from '../api/position';
import {
  DocumentWithProgress,
  getProgressGroup,
  PROGRESS_GROUPS,
  type ProgressGroup,
} from '../types/position';

interface GroupedDocuments {
  group: ProgressGroup;
  info: (typeof PROGRESS_GROUPS)[ProgressGroup];
  documents: DocumentWithProgress[];
}

export function ContinueReadingPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await getDocumentsWithProgress(50);
      // Filter out documents with 0 progress (not started)
      setDocuments(docs.filter((d) => d.progress > 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group documents by progress
  const groupedDocuments = documents.reduce<Record<ProgressGroup, DocumentWithProgress[]>>(
    (acc, doc) => {
      const group = getProgressGroup(doc.progress);
      if (!acc[group]) acc[group] = [];
      acc[group].push(doc);
      return acc;
    },
    {} as Record<ProgressGroup, DocumentWithProgress[]>,
  );

  // Convert to array and sort by group priority
  const groups: GroupedDocuments[] = Object.entries(groupedDocuments)
    .filter(([group]) => group !== 'not-started' && group !== 'completed')
    .map(([group, docs]) => ({
      group: group as ProgressGroup,
      info: PROGRESS_GROUPS[group as ProgressGroup],
      documents: docs.sort((a, b) => b.date_modified - a.date_modified),
    }))
    .sort((a, b) => {
      // Sort groups: just-started (0-25%), halfway (25-75%), almost-done (75-99%)
      const priority = { 'just-started': 0, halfway: 1, 'almost-done': 2 };
      return priority[a.group] - priority[b.group];
    });

  const handleDocumentClick = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const formatProgress = (progress: number) => {
    return `${Math.round(progress)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading continue reading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">Failed to load documents</div>
        <button
          onClick={loadDocuments}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="text-6xl mb-4">📚</div>
        <div className="text-lg font-medium">No documents in progress</div>
        <div className="text-sm mt-2">Start reading a document to see it here</div>
      </div>
    );
  }

  return (
    <div className="continue-reading-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Continue Reading</h1>
        <p className="text-gray-600 mt-1">Pick up where you left off</p>
      </div>

      {groups.map(
        ({ group, info, documents }) =>
          documents.length > 0 && (
            <div key={group} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{info.icon}</span>
                <h2 className="text-lg font-semibold">{info.label}</h2>
                <span className="text-sm text-gray-500">({documents.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc.id)}
                    className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
                        {doc.title}
                      </h3>
                      <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
                        {formatTimeAgo(doc.date_modified)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Progress bar */}
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(doc.progress, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatProgress(doc.progress)} complete
                        </span>
                        <span className="text-blue-500 font-medium">Resume →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}
