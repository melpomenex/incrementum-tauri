/**
 * Collections Panel Component
 * Sidebar panel showing all collections with document counts
 */

import { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Star,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  getCollections,
  type Collection,
  PRESET_COLLECTIONS,
  getPresetCollectionName,
  getPresetCollectionIcon,
  getPresetCollectionColor,
  isPresetCollection,
} from '../../api/collections';
import { useDocumentStore } from '../../stores/documentStore';
import { useCollectionStore } from '../../stores/collectionStore';

interface CollectionsPanelProps {
  className?: string;
  onCollectionSelect?: (collectionId: string | null) => void;
  selectedCollectionId?: string | null;
}

export function CollectionsPanel({
  className = '',
  onCollectionSelect,
  selectedCollectionId,
}: CollectionsPanelProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const documents = useDocumentStore((state) => state.documents);
  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getDocumentCount = (collection: Collection): number => {
    // For preset collections, calculate count from documents
    if (isPresetCollection(collection.id)) {
      return documents.filter((doc) => {
        const progress = (doc.currentPage / doc.totalPages) * 100;
        switch (collection.id) {
          case PRESET_COLLECTIONS.TO_READ:
            return progress === 0;
          case PRESET_COLLECTIONS.IN_PROGRESS:
            return progress > 0 && progress < 100;
          case PRESET_COLLECTIONS.COMPLETED:
            return progress >= 100;
          case PRESET_COLLECTIONS.FAVORITES:
            return doc.isFavorite;
          case PRESET_COLLECTIONS.RECENT:
            const daysSinceAdded = Math.floor(
              (Date.now() - new Date(doc.dateAdded).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceAdded <= 7;
          default:
            return false;
        }
      }).length;
    }
    // For custom collections, we'd need to fetch from backend
    return 0;
  };

  const handleSelect = (collectionId: string) => {
    onCollectionSelect?.(collectionId);
  };

  const handleSelectAll = () => {
    onCollectionSelect?.(null);
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted rounded w-2/3 mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Collections</h3>
        <button
          className="p-1 hover:bg-muted rounded transition-colors"
          title="New collection"
        >
          <Plus className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* All Documents */}
      <button
        onClick={handleSelectAll}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors mb-1 ${
          selectedCollectionId === null
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-sm flex-1 text-left">All Documents</span>
        <span className="text-xs text-muted-foreground">{documents.length}</span>
      </button>

      {/* Collections List */}
      <div className="space-y-0.5">
        {collections.map((collection) => {
          const count = getDocumentCount(collection);
          const isPreset = isPresetCollection(collection.id);
          const icon = isPreset
            ? getPresetCollectionIcon(collection.id)
            : collection.icon || '📁';
          const color = isPreset
            ? getPresetCollectionColor(collection.id)
            : collection.color || '#6b7280';

          return (
            <div key={collection.id}>
              <button
                onClick={() => handleSelect(collection.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  selectedCollectionId === collection.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span className="text-sm flex-1 text-left">{collection.name}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <div className="text-center py-4">
          <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">
            No collections yet
          </p>
        </div>
      )}
    </div>
  );
}
