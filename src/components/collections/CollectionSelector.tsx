/**
 * Collection Selector Component
 * Dropdown for selecting which collections a document belongs to
 */

import { useState, useEffect } from 'react';
import { Folder, Check, Plus, X } from 'lucide-react';
import {
  getCollections,
  addDocumentToCollection,
  removeDocumentFromCollection,
  createCollection,
  getDocumentCollections,
  type Collection,
} from '../../api/collections';

interface CollectionSelectorProps {
  documentId: string;
  className?: string;
  onCollectionChange?: (collections: Collection[]) => void;
}

export function CollectionSelector({
  documentId,
  className = '',
  onCollectionChange,
}: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCollections, docCollections] = await Promise.all([
        getCollections(),
        getDocumentCollections(documentId),
      ]);
      setCollections(allCollections);
      setSelectedIds(new Set(docCollections.map((c) => c.id)));
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (collectionId: string) => {
    const isCurrentlySelected = selectedIds.has(collectionId);

    try {
      if (isCurrentlySelected) {
        await removeDocumentFromCollection(documentId, collectionId);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await addDocumentToCollection(documentId, collectionId);
        setSelectedIds((prev) => new Set(prev).add(collectionId));
      }
      // Notify parent of change
      const updatedCollections = collections.filter((c) =>
        selectedIds.has(c.id) || c.id === collectionId
      );
      onCollectionChange?.(updatedCollections);
    } catch (error) {
      console.error('Failed to toggle collection:', error);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const newCollection = await createCollection(
        newCollectionName.trim(),
        'manual',
        undefined,
        undefined,
        undefined
      );
      setCollections((prev) => [...prev, newCollection]);
      setNewCollectionName('');
      setShowNewCollection(false);
      // Automatically add document to new collection
      await handleToggle(newCollection.id);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <Folder className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {selectedCount > 0 ? `${selectedCount} collection${selectedCount > 1 ? 's' : ''}` : 'Add to collection'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute z-20 w-64 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-medium text-foreground">Collections</span>
              {!showNewCollection && (
                <button
                  onClick={() => setShowNewCollection(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              )}
            </div>

            {/* New Collection Form */}
            {showNewCollection && (
              <div className="p-3 border-b border-border bg-muted/30">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateCollection();
                    } else if (e.key === 'Escape') {
                      setShowNewCollection(false);
                      setNewCollectionName('');
                    }
                  }}
                  placeholder="Collection name..."
                  className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCollection(false);
                      setNewCollectionName('');
                    }}
                    className="px-2 py-1 text-xs text-foreground hover:bg-muted rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Collections List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : collections.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No collections yet
                </div>
              ) : (
                collections.map((collection) => {
                  const isSelected = selectedIds.has(collection.id);
                  return (
                    <button
                      key={collection.id}
                      onClick={() => handleToggle(collection.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <div
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      {collection.icon && (
                        <span className="text-base">{collection.icon}</span>
                      )}
                      <span className="flex-1 text-sm text-foreground truncate">
                        {collection.name}
                      </span>
                      {collection.collectionType === 'smart' && (
                        <span className="text-xs text-muted-foreground">Smart</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
