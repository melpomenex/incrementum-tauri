/**
 * IndexedDB wrapper for browser-based storage
 * Mirrors the Rust Repository pattern for data consistency
 */

import { v4 as uuidv4 } from 'uuid';

// Database version - increment when schema changes
const DB_VERSION = 1;
const DB_NAME = 'incrementum';

// Store names
const STORES = {
    documents: 'documents',
    extracts: 'extracts',
    learningItems: 'learning_items',
    files: 'files',
    syncState: 'sync_state',
} as const;

let db: IDBDatabase | null = null;

/**
 * Open the IndexedDB database
 */
export async function openDatabase(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Documents store
            if (!database.objectStoreNames.contains(STORES.documents)) {
                const docStore = database.createObjectStore(STORES.documents, { keyPath: 'id' });
                docStore.createIndex('by_date_added', 'date_added', { unique: false });
                docStore.createIndex('by_sync_version', 'sync_version', { unique: false });
            }

            // Extracts store
            if (!database.objectStoreNames.contains(STORES.extracts)) {
                const extStore = database.createObjectStore(STORES.extracts, { keyPath: 'id' });
                extStore.createIndex('by_document', 'document_id', { unique: false });
                extStore.createIndex('by_next_review', 'next_review_date', { unique: false });
                extStore.createIndex('by_sync_version', 'sync_version', { unique: false });
            }

            // Learning items store
            if (!database.objectStoreNames.contains(STORES.learningItems)) {
                const itemStore = database.createObjectStore(STORES.learningItems, { keyPath: 'id' });
                itemStore.createIndex('by_document', 'document_id', { unique: false });
                itemStore.createIndex('by_extract', 'extract_id', { unique: false });
                itemStore.createIndex('by_due_date', 'due_date', { unique: false });
                itemStore.createIndex('by_sync_version', 'sync_version', { unique: false });
            }

            // Files store (for document blobs)
            if (!database.objectStoreNames.contains(STORES.files)) {
                database.createObjectStore(STORES.files, { keyPath: 'id' });
            }

            // Sync state store
            if (!database.objectStoreNames.contains(STORES.syncState)) {
                database.createObjectStore(STORES.syncState, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Generic get by ID
 */
async function getById<T>(storeName: string, id: string): Promise<T | null> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generic get all
 */
async function getAll<T>(storeName: string): Promise<T[]> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generic get by index
 */
async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generic put (insert or update)
 */
async function put<T>(storeName: string, item: T): Promise<T> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generic delete
 */
async function deleteById(storeName: string, id: string): Promise<void> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============= Document Operations =============

export interface Document {
    id: string;
    title: string;
    file_path: string;
    file_type: string;
    content?: string;
    content_hash?: string;
    total_pages?: number;
    current_page: number;
    category?: string;
    tags: string[];
    date_added: string;
    date_modified: string;
    date_last_reviewed?: string;
    extract_count: number;
    learning_item_count: number;
    priority_rating: number;
    priority_slider: number;
    priority_score: number;
    is_archived: boolean;
    is_favorite: boolean;
    metadata?: Record<string, unknown>;
    next_reading_date?: string;
    reading_count?: number;
    stability?: number;
    difficulty?: number;
    reps?: number;
    total_time_spent?: number;
    sync_version?: number;
    _deleted?: boolean;
}

export async function createDocument(doc: Partial<Document>): Promise<Document> {
    const now = new Date().toISOString();
    const document: Document = {
        id: doc.id || uuidv4(),
        title: doc.title || 'Untitled',
        file_path: doc.file_path || '',
        file_type: doc.file_type || 'pdf',
        content: doc.content,
        content_hash: doc.content_hash,
        total_pages: doc.total_pages,
        current_page: doc.current_page || 1,
        category: doc.category,
        tags: doc.tags || [],
        date_added: doc.date_added || now,
        date_modified: now,
        date_last_reviewed: doc.date_last_reviewed,
        extract_count: doc.extract_count || 0,
        learning_item_count: doc.learning_item_count || 0,
        priority_rating: doc.priority_rating || 3,
        priority_slider: doc.priority_slider || 50,
        priority_score: doc.priority_score || 50,
        is_archived: doc.is_archived || false,
        is_favorite: doc.is_favorite || false,
        metadata: doc.metadata,
        sync_version: 0, // Will be set during sync
    };
    return put(STORES.documents, document);
}

export async function getDocument(id: string): Promise<Document | null> {
    return getById<Document>(STORES.documents, id);
}

export async function getDocuments(): Promise<Document[]> {
    const docs = await getAll<Document>(STORES.documents);
    return docs.filter(d => !d._deleted).sort((a, b) =>
        new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
    );
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const existing = await getDocument(id);
    if (!existing) throw new Error(`Document ${id} not found`);

    const updated: Document = {
        ...existing,
        ...updates,
        id, // Ensure ID is not overwritten
        date_modified: new Date().toISOString(),
    };
    return put(STORES.documents, updated);
}

export async function deleteDocument(id: string): Promise<void> {
    // Soft delete for sync
    const doc = await getDocument(id);
    if (doc) {
        doc._deleted = true;
        doc.date_modified = new Date().toISOString();
        await put(STORES.documents, doc);
    }
}

// ============= Extract Operations =============

export interface MemoryState {
    stability: number;
    difficulty: number;
}

export interface Extract {
    id: string;
    document_id: string;
    content: string;
    page_title?: string;
    page_number?: number;
    highlight_color?: string;
    notes?: string;
    progressive_disclosure_level: number;
    max_disclosure_level: number;
    date_created: string;
    date_modified: string;
    tags: string[];
    category?: string;
    memory_state?: MemoryState;
    next_review_date?: string;
    last_review_date?: string;
    review_count: number;
    reps: number;
    sync_version?: number;
    _deleted?: boolean;
}

export async function createExtract(ext: Partial<Extract>): Promise<Extract> {
    const now = new Date().toISOString();
    const extract: Extract = {
        id: ext.id || uuidv4(),
        document_id: ext.document_id!,
        content: ext.content || '',
        page_title: ext.page_title,
        page_number: ext.page_number,
        highlight_color: ext.highlight_color,
        notes: ext.notes,
        progressive_disclosure_level: ext.progressive_disclosure_level || 0,
        max_disclosure_level: ext.max_disclosure_level || 3,
        date_created: ext.date_created || now,
        date_modified: now,
        tags: ext.tags || [],
        category: ext.category,
        memory_state: ext.memory_state,
        next_review_date: ext.next_review_date,
        last_review_date: ext.last_review_date,
        review_count: ext.review_count || 0,
        reps: ext.reps || 0,
        sync_version: 0,
    };

    // Update document extract count
    const doc = await getDocument(ext.document_id!);
    if (doc) {
        await updateDocument(doc.id, { extract_count: doc.extract_count + 1 });
    }

    return put(STORES.extracts, extract);
}

export async function getExtract(id: string): Promise<Extract | null> {
    return getById<Extract>(STORES.extracts, id);
}

export async function getExtractsByDocument(documentId: string): Promise<Extract[]> {
    const extracts = await getByIndex<Extract>(STORES.extracts, 'by_document', documentId);
    return extracts.filter(e => !e._deleted).sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
}

export async function updateExtract(id: string, updates: Partial<Extract>): Promise<Extract> {
    const existing = await getExtract(id);
    if (!existing) throw new Error(`Extract ${id} not found`);

    const updated: Extract = {
        ...existing,
        ...updates,
        id,
        date_modified: new Date().toISOString(),
    };
    return put(STORES.extracts, updated);
}

export async function deleteExtract(id: string): Promise<void> {
    const ext = await getExtract(id);
    if (ext) {
        ext._deleted = true;
        ext.date_modified = new Date().toISOString();
        await put(STORES.extracts, ext);

        // Update document extract count
        const doc = await getDocument(ext.document_id);
        if (doc && doc.extract_count > 0) {
            await updateDocument(doc.id, { extract_count: doc.extract_count - 1 });
        }
    }
}

export async function getDueExtracts(): Promise<Extract[]> {
    const database = await openDatabase();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORES.extracts, 'readonly');
        const store = tx.objectStore(STORES.extracts);
        const index = store.index('by_next_review');
        const range = IDBKeyRange.upperBound(now);
        const request = index.getAll(range);

        request.onsuccess = () => {
            const results = request.result.filter((e: Extract) => !e._deleted && e.next_review_date);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

// ============= Learning Item Operations =============

export interface LearningItem {
    id: string;
    extract_id?: string;
    document_id?: string;
    item_type: string;
    question: string;
    answer?: string;
    cloze_text?: string;
    difficulty: number;
    interval: number;
    ease_factor: number;
    due_date?: string;
    date_created: string;
    date_modified: string;
    last_review_date?: string;
    review_count: number;
    lapses: number;
    state: string;
    is_suspended: boolean;
    tags: string[];
    memory_state?: MemoryState;
    sync_version?: number;
    _deleted?: boolean;
}

export async function createLearningItem(item: Partial<LearningItem>): Promise<LearningItem> {
    const now = new Date().toISOString();
    const learningItem: LearningItem = {
        id: item.id || uuidv4(),
        extract_id: item.extract_id,
        document_id: item.document_id,
        item_type: item.item_type || 'flashcard',
        question: item.question || '',
        answer: item.answer,
        cloze_text: item.cloze_text,
        difficulty: item.difficulty || 0.3,
        interval: item.interval || 0,
        ease_factor: item.ease_factor || 2.5,
        due_date: item.due_date || now,
        date_created: item.date_created || now,
        date_modified: now,
        last_review_date: item.last_review_date,
        review_count: item.review_count || 0,
        lapses: item.lapses || 0,
        state: item.state || 'new',
        is_suspended: item.is_suspended || false,
        tags: item.tags || [],
        memory_state: item.memory_state,
        sync_version: 0,
    };

    // Update document learning item count
    if (item.document_id) {
        const doc = await getDocument(item.document_id);
        if (doc) {
            await updateDocument(doc.id, { learning_item_count: doc.learning_item_count + 1 });
        }
    }

    return put(STORES.learningItems, learningItem);
}

export async function getLearningItem(id: string): Promise<LearningItem | null> {
    return getById<LearningItem>(STORES.learningItems, id);
}

export async function getLearningItemsByDocument(documentId: string): Promise<LearningItem[]> {
    const items = await getByIndex<LearningItem>(STORES.learningItems, 'by_document', documentId);
    return items.filter(i => !i._deleted);
}

export async function updateLearningItem(id: string, updates: Partial<LearningItem>): Promise<LearningItem> {
    const existing = await getLearningItem(id);
    if (!existing) throw new Error(`Learning item ${id} not found`);

    const updated: LearningItem = {
        ...existing,
        ...updates,
        id,
        date_modified: new Date().toISOString(),
    };
    return put(STORES.learningItems, updated);
}

export async function deleteLearningItem(id: string): Promise<void> {
    const item = await getLearningItem(id);
    if (item) {
        item._deleted = true;
        item.date_modified = new Date().toISOString();
        await put(STORES.learningItems, item);

        // Update document learning item count
        if (item.document_id) {
            const doc = await getDocument(item.document_id);
            if (doc && doc.learning_item_count > 0) {
                await updateDocument(doc.id, { learning_item_count: doc.learning_item_count - 1 });
            }
        }
    }
}

export async function getDueLearningItems(): Promise<LearningItem[]> {
    const database = await openDatabase();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORES.learningItems, 'readonly');
        const store = tx.objectStore(STORES.learningItems);
        const index = store.index('by_due_date');
        const range = IDBKeyRange.upperBound(now);
        const request = index.getAll(range);

        request.onsuccess = () => {
            const results = request.result.filter((i: LearningItem) => !i._deleted && !i.is_suspended);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

// ============= File Operations =============

export interface StoredFile {
    id: string;
    filename: string;
    content_type: string;
    blob: Blob;
    created_at: string;
}

export async function storeFile(file: File): Promise<StoredFile> {
    const storedFile: StoredFile = {
        id: uuidv4(),
        filename: file.name,
        content_type: file.type,
        blob: file,
        created_at: new Date().toISOString(),
    };
    return put(STORES.files, storedFile);
}

export async function getFile(id: string): Promise<StoredFile | null> {
    return getById<StoredFile>(STORES.files, id);
}

export async function deleteFile(id: string): Promise<void> {
    return deleteById(STORES.files, id);
}

export async function getAllFiles(): Promise<StoredFile[]> {
    return getAll<StoredFile>(STORES.files);
}


// ============= Sync State Operations =============

export async function getSyncState(key: string): Promise<unknown> {
    const result = await getById<{ key: string; value: unknown }>(STORES.syncState, key);
    return result?.value;
}

export async function setSyncState(key: string, value: unknown): Promise<void> {
    await put(STORES.syncState, { key, value });
}

// ============= Bulk Operations for Sync =============

export async function getChangedDocuments(sinceSyncVersion: number): Promise<Document[]> {
    const all = await getAll<Document>(STORES.documents);
    return all.filter(d => (d.sync_version || 0) > sinceSyncVersion);
}

export async function getChangedExtracts(sinceSyncVersion: number): Promise<Extract[]> {
    const all = await getAll<Extract>(STORES.extracts);
    return all.filter(e => (e.sync_version || 0) > sinceSyncVersion);
}

export async function getChangedLearningItems(sinceSyncVersion: number): Promise<LearningItem[]> {
    const all = await getAll<LearningItem>(STORES.learningItems);
    return all.filter(i => (i.sync_version || 0) > sinceSyncVersion);
}

export async function bulkPutDocuments(docs: Document[]): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction(STORES.documents, 'readwrite');
    const store = tx.objectStore(STORES.documents);

    for (const doc of docs) {
        store.put(doc);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function bulkPutExtracts(extracts: Extract[]): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction(STORES.extracts, 'readwrite');
    const store = tx.objectStore(STORES.extracts);

    for (const ext of extracts) {
        store.put(ext);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function bulkPutLearningItems(items: LearningItem[]): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction(STORES.learningItems, 'readwrite');
    const store = tx.objectStore(STORES.learningItems);

    for (const item of items) {
        store.put(item);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
