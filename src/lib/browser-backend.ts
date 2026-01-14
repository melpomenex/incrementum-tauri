/**
 * Browser backend command handlers
 * Maps Tauri command names to IndexedDB operations
 */

import * as db from './database.js';
import { getBrowserFile } from './browser-file-store';
import { parseAnkiPackage, convertAnkiToLearningItems } from '../utils/ankiParserBrowser';

type CommandHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Helper to convert snake_case DB objects to camelCase frontend objects
function toCamelCase(obj: any): any {
    if (obj === undefined || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

/**
 * Command handlers mapping - mirrors Tauri commands
 */
const commandHandlers: Record<string, CommandHandler> = {
    // Document commands
    get_documents: async () => {
        const docs = await db.getDocuments();
        return toCamelCase(docs);
    },

    get_document: async (args) => {
        const id = args.id as string;
        const doc = await db.getDocument(id);
        return doc ? toCamelCase(doc) : null;
    },

    create_document: async (args) => {
        const doc = await db.createDocument({
            title: args.title as string,
            file_path: args.filePath as string,
            file_type: args.fileType as string,
        });
        return toCamelCase(doc);
    },

    update_document: async (args) => {
        const id = args.id as string;
        const updates = args.updates as any;
        // Convert camelCase updates back to snake_case for DB
        const dbUpdates: any = {};
        for (const key in updates) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            dbUpdates[snakeKey] = updates[key];
        }
        const doc = await db.updateDocument(id, dbUpdates);
        return toCamelCase(doc);
    },

    update_document_content: async (args) => {
        const id = args.id as string;
        const content = args.content as string;
        const doc = await db.updateDocument(id, { content });
        return toCamelCase(doc);
    },

    update_document_priority: async (args) => {
        const id = args.id as string;
        const rating = args.rating as number;
        const slider = args.slider as number;
        // Calculate priority score based on rating and slider
        const priorityScore = (rating / 5) * 50 + (slider / 100) * 50;
        const doc = await db.updateDocument(id, {
            priority_rating: rating,
            priority_slider: slider,
            priority_score: priorityScore,
        });
        return toCamelCase(doc);
    },

    delete_document: async (args) => {
        const id = args.id as string;
        await db.deleteDocument(id);
        return null;
    },

    import_document: async (args) => {
        // In browser mode, file is passed as File object or base64
        const filePath = args.filePath as string;
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Untitled';
        const fileType = fileName.split('.').pop()?.toLowerCase() || 'pdf';

        // Check if this is a virtual browser file path
        if (filePath.startsWith('browser-file://')) {
            const file = getBrowserFile(filePath);
            if (file) {
                // Store the file blob in IndexedDB
                await db.storeFile(file);
            } else {
                console.warn('[Browser] File not found in browser store:', filePath);
            }
        }

        const doc = await db.createDocument({
            title: fileName.replace(/\.[^/.]+$/, ''),
            file_path: filePath,
            file_type: fileType,
        });
        return toCamelCase(doc);
    },

    import_documents: async (args) => {
        const filePaths = args.filePaths as string[];
        const docs = [];
        for (const filePath of filePaths) {
            const doc = await commandHandlers.import_document({ filePath });
            docs.push(doc);
        }
        return docs;
    },

    read_document_file: async (args) => {
        // In browser mode, return the file from IndexedDB if stored
        const filePath = args.filePath as string;

        // If it's a browser-file:// path, try to find it in the file store first (IndexedDB)
        if (filePath.startsWith('browser-file://')) {
            // Workaround: We will use the file content from the browserFileStore if it's still in memory (session),
            // otherwise falling back to IndexedDB would require a query.

            const file = getBrowserFile(filePath);
            if (file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            // If not in memory (page refresh), we need to check IndexedDB 'files' store
            const files = await db.getAllFiles();
            // Assumes filename is part of the virtual path and unique enough for now
            const filename = filePath.replace('browser-file://', '');
            const storedFile = files.find(f => f.filename === filename);

            if (storedFile) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(storedFile.blob);
                });
            }
        }

        console.warn('[Browser] read_document_file file not found:', filePath);
        return '';
    },

    // Extract commands
    get_extracts: async (args) => {
        const documentId = args.documentId as string;
        const extracts = await db.getExtractsByDocument(documentId);
        return toCamelCase(extracts);
    },

    get_extract: async (args) => {
        const id = args.id as string;
        const extract = await db.getExtract(id);
        return extract ? toCamelCase(extract) : null;
    },

    create_extract: async (args) => {
        const extract = await db.createExtract({
            document_id: args.documentId as string,
            content: args.content as string,
            notes: args.note as string | undefined,
            tags: args.tags as string[] | undefined,
            category: args.category as string | undefined,
            highlight_color: args.color as string | undefined,
            page_number: args.pageNumber as number | undefined,
        });
        return toCamelCase(extract);
    },

    update_extract: async (args) => {
        const id = args.id as string;
        const extract = await db.updateExtract(id, {
            content: args.content as string | undefined,
            notes: args.note as string | undefined,
            tags: args.tags as string[] | undefined,
            category: args.category as string | undefined,
            highlight_color: args.color as string | undefined,
        });
        return toCamelCase(extract);
    },

    delete_extract: async (args) => {
        const id = args.id as string;
        await db.deleteExtract(id);
        return null;
    },

    // Learning item commands
    get_learning_items: async (args) => {
        const documentId = args.documentId as string;
        const items = await db.getLearningItemsByDocument(documentId);
        return toCamelCase(items);
    },

    get_learning_item: async (args) => {
        const itemId = args.itemId as string;
        const item = await db.getLearningItem(itemId);
        return item ? toCamelCase(item) : null;
    },

    create_learning_item: async (args) => {
        const item = await db.createLearningItem({
            extract_id: args.extractId as string | undefined,
            document_id: args.documentId as string | undefined,
            item_type: args.itemType as string,
            question: args.question as string,
            answer: args.answer as string | undefined,
            cloze_text: args.clozeText as string | undefined,
        });
        return toCamelCase(item);
    },

    update_learning_item: async (args) => {
        const id = args.id as string;
        const item = await db.updateLearningItem(id, args as Partial<db.LearningItem>);
        return toCamelCase(item);
    },

    delete_learning_item: async (args) => {
        const id = args.id as string;
        await db.deleteLearningItem(id);
        return null;
    },

    // Queue/Review commands
    get_queue: async () => {
        // Return a flat array of queue items matching Rust format
        const dueExtracts = await db.getDueExtracts();
        const dueLearningItems = await db.getDueLearningItems();

        // Convert to queue item format expected by the frontend
        const items: unknown[] = [];

        for (const ext of dueExtracts) {
            const doc = await db.getDocument(ext.document_id);
            items.push({
                id: ext.id,
                document_id: ext.document_id,
                document_title: doc?.title || 'Unknown',
                extract_id: ext.id,
                item_type: 'extract',
                priority: 50,
                due_date: ext.next_review_date,
                estimated_time: 5,
                tags: ext.tags || [],
                category: ext.category,
                progress: 0,
            });
        }

        for (const item of dueLearningItems) {
            const doc = item.document_id ? await db.getDocument(item.document_id) : null;
            items.push({
                id: item.id,
                document_id: item.document_id || '',
                document_title: doc?.title || 'Unknown',
                extract_id: item.extract_id,
                learning_item_id: item.id,
                item_type: 'learning-item',
                priority: 50,
                due_date: item.due_date,
                estimated_time: 2,
                tags: item.tags || [],
                category: undefined,
                progress: 0,
            });
        }

        // Note: snake_case for queue items as expected by API
        return items;
    },

    get_queue_stats: async () => {
        const dueExtracts = await db.getDueExtracts();
        const dueLearningItems = await db.getDueLearningItems();
        return {
            total_items: dueExtracts.length + dueLearningItems.length,
            due_today: dueExtracts.length + dueLearningItems.length,
            overdue: 0,
            new_items: 0,
            learning_items: dueLearningItems.length,
            review_items: dueExtracts.length,
            total_estimated_time: (dueExtracts.length * 5) + (dueLearningItems.length * 2),
            suspended: 0,
        };
    },

    get_due_items: async () => {
        const items = await db.getDueLearningItems();
        return toCamelCase(items);
    },

    // Analytics commands
    get_activity_data: async () => {
        // Return empty for now - analytics can be computed client-side
        return [];
    },

    get_dashboard_stats: async () => {
        const docs = await db.getDocuments();
        const dueItems = await db.getDueLearningItems();
        return toCamelCase({
            total_documents: docs.length,
            total_due_items: dueItems.length,
        });
    },

    get_category_stats: async () => {
        return [];
    },

    get_memory_stats: async () => {
        return {};
    },

    // AI commands (passthrough - will use client-side API calls)
    get_ai_config: async () => {
        const config = await db.getSyncState('ai_config');
        return config || null;
    },

    set_ai_config: async (args) => {
        await db.setSyncState('ai_config', args.config);
        return args.config;
    },

    // Settings
    get_settings: async () => {
        const settings = await db.getSyncState('settings');
        return settings || {};
    },

    set_settings: async (args) => {
        await db.setSyncState('settings', args.settings);
        return args.settings;
    },

    // Migration status (always migrated in browser)
    get_migration_status: async () => {
        return { is_migrated: true, in_progress: false };
    },

    // Fetch URL content (for ArXiv, etc.) - will need CORS proxy
    fetch_url_content: async (args) => {
        const url = args.url as string;
        // In browser, this needs a CORS proxy - return placeholder for now
        console.warn('[Browser] fetch_url_content needs CORS proxy for:', url);
        throw new Error('URL fetching requires a CORS proxy in browser mode');
    },

    import_youtube_video: async (args) => {
        const url = args.url as string;
        // Create a document with the YouTube URL
        const doc = await db.createDocument({
            title: `YouTube: ${url}`,
            file_path: url,
            file_type: 'youtube',
        });
        return toCamelCase(doc);
    },

    // Anki Import (browser implementation using jszip and sql.js)
    import_anki_package_to_learning_items: async (args) => {
        const filePath = args.apkgPath as string;

        // Get the file from the browser file store
        const file = getBrowserFile(filePath);
        if (!file) {
            throw new Error('File not found. Please select the file again.');
        }

        return await importAnkiPackage(file);
    },

    import_anki_package_bytes_to_learning_items: async (args) => {
        const apkgBytes = args.apkgBytes as number[];
        const uint8Array = new Uint8Array(apkgBytes);

        return await importAnkiPackage(uint8Array);
    },

    // RSS feed fetch with CORS proxy support
    fetch_rss_feed_url: async (args) => {
        const feedUrl = args.feedUrl as string;

        // List of CORS proxies to try
        const corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];

        let lastError: Error | null = null;

        // Try direct fetch first (might work for CORS-enabled feeds)
        try {
            console.log('[Browser] Trying direct fetch for:', feedUrl);
            const response = await fetch(feedUrl);
            if (response.ok) {
                const xmlText = await response.text();
                return await parseAndReturnFeed(xmlText, feedUrl);
            }
        } catch (directError) {
            console.log('[Browser] Direct fetch failed, trying CORS proxies:', directError);
            lastError = directError as Error;
        }

        // Try each CORS proxy
        for (const proxy of corsProxies) {
            try {
                console.log('[Browser] Trying CORS proxy:', proxy);
                const proxyUrl = proxy + encodeURIComponent(feedUrl);
                const response = await fetch(proxyUrl);

                if (response.ok) {
                    const xmlText = await response.text();
                    console.log('[Browser] Successfully fetched feed via proxy:', proxy);
                    return await parseAndReturnFeed(xmlText, feedUrl);
                } else {
                    console.log('[Browser] Proxy returned status:', response.status);
                }
            } catch (proxyError) {
                console.log('[Browser] Proxy failed:', proxy, proxyError);
                lastError = proxyError as Error;
            }
        }

        throw new Error(`Failed to fetch feed after trying all methods. Last error: ${lastError?.message || 'Unknown error'}`);
    },
};

/**
 * Helper function to parse and return feed
 */
async function parseAndReturnFeed(xmlText: string, feedUrl: string) {
    const { parseFeed } = await import('../api/rss');
    const feed = await parseFeed(xmlText, feedUrl);

    if (!feed) {
        throw new Error('Failed to parse feed');
    }

    // Convert to backend format (snake_case)
    return {
        id: feed.id,
        title: feed.title,
        description: feed.description,
        link: feed.link,
        feed_url: feed.feedUrl,
        image_url: feed.imageUrl || feed.icon,
        language: feed.language,
        category: feed.category,
        items: feed.items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            content: item.content,
            link: item.link,
            pub_date: item.pubDate,
            author: item.author,
            categories: item.categories,
            guid: item.guid,
        }))
    };
}

/**
 * Import an Anki package (shared helper)
 */
async function importAnkiPackage(fileOrBytes: File | Uint8Array) {
    // Parse the .apkg file
    const decks = await parseAnkiPackage(fileOrBytes);

    // Convert to Incrementum format
    const { documents, learningItems } = convertAnkiToLearningItems(decks);

    // Store documents
    const docIds: string[] = [];
    for (const doc of documents) {
        const createdDoc = await db.createDocument({
            title: doc.title,
            content: doc.content,
            file_path: `anki://${doc.title}`,
            file_type: doc.fileType,
        });
        docIds.push(createdDoc.id);

        // Add tags and category to document (stored in metadata)
        await db.updateDocument(createdDoc.id, {
            category: doc.category,
        });
    }

    // Create learning items
    const items = [];
    for (const item of learningItems) {
        const createdItem = await db.createLearningItem({
            document_id: item.documentId,
            item_type: item.itemType,
            question: item.question,
            answer: item.answer,
        });

        items.push(toCamelCase(createdItem));
    }

    return items;
}

/**
 * Execute a browser command
 */
export async function browserInvoke<T>(
    command: string,
    args?: Record<string, unknown>
): Promise<T> {
    const handler = commandHandlers[command];

    if (handler) {
        try {
            const result = await handler(args || {});
            return result as T;
        } catch (error) {
            console.error(`[Browser] Command "${command}" failed:`, error);
            throw error;
        }
    }

    // For unknown commands, return appropriate defaults
    console.warn(`[Browser] Unknown command "${command}", returning default`);

    if (command.startsWith('get_')) {
        return (command.includes('list') || command.endsWith('s') ? [] : null) as T;
    }

    return undefined as T;
}
