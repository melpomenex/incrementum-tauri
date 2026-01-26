/**
 * Collection types
 */

export type CollectionType = 'manual' | 'smart';

export interface Collection {
  id: string;
  name: string;
  parentId: string | null;
  collectionType: CollectionType;
  filterQuery: string | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface SmartCollectionFilter {
  tags?: string[];
  excludeTags?: string[];
  category?: string;
  fileType?: string[];
  progressMin?: number;
  progressMax?: number;
  addedWithinDays?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

// Preset collections that are always available
export const PRESET_COLLECTIONS = {
  TO_READ: 'to-read',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAVORITES: 'favorites',
  RECENT: 'recent',
} as const;

export type PresetCollection = typeof PRESET_COLLECTIONS[keyof typeof PRESET_COLLECTIONS];

export function isPresetCollection(id: string): id is PresetCollection {
  return Object.values(PRESET_COLLECTIONS).includes(id as PresetCollection);
}

export function getPresetCollectionName(id: PresetCollection): string {
  switch (id) {
    case PRESET_COLLECTIONS.TO_READ:
      return 'To Read';
    case PRESET_COLLECTIONS.IN_PROGRESS:
      return 'In Progress';
    case PRESET_COLLECTIONS.COMPLETED:
      return 'Completed';
    case PRESET_COLLECTIONS.FAVORITES:
      return 'Favorites';
    case PRESET_COLLECTIONS.RECENT:
      return 'Recent';
  }
}

export function getPresetCollectionIcon(id: PresetCollection): string {
  switch (id) {
    case PRESET_COLLECTIONS.TO_READ:
      return '📚';
    case PRESET_COLLECTIONS.IN_PROGRESS:
      return '📖';
    case PRESET_COLLECTIONS.COMPLETED:
      return '✅';
    case PRESET_COLLECTIONS.FAVORITES:
      return '⭐';
    case PRESET_COLLECTIONS.RECENT:
      return '🕐';
  }
}

export function getPresetCollectionColor(id: PresetCollection): string {
  switch (id) {
    case PRESET_COLLECTIONS.TO_READ:
      return '#6366f1'; // indigo
    case PRESET_COLLECTIONS.IN_PROGRESS:
      return '#f59e0b'; // amber
    case PRESET_COLLECTIONS.COMPLETED:
      return '#10b981'; // green
    case PRESET_COLLECTIONS.FAVORITES:
      return '#fbbf24'; // yellow
    case PRESET_COLLECTIONS.RECENT:
      return '#8b5cf6'; // violet
  }
}

export function getPresetCollectionFilter(id: PresetCollection): SmartCollectionFilter | null {
  switch (id) {
    case PRESET_COLLECTIONS.TO_READ:
      return { progressMin: 0, progressMax: 0, isArchived: false };
    case PRESET_COLLECTIONS.IN_PROGRESS:
      return { progressMin: 1, progressMax: 99, isArchived: false };
    case PRESET_COLLECTIONS.COMPLETED:
      return { progressMin: 99, progressMax: 100, isArchived: false };
    case PRESET_COLLECTIONS.FAVORITES:
      return { isFavorite: true, isArchived: false };
    case PRESET_COLLECTIONS.RECENT:
      return { addedWithinDays: 7, isArchived: false };
  }
}
