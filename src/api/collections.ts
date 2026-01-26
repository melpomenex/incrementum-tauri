/**
 * Collections API
 */

import { invoke } from '@tauri-apps/api/core';
import type { Collection } from '../types/collection';

/**
 * Create a new collection
 */
export async function createCollection(
  name: string,
  collectionType: 'manual' | 'smart',
  filterQuery?: string,
  icon?: string,
  color?: string
): Promise<Collection> {
  return await invoke<Collection>('create_collection', {
    name,
    collectionType,
    filterQuery,
    icon,
    color,
  });
}

/**
 * Get all collections
 */
export async function getCollections(): Promise<Collection[]> {
  return await invoke<Collection[]>('get_collections');
}

/**
 * Get a specific collection
 */
export async function getCollection(id: string): Promise<Collection> {
  return await invoke<Collection>('get_collection', { id });
}

/**
 * Update a collection
 */
export async function updateCollection(
  id: string,
  name?: string,
  icon?: string,
  color?: string,
  filterQuery?: string
): Promise<Collection> {
  return await invoke<Collection>('update_collection', {
    id,
    name,
    icon,
    color,
    filterQuery,
  });
}

/**
 * Delete a collection
 */
export async function deleteCollection(id: string): Promise<void> {
  return await invoke('delete_collection', { id });
}

/**
 * Add a document to a collection
 */
export async function addDocumentToCollection(
  documentId: string,
  collectionId: string
): Promise<void> {
  return await invoke('add_document_to_collection', {
    documentId,
    collectionId,
  });
}

/**
 * Remove a document from a collection
 */
export async function removeDocumentFromCollection(
  documentId: string,
  collectionId: string
): Promise<void> {
  return await invoke('remove_document_from_collection', {
    documentId,
    collectionId,
  });
}

/**
 * Get all documents in a collection
 */
export async function getCollectionDocuments(collectionId: string): Promise<string[]> {
  return await invoke<string[]>('get_collection_documents', { collectionId });
}

/**
 * Get all collections for a document
 */
export async function getDocumentCollections(documentId: string): Promise<Collection[]> {
  return await invoke<Collection[]>('get_document_collections', { documentId });
}

/**
 * Preview smart collection results
 */
export async function getSmartCollectionPreview(filterQuery: string): Promise<string[]> {
  return await invoke<string[]>('get_smart_collection_preview', { filterQuery });
}

/**
 * Reorder collections
 */
export async function reorderCollections(collectionIds: string[]): Promise<void> {
  return await invoke('reorder_collections', { collectionIds });
}
