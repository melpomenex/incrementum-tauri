/**
 * Browser backend command handlers
 * Maps Tauri command names to IndexedDB operations
 */

import * as db from './database.js';
import { getBrowserFile } from './browser-file-store';
import { parseAnkiPackage, convertAnkiToLearningItems } from '../utils/ankiParserBrowser';
import {
    getDemoContentStatus,
    importDemoContentManually,
    checkAndImportDemoContent as checkAndImportDemoContentInternal,
} from '../lib/demoContent';

type CommandHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Helper to convert snake_case DB objects to camelCase frontend objects
function toCamelCase(obj: any): any {
    if (obj === undefined || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (typeof obj === 'object' && obj !== null) {
        // Handle both plain objects and IndexedDB result objects
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

    update_document_progress: async (args) => {
        const id = args.id as string;
        const updates: Partial<db.Document> = {
            current_page: args.current_page as number | null | undefined,
            current_scroll_percent: args.current_scroll_percent as number | null | undefined,
            current_cfi: args.current_cfi as string | null | undefined,
            sync_version: Date.now(),
        };
        const cleaned: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                cleaned[key] = value === null ? undefined : value;
            }
        });
        const doc = await db.updateDocument(id, cleaned);
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
        const docs = await db.getDocuments();
        const dueExtracts = await db.getDueExtracts();
        const dueLearningItems = await db.getDueLearningItems();

        // Convert to queue item format expected by the frontend
        const items: unknown[] = [];

        for (const doc of docs) {
            items.push({
                id: doc.id,
                document_id: doc.id,
                document_title: doc.title || 'Untitled',
                item_type: 'document',
                priority_rating: doc.priority_rating,
                priority_slider: doc.priority_slider,
                priority: doc.priority_score ?? 50,
                due_date: doc.next_reading_date,
                estimated_time: 10,
                tags: doc.tags || [],
                category: doc.category,
                progress: doc.current_scroll_percent ?? 0,
            });
        }

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

    get_due_documents_only: async () => {
        const docs = await db.getDocuments();
        const now = new Date().toISOString();
        const dueDocs = docs.filter((doc) => !doc.next_reading_date || doc.next_reading_date <= now);
        return dueDocs.map((doc) => ({
            id: doc.id,
            document_id: doc.id,
            document_title: doc.title || 'Untitled',
            item_type: 'document',
            priority_rating: doc.priority_rating,
            priority_slider: doc.priority_slider,
            priority: doc.priority_score ?? 50,
            due_date: doc.next_reading_date,
            estimated_time: 10,
            tags: doc.tags || [],
            category: doc.category,
            progress: doc.current_scroll_percent ?? 0,
        }));
    },

    get_due_queue_items: async () => {
        const docs = await db.getDocuments();
        const now = new Date().toISOString();
        const dueDocs = docs.filter((doc) => !doc.next_reading_date || doc.next_reading_date <= now);
        const dueExtracts = await db.getDueExtracts();
        const dueLearningItems = await db.getDueLearningItems();

        const items: unknown[] = [];

        for (const doc of dueDocs) {
            items.push({
                id: doc.id,
                document_id: doc.id,
                document_title: doc.title || 'Untitled',
                item_type: 'document',
                priority_rating: doc.priority_rating,
                priority_slider: doc.priority_slider,
                priority: doc.priority_score ?? 50,
                due_date: doc.next_reading_date,
                estimated_time: 10,
                tags: doc.tags || [],
                category: doc.category,
                progress: doc.current_scroll_percent ?? 0,
            });
        }

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

        return items;
    },

    get_queue_stats: async () => {
        const docs = await db.getDocuments();
        const now = new Date().toISOString();
        const dueDocs = docs.filter((doc) => !doc.next_reading_date || doc.next_reading_date <= now);
        const dueExtracts = await db.getDueExtracts();
        const dueLearningItems = await db.getDueLearningItems();
        return {
            total_items: docs.length + dueExtracts.length + dueLearningItems.length,
            due_today: dueDocs.length + dueExtracts.length + dueLearningItems.length,
            overdue: 0,
            new_items: 0,
            learning_items: dueLearningItems.length,
            review_items: dueExtracts.length,
            total_estimated_time: (dueDocs.length * 10) + (dueExtracts.length * 5) + (dueLearningItems.length * 2),
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

        console.log('[Browser] Starting Anki import, byte array length:', apkgBytes.length);
        try {
            const result = await importAnkiPackage(uint8Array);
            console.log('[Browser] Anki import successful, result type:', Array.isArray(result) ? 'array' : typeof result, 'length:', Array.isArray(result) ? result.length : 'N/A');

            // Verify result is serializable before returning
            let serialized: string;
            try {
                serialized = JSON.stringify(result);
            } catch (e) {
                console.error('[Browser] Result is not JSON serializable:', e);
                throw new Error('Import result is not serializable');
            }

            // Parse back to ensure clean plain objects
            try {
                return JSON.parse(serialized);
            } catch (e) {
                console.error('[Browser] Failed to parse serialized result:', e, 'serialized:', serialized.substring(0, 200));
                throw new Error('Failed to parse import result');
            }
        } catch (error) {
            console.error('[Browser] Anki import error:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
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

    // Anna's Archive search - not available in browser mode due to CORS
    search_books: async () => {
        console.warn('[Browser] Anna\'s Archive search is not available in browser mode due to CORS restrictions.');
        return [];
    },

    download_book: async () => {
        throw new Error('Book download is not available in browser mode');
    },

    // Demo content commands
    get_demo_content_status: async () => {
        return await getDemoContentStatus();
    },

    import_demo_content_manually: async () => {
        return await importDemoContentManually();
    },

    get_available_mirrors: async () => {
        return [];
    },

    // LLM commands
    llm_get_models: async (args) => {
        const provider = args.provider as string;
        const apiKey = args.apiKey as string | undefined;
        const baseUrl = args.baseUrl as string | undefined;

        // Default models for each provider
        const defaultModels: Record<string, string[]> = {
            openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
            ollama: ['llama3.2', 'mistral', 'codellama', 'phi3'],
            openrouter: [
                'anthropic/claude-3.5-sonnet',
                'anthropic/claude-3.5-sonnet:beta',
                'anthropic/claude-3.5-haiku',
                'anthropic/claude-3-opus',
                'openai/gpt-4o',
                'openai/gpt-4o-mini',
                'openai/gpt-4-turbo',
                'google/gemini-pro-1.5',
                'meta-llama/llama-3.1-405b-instruct',
                'deepseek/deepseek-chat',
            ],
        };

        // For OpenRouter, try to fetch models from API if API key is provided
        if (provider === 'openrouter' && apiKey && apiKey.trim()) {
            try {
                const url = baseUrl || 'https://openrouter.ai/api/v1';
                const response = await fetch(`${url}/models`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://incrementum.app',
                        'X-Title': 'Incrementum',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.data && Array.isArray(data.data)) {
                        const models = data.data.map((m: { id: string }) => m.id).sort();
                        return models;
                    }
                }
            } catch (error) {
                console.warn('[Browser] Failed to fetch OpenRouter models, using defaults:', error);
            }
        }

        return defaultModels[provider] || [];
    },

    // MCP commands
    mcp_get_incrementum_tools: async () => {
        // Return the same tool definitions as the Rust backend
        return [
            {
                name: 'create_document',
                description: 'Create a new document in Incrementum',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Document title' },
                        content: { type: 'string', description: 'Document content' },
                        file_path: { type: 'string', description: 'File path' },
                        file_type: { type: 'string', description: 'File type (pdf, epub, md, etc.)' },
                    },
                    required: ['title'],
                },
            },
            {
                name: 'get_document',
                description: 'Retrieve details of a specific document',
                inputSchema: {
                    type: 'object',
                    properties: {
                        document_id: { type: 'string', description: 'Document ID' },
                    },
                    required: ['document_id'],
                },
            },
            {
                name: 'search_documents',
                description: 'Search documents by content or metadata',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        limit: { type: 'number', description: 'Maximum results' },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'create_cloze_card',
                description: 'Create a cloze deletion flashcard',
                inputSchema: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text with cloze deletions' },
                        document_id: { type: 'string', description: 'Associated document ID' },
                    },
                    required: ['text'],
                },
            },
            {
                name: 'create_qa_card',
                description: 'Create a question-answer flashcard',
                inputSchema: {
                    type: 'object',
                    properties: {
                        question: { type: 'string' },
                        answer: { type: 'string' },
                        document_id: { type: 'string' },
                    },
                    required: ['question', 'answer'],
                },
            },
            {
                name: 'create_extract',
                description: 'Create an extract or note from content',
                inputSchema: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'Extract content' },
                        document_id: { type: 'string', description: 'Source document ID' },
                        note: { type: 'string', description: 'Additional notes' },
                        tags: { type: 'array', items: { type: 'string' } },
                        color: { type: 'string', description: 'Highlight color' },
                    },
                    required: ['content', 'document_id'],
                },
            },
            {
                name: 'get_learning_items',
                description: 'Get learning items for a document',
                inputSchema: {
                    type: 'object',
                    properties: {
                        document_id: { type: 'string' },
                        item_type: { type: 'string', enum: ['flashcard', 'cloze', 'qa', 'basic'] },
                    },
                    required: ['document_id'],
                },
            },
            {
                name: 'get_document_extracts',
                description: 'Get all extracts for a document',
                inputSchema: {
                    type: 'object',
                    properties: {
                        document_id: { type: 'string' },
                    },
                    required: ['document_id'],
                },
            },
            {
                name: 'get_review_queue',
                description: 'Get items due for review',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Maximum items' },
                    },
                },
            },
        ];
    },

    mcp_call_incrementum_tool: async (args) => {
        const toolName = args.toolName as string;
        const toolArgs = args.arguments as Record<string, unknown>;

        // In browser mode, we can implement some of the tools using IndexedDB
        switch (toolName) {
            case 'create_document': {
                const doc = await db.createDocument({
                    title: toolArgs.title as string,
                    content: toolArgs.content as string | undefined,
                    file_path: toolArgs.file_path as string | undefined,
                    file_type: toolArgs.file_type as string | undefined,
                });
                return {
                    content: [{ type: 'text', text: `Created document: ${doc.id}` }],
                    isError: false,
                };
            }
            case 'get_document': {
                const doc = await db.getDocument(toolArgs.document_id as string);
                if (doc) {
                    return {
                        content: [{ type: 'text', text: JSON.stringify(toCamelCase(doc)) }],
                        isError: false,
                    };
                }
                return {
                    content: [{ type: 'text', text: 'Document not found' }],
                    isError: true,
                };
            }
            case 'search_documents': {
                const docs = await db.getDocuments();
                const query = (toolArgs.query as string).toLowerCase();
                const limit = (toolArgs.limit as number) || 10;
                const filtered = docs
                    .filter(d => d.title.toLowerCase().includes(query) || d.content?.toLowerCase().includes(query))
                    .slice(0, limit);
                return {
                    content: [{ type: 'text', text: JSON.stringify(filtered.map(d => toCamelCase(d))) }],
                    isError: false,
                };
            }
            case 'create_qa_card': {
                const item = await db.createLearningItem({
                    document_id: toolArgs.document_id as string,
                    item_type: 'qa',
                    question: toolArgs.question as string,
                    answer: toolArgs.answer as string,
                });
                return {
                    content: [{ type: 'text', text: `Created Q&A card: ${item.id}` }],
                    isError: false,
                };
            }
            case 'create_cloze_card': {
                const item = await db.createLearningItem({
                    document_id: toolArgs.document_id as string,
                    item_type: 'cloze',
                    question: toolArgs.text as string,
                    answer: toolArgs.text as string,
                });
                return {
                    content: [{ type: 'text', text: `Created cloze card: ${item.id}` }],
                    isError: false,
                };
            }
            case 'create_extract': {
                const extract = await db.createExtract({
                    document_id: toolArgs.document_id as string,
                    content: toolArgs.content as string,
                    notes: toolArgs.note as string | undefined,
                });
                return {
                    content: [{ type: 'text', text: `Created extract: ${extract.id}` }],
                    isError: false,
                };
            }
            default:
                return {
                    content: [{ type: 'text', text: `Tool '${toolName}' is not available in browser mode` }],
                    isError: true,
                };
        }
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

        // Convert to camelCase and return as plain object
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
