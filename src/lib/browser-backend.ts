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
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { useSettingsStore } from '../stores/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { getPositionProgress } from '../types/position';
import {
    fetchYouTubeTranscript,
    checkTranscriptAvailable,
    getAvailableLanguages,
} from '../utils/youtubeTranscriptBrowser';
import {
    fetchPlaylistInfo,
    importPlaylistVideos,
    isYouTubeApiEnabled,
    extractPlaylistId,
} from './youtubeDataApi';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

type CommandHandler = (args: Record<string, unknown>) => Promise<unknown>;

/**
 * Extract text content from an EPUB file
 */
async function extractEpubText(data: ArrayBuffer): Promise<string> {
    try {
        const book = ePub(data);
        await book.ready;

        const spine = book.spine as any;
        const textParts: string[] = [];

        // Get all spine items (chapters)
        const spineItems = spine.items || spine.spineItems || [];

        for (let i = 0; i < spineItems.length; i++) {
            const item = spineItems[i];
            try {
                // Load the chapter content
                const doc = await book.load(item.href);
                if (doc) {
                    // Extract text from the document
                    const container = document.createElement('div');
                    if (typeof doc === 'string') {
                        container.innerHTML = doc;
                    } else if (doc instanceof Document) {
                        container.innerHTML = doc.body?.innerHTML || '';
                    }

                    // Get text content, preserving some structure
                    const text = container.innerText || container.textContent || '';
                    const cleanedText = text
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleanedText && cleanedText.length > 50) {
                        textParts.push(`[Chapter ${i + 1}]\n${cleanedText}`);
                    }
                }
            } catch (chapterError) {
                console.warn(`[Browser] Failed to extract text from EPUB chapter ${i + 1}:`, chapterError);
            }
        }

        book.destroy();
        return textParts.join('\n\n');
    } catch (error) {
        console.warn('[Browser] EPUB text extraction failed:', error);
        return '';
    }
}

/**
 * Extract text content from a PDF file
 */
async function extractPdfText(data: ArrayBuffer): Promise<string> {
    try {
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const textParts: string[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => ('str' in item ? item.str : ''))
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (pageText) {
                    textParts.push(`[Page ${pageNum}]\n${pageText}`);
                }
            } catch (pageError) {
                console.warn(`[Browser] Failed to extract text from page ${pageNum}:`, pageError);
            }
        }

        return textParts.join('\n\n');
    } catch (error) {
        console.warn('[Browser] PDF text extraction failed:', error);
        return '';
    }
}

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
 * Get DocumentPosition from a document object
 * Tries positionJson first, then falls back to legacy position fields
 */
function getPositionFromDocument(doc: db.Document): DocumentPosition | null {
    if (!doc) return null;
    
    // Try position_json first (new unified storage)
    if (doc.position_json) {
        try {
            return JSON.parse(doc.position_json) as DocumentPosition;
        } catch (error) {
            console.warn('[Browser] Failed to parse position_json:', error);
        }
    }
    
    // Fall back to legacy position fields
    if (doc.current_page && doc.current_page > 1) {
        return { type: 'page', page: doc.current_page };
    }
    
    if (doc.current_scroll_percent && doc.current_scroll_percent > 0) {
        return { type: 'scroll', percent: doc.current_scroll_percent };
    }
    
    if (doc.current_cfi) {
        return { type: 'cfi', cfi: doc.current_cfi };
    }
    
    return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getFsrsParameters() {
    const settings = useSettingsStore.getState().settings;
    const fsrsParams = settings.learning?.fsrsParams;
    return {
        request_retention: fsrsParams?.desiredRetention ?? 0.9,
        maximum_interval: fsrsParams?.maximumInterval ?? 36500,
        enable_fuzz: false,
    };
}

function createFsrsScheduler() {
    return fsrs(getFsrsParameters());
}

function toFsrsGrade(rating: number): Grade {
    switch (rating) {
        case 1:
            return Rating.Again;
        case 2:
            return Rating.Hard;
        case 3:
            return Rating.Good;
        case 4:
            return Rating.Easy;
        default:
            return Rating.Good;
    }
}

function normalizeState(state?: string): State {
    switch ((state || '').toLowerCase()) {
        case 'learning':
            return State.Learning;
        case 'review':
            return State.Review;
        case 'relearning':
            return State.Relearning;
        default:
            return State.New;
    }
}

function stateToString(state: State): string {
    switch (state) {
        case State.Learning:
            return 'learning';
        case State.Review:
            return 'review';
        case State.Relearning:
            return 'relearning';
        default:
            return 'new';
    }
}

function intervalFromDue(now: Date, due: Date, scheduledDays?: number): number {
    const delta = (due.getTime() - now.getTime()) / DAY_MS;
    if (!Number.isFinite(delta)) {
        return scheduledDays ?? 0;
    }
    return Math.max(0, delta);
}

function buildCardFromDocument(doc: db.Document, now: Date): Card {
    const card = createEmptyCard(now);
    card.due = doc.next_reading_date ? new Date(doc.next_reading_date) : now;
    card.last_review = doc.date_last_reviewed ? new Date(doc.date_last_reviewed) : undefined;
    card.stability = doc.stability ?? 0;
    card.difficulty = doc.difficulty ?? 0;
    card.scheduled_days = doc.stability ?? 0;
    card.reps = doc.reps ?? 0;
    card.lapses = 0;
    card.learning_steps = 0;
    card.state = (doc.reps ?? 0) > 0 || doc.date_last_reviewed ? State.Review : State.New;
    return card;
}

function buildCardFromExtract(extract: db.Extract, now: Date): Card {
    const card = createEmptyCard(now);
    card.due = extract.next_review_date ? new Date(extract.next_review_date) : now;
    card.last_review = extract.last_review_date ? new Date(extract.last_review_date) : undefined;
    card.stability = extract.memory_state?.stability ?? 0;
    card.difficulty = extract.memory_state?.difficulty ?? 0;
    card.scheduled_days = extract.memory_state?.stability ?? 0;
    card.reps = extract.reps ?? extract.review_count ?? 0;
    card.lapses = 0;
    card.learning_steps = 0;
    card.state = (extract.reps ?? extract.review_count ?? 0) > 0 ? State.Review : State.New;
    return card;
}

function buildCardFromLearningItem(item: db.LearningItem, now: Date): Card {
    const card = createEmptyCard(now);
    card.due = item.due_date ? new Date(item.due_date) : now;
    card.last_review = item.last_review_date ? new Date(item.last_review_date) : undefined;
    card.stability = item.memory_state?.stability ?? 0;
    card.difficulty = item.memory_state?.difficulty ?? 0;
    card.scheduled_days = item.interval ?? 0;
    card.reps = item.review_count ?? 0;
    card.lapses = item.lapses ?? 0;
    card.learning_steps = 0;
    card.state = normalizeState(item.state);
    return card;
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
        const currentPage = args.current_page as number | null | undefined;
        const scrollPercent = args.current_scroll_percent as number | null | undefined;
        const currentCfi = args.current_cfi as string | null | undefined;
        const currentViewState = args.current_view_state as string | null | undefined;

        const updates: Partial<db.Document> = {
            current_page: currentPage,
            current_scroll_percent: scrollPercent,
            current_cfi: currentCfi,
            sync_version: Date.now(),
        };

        // Also update position_json to keep unified position in sync
        // Try to get existing position first
        const existingDoc = await db.getDocument(id);
        let position: DocumentPosition | null = null;

        if (existingDoc?.position_json) {
            try {
                position = JSON.parse(existingDoc.position_json);
            } catch {
                position = null;
            }
        }

        // Create new unified position based on what's being updated
        if (currentPage !== undefined && currentPage !== null) {
            position = { type: 'page', page: currentPage };
        } else if (scrollPercent !== undefined && scrollPercent !== null) {
            position = { type: 'scroll', percent: scrollPercent };
        } else if (currentCfi !== undefined && currentCfi !== null) {
            position = { type: 'cfi', cfi: currentCfi };
        }

        if (position) {
            let progress = getPositionProgress(position);

            // For page-based positions, calculate progress if we have total pages
            if (progress === null && position.type === 'page' && existingDoc?.total_pages) {
                progress = ((position.page - 1) / existingDoc.total_pages) * 100;
            }

            updates.position_json = JSON.stringify(position);
            updates.progress_percent = progress ?? existingDoc?.progress_percent ?? 0;
        }

        const cleaned: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                cleaned[key] = value === null ? undefined : value;
            }
        });
        const doc = await db.updateDocument(id, cleaned);
        return toCamelCase(doc);
    },

    get_document_position: async (args) => {
        const id = (args.document_id ?? args.documentId) as string;
        if (!id) return null;
        const doc = await db.getDocument(id);
        if (!doc?.position_json) return null;
        try {
            return JSON.parse(doc.position_json) as unknown;
        } catch (error) {
            console.warn('[Browser] Failed to parse position_json for document', id, error);
            return null;
        }
    },

    save_document_position: async (args) => {
        const id = (args.document_id ?? args.documentId) as string;
        const position = args.position as unknown;
        if (!id || !position) return null;
        const progress = getPositionProgress(position as any);
        await db.updateDocument(id, {
            position_json: JSON.stringify(position),
            progress_percent: progress ?? 0,
        });
        return null;
    },

    update_document_content: async (args) => {
        const id = args.id as string;
        const content = args.content as string;
        const doc = await db.updateDocument(id, { content });
        return toCamelCase(doc);
    },

    // Extract text from existing document (for documents imported before text extraction was added)
    extract_document_text: async (args) => {
        const id = args.id as string;
        const doc = await db.getDocument(id);
        if (!doc) {
            throw new Error(`Document ${id} not found`);
        }

        // If document already has content, return it
        if (doc.content && doc.content.length > 0) {
            return { content: doc.content, extracted: false };
        }

        // Try to get the file and extract text
        const filePath = doc.file_path;
        const fileType = doc.file_type?.toLowerCase() || '';

        // Handle browser-file:// and browser-fetched:// paths
        if ((fileType === 'pdf' || fileType === 'epub' || fileType === 'html') &&
            (filePath.startsWith('browser-file://') || filePath.startsWith('browser-fetched://'))) {
            // Try to get from in-memory store first, then from IndexedDB
            const browserFile = getBrowserFile(filePath);
            let arrayBuffer: ArrayBuffer | null = null;

            if (browserFile) {
                arrayBuffer = await browserFile.arrayBuffer();
            } else {
                // Try to get from IndexedDB file store by path
                let storedFile = await db.getFile(filePath);

                // If not found by path, try by filename (for files stored before path-based storage)
                if (!storedFile) {
                    const filename = filePath.split('/').pop() || '';
                    storedFile = await db.getFileByName(filename);
                }

                if (storedFile && storedFile.blob) {
                    arrayBuffer = await storedFile.blob.arrayBuffer();
                }
            }

            if (arrayBuffer) {
                let extractedContent = '';

                if (fileType === 'html') {
                    // Extract text from HTML
                    try {
                        const text = new TextDecoder().decode(arrayBuffer);
                        // Create a temporary DOM element to parse HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');

                        // Remove script and style elements
                        doc.querySelectorAll('script, style').forEach(el => el.remove());

                        // Get text content and clean it up
                        extractedContent = doc.body.textContent || doc.body.innerText || '';
                        extractedContent = extractedContent
                            .replace(/\s+/g, ' ')
                            .replace(/\n\s*\n/g, '\n\n')
                            .trim();

                        if (extractedContent.length > 50000) {
                            // Truncate very long content
                            extractedContent = extractedContent.substring(0, 50000) + '\n\n... (content truncated)';
                        }
                    } catch (error) {
                        console.warn('[Browser] Failed to extract HTML text:', error);
                    }
                } else if (fileType === 'epub') {
                    extractedContent = await extractEpubText(arrayBuffer);
                } else if (fileType === 'pdf') {
                    extractedContent = await extractPdfText(arrayBuffer);
                }

                if (extractedContent) {
                    await db.updateDocument(id, { content: extractedContent });
                    return { content: extractedContent, extracted: true };
                }
            }
        }

        return { content: '', extracted: false };
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
        let extractedContent = '';

        // Check if this is a virtual browser file path
        if (filePath.startsWith('browser-file://')) {
            const file = getBrowserFile(filePath);
            if (file) {
                // Store the file blob in IndexedDB with the filePath as key
                await db.storeFile(file, filePath);

                // Extract text content from PDFs and EPUBs
                if (fileType === 'pdf' || fileType === 'epub') {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        extractedContent = fileType === 'epub'
                            ? await extractEpubText(arrayBuffer)
                            : await extractPdfText(arrayBuffer);
                        console.log(`[Browser] Extracted ${extractedContent.length} characters from ${fileType.toUpperCase()}`);
                    } catch (error) {
                        console.warn(`[Browser] Failed to extract ${fileType.toUpperCase()} text:`, error);
                    }
                }
            } else {
                console.warn('[Browser] File not found in browser store:', filePath);
            }
        }

        const doc = await db.createDocument({
            title: fileName.replace(/\.[^/.]+$/, ''),
            file_path: filePath,
            file_type: fileType,
            content: extractedContent || undefined,
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

            // If not in memory (page refresh), try IndexedDB by path first, then by filename
            let storedFile = await db.getFile(filePath);

            // If not found by path, try by filename (for files stored before path-based storage)
            if (!storedFile) {
                const filename = filePath.split('/').pop() || '';
                storedFile = await db.getFileByName(filename);
            }

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
            html_content: args.htmlContent as string | undefined,
            source_url: args.sourceUrl as string | undefined,
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
            html_content: args.htmlContent as string | undefined,
            source_url: args.sourceUrl as string | undefined,
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
                document_file_type: doc.file_type,
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
                document_file_type: doc?.file_type,
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
                document_file_type: doc?.file_type,
                extract_id: item.extract_id,
                learning_item_id: item.id,
                question: item.question,
                answer: item.answer,
                cloze_text: item.cloze_text,
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
            document_file_type: doc.file_type,
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
                document_file_type: doc.file_type,
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
                document_file_type: doc?.file_type,
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
                document_file_type: doc?.file_type,
                extract_id: item.extract_id,
                learning_item_id: item.id,
                question: item.question,
                answer: item.answer,
                cloze_text: item.cloze_text,
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

    start_review: async () => {
        const dueItems = await db.getDueLearningItems();
        if (dueItems.length === 0) {
            return '';
        }
        return uuidv4();
    },

    submit_review: async (args) => {
        const itemId = (args.item_id as string) || (args.itemId as string);
        const rating = args.rating as number;
        const item = await db.getLearningItem(itemId);
        if (!item) {
            throw new Error(`Learning item ${itemId} not found`);
        }

        const now = new Date();
        const scheduler = createFsrsScheduler();
        const grade = toFsrsGrade(rating);
        const card = buildCardFromLearningItem(item, now);
        const next = scheduler.next(card, now, grade);
        const nextCard = next.card;
        const nextDue = nextCard.due;
        const intervalDays = intervalFromDue(now, nextDue, nextCard.scheduled_days);

        const updatedItem = await db.updateLearningItem(item.id, {
            due_date: nextDue.toISOString(),
            interval: intervalDays,
            last_review_date: now.toISOString(),
            review_count: nextCard.reps,
            lapses: nextCard.lapses,
            state: stateToString(nextCard.state),
            memory_state: {
                stability: nextCard.stability,
                difficulty: nextCard.difficulty,
            },
            difficulty: nextCard.difficulty,
        });

        return toCamelCase(updatedItem);
    },

    preview_review_intervals: async (args) => {
        const itemId = (args.item_id as string) || (args.itemId as string);
        const item = await db.getLearningItem(itemId);
        if (!item) {
            throw new Error(`Learning item ${itemId} not found`);
        }

        const now = new Date();
        const scheduler = createFsrsScheduler();
        const card = buildCardFromLearningItem(item, now);
        const preview = scheduler.repeat(card, now);

        const intervals = {
            again: intervalFromDue(now, preview[Rating.Again].card.due, preview[Rating.Again].card.scheduled_days),
            hard: intervalFromDue(now, preview[Rating.Hard].card.due, preview[Rating.Hard].card.scheduled_days),
            good: intervalFromDue(now, preview[Rating.Good].card.due, preview[Rating.Good].card.scheduled_days),
            easy: intervalFromDue(now, preview[Rating.Easy].card.due, preview[Rating.Easy].card.scheduled_days),
        };

        return intervals;
    },

    // Document/Extract rating commands (FSRS scheduling for browser)
    rate_document: async (args) => {
        const request = args.request as { document_id: string; rating: number; time_taken?: number };
        const doc = await db.getDocument(request.document_id);
        if (!doc) {
            throw new Error(`Document ${request.document_id} not found`);
        }

        const now = new Date();
        const scheduler = createFsrsScheduler();
        const grade = toFsrsGrade(request.rating);
        const card = buildCardFromDocument(doc, now);
        const next = scheduler.next(card, now, grade);
        const nextCard = next.card;
        const nextReviewDateIso = nextCard.due.toISOString();
        const intervalDays = intervalFromDue(now, nextCard.due, nextCard.scheduled_days);

        // Update document with new scheduling data
        const newTimeSpent = (doc.total_time_spent || 0) + (request.time_taken || 0);

        await db.updateDocument(request.document_id, {
            next_reading_date: nextReviewDateIso,
            stability: nextCard.stability,
            difficulty: nextCard.difficulty,
            reps: nextCard.reps,
            total_time_spent: newTimeSpent,
            date_last_reviewed: now.toISOString(),
        });

        return {
            next_review_date: nextReviewDateIso,
            stability: nextCard.stability,
            difficulty: nextCard.difficulty,
            interval_days: intervalDays,
            scheduling_reason: `FSRS: Rating ${request.rating} → ${intervalDays.toFixed(2)} days`,
        };
    },

    rate_extract: async (args) => {
        const request = args.request as { extract_id: string; rating: number; time_taken?: number };
        const extract = await db.getExtract(request.extract_id);
        if (!extract) {
            throw new Error(`Extract ${request.extract_id} not found`);
        }

        const now = new Date();
        const scheduler = createFsrsScheduler();
        const grade = toFsrsGrade(request.rating);
        const card = buildCardFromExtract(extract, now);
        const next = scheduler.next(card, now, grade);
        const nextCard = next.card;
        const nextReviewDateIso = nextCard.due.toISOString();
        const intervalDays = intervalFromDue(now, nextCard.due, nextCard.scheduled_days);

        // Update extract with new scheduling data
        await db.updateExtract(request.extract_id, {
            next_review_date: nextReviewDateIso,
            memory_state: { stability: nextCard.stability, difficulty: nextCard.difficulty },
            review_count: nextCard.reps,
            reps: nextCard.reps,
            last_review_date: now.toISOString(),
        });

        return {
            next_review_date: nextReviewDateIso,
            stability: nextCard.stability,
            difficulty: nextCard.difficulty,
            interval_days: intervalDays,
            scheduling_reason: `FSRS: Rating ${request.rating} → ${intervalDays.toFixed(2)} days`,
        };
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

    // Fetch URL content (for ArXiv, etc.) with CORS proxy support
    fetch_url_content: async (args) => {
        const url = args.url as string;

        // List of CORS proxies to try
        const corsProxies = [
            null, // Try direct fetch first (might work for CORS-enabled resources)
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];

        let lastError: Error | null = null;

        // Helper function to extract filename from URL
        const getFilenameFromUrl = (url: string): string => {
            try {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                const segments = pathname.split('/').filter(s => s);
                return segments[segments.length - 1] || 'download';
            } catch {
                return 'download';
            }
        };

        // Try direct fetch first (might work for CORS-enabled feeds)
        try {
            console.log('[Browser] Trying direct fetch for:', url);
            const response = await fetch(url);

            if (response.ok) {
                const contentType = response.headers.get('content-type') || 'application/octet-stream';
                const blob = await response.blob();

                // Generate unique ID and store in IndexedDB
                const fileId = `fetched-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const filename = getFilenameFromUrl(url);
                const file = new File([blob], filename, { type: contentType });

                await db.storeFile(file, `browser-fetched://${fileId}`);

                console.log('[Browser] Successfully fetched URL directly');

                return {
                    file_path: `browser-fetched://${fileId}`,
                    file_name: filename,
                    content_type: contentType
                };
            }
        } catch (directError) {
            console.log('[Browser] Direct fetch failed, trying CORS proxies:', directError);
            lastError = directError as Error;
        }

        // Try each CORS proxy
        for (const proxy of corsProxies) {
            if (!proxy) continue; // Skip null (already tried direct)

            try {
                console.log('[Browser] Trying CORS proxy:', proxy);
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl);

                if (response.ok) {
                    const contentType = response.headers.get('content-type') || 'application/octet-stream';
                    const blob = await response.blob();

                    // Generate unique ID and store in IndexedDB
                    const fileId = `fetched-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    const filename = getFilenameFromUrl(url);
                    const file = new File([blob], filename, { type: contentType });

                    await db.storeFile(file, `browser-fetched://${fileId}`);

                    console.log('[Browser] Successfully fetched feed via proxy:', proxy);

                    return {
                        file_path: `browser-fetched://${fileId}`,
                        file_name: filename,
                        content_type: contentType
                    };
                } else {
                    console.log('[Browser] Proxy returned status:', response.status);
                }
            } catch (proxyError) {
                console.log('[Browser] Proxy failed:', proxy, proxyError);
                lastError = proxyError as Error;
            }
        }

        throw new Error(`Failed to fetch URL after trying all methods. Last error: ${lastError?.message || 'Unknown error'}`);
    },

    import_youtube_video: async (args) => {
        const url = args.url as string;
        let title = `YouTube: ${url}`;
        const idMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        const videoId = idMatch ? idMatch[1] : null;

        if (videoId) {
            try {
                const noembedResponse = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                if (noembedResponse.ok) {
                    const data = await noembedResponse.json();
                    if (data?.title) {
                        title = data.title;
                    }
                }
            } catch (error) {
                console.warn('[Browser] Failed to fetch YouTube title:', error);
            }
        }

        // Create a document with the YouTube URL
        const doc = await db.createDocument({
            title,
            file_path: url,
            file_type: 'youtube',
        });
        return toCamelCase(doc);
    },

    get_youtube_transcript_by_id: async (args) => {
        const videoId = args.videoId as string;
        const language = args.language as string | undefined;

        if (!videoId) {
            console.warn('[Browser] No videoId provided for transcript fetch');
            return [];
        }

        try {
            console.log('[Browser] Fetching YouTube transcript for:', videoId);
            const result = await fetchYouTubeTranscript(videoId, language);
            console.log(`[Browser] Successfully fetched ${result.segments.length} transcript segments`);
            return result.segments;
        } catch (error) {
            console.warn('[Browser] Failed to fetch YouTube transcript:', error);
            // Re-throw specific errors so the UI can show appropriate messages
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('does not have captions') || 
                errorMsg.includes('age-restricted') ||
                errorMsg.includes('requires consent') ||
                errorMsg.includes('bot detection') ||
                errorMsg.includes('Sign in to confirm') ||
                errorMsg.includes('CORS') ||
                errorMsg.includes('local development')) {
                throw error;
            }
            // Return empty array for other errors to maintain compatibility
            return [];
        }
    },

    get_youtube_transcript: async (args) => {
        const url = args.url as string;
        const language = args.language as string | undefined;

        if (!url) {
            console.warn('[Browser] No URL provided for transcript fetch');
            return [];
        }

        try {
            console.log('[Browser] Fetching YouTube transcript for URL:', url);
            const result = await fetchYouTubeTranscript(url, language);
            console.log(`[Browser] Successfully fetched ${result.segments.length} transcript segments`);
            return result.segments;
        } catch (error) {
            console.warn('[Browser] Failed to fetch YouTube transcript:', error);
            return [];
        }
    },

    check_ytdlp: async () => {
        // In browser mode, we use the browser-based transcript fetching
        // which doesn't require yt-dlp, so we return true
        return true;
    },

    get_youtube_video_info: async (args) => {
        const url = args.url as string;

        if (!url) {
            throw new Error('No URL provided');
        }

        // Extract video ID
        const idMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/)
            || url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        const videoId = idMatch ? idMatch[1] : null;

        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Use noembed to get video info
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch video info');
        }

        const data = await response.json();

        return {
            id: videoId,
            title: data.title || 'Unknown',
            description: data.html || '',
            channel: data.author_name || 'Unknown',
            channel_id: '',
            duration: 0, // noembed doesn't provide duration
            view_count: 0,
            upload_date: '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            publish_date: '',
            tags: [],
            category: '',
            live_content: false,
        };
    },

    // YouTube Playlist commands (browser implementation using YouTube Data API)
    get_playlist_subscriptions: async () => {
        // In browser mode, we don't persist subscriptions - one-time imports only
        return [];
    },

    get_playlist_subscription: async (args) => {
        const subscriptionId = args.subscriptionId as string;
        // Return a mock subscription since we don't persist them in browser mode
        return {
            subscription: {
                id: subscriptionId,
                playlist_id: subscriptionId,
                playlist_url: `https://www.youtube.com/playlist?list=${subscriptionId}`,
                title: null,
                channel_name: null,
                channel_id: null,
                description: null,
                thumbnail_url: null,
                total_videos: null,
                is_active: false,
                auto_import_new: false,
                queue_intersperse_interval: 5,
                priority_rating: 5,
                last_refreshed_at: null,
                refresh_interval_hours: 24,
                created_at: new Date().toISOString(),
                modified_at: new Date().toISOString(),
            },
            videos: [],
        };
    },

    subscribe_to_playlist: async (args) => {
        const playlistUrl = args.playlistUrl as string;
        
        if (!isYouTubeApiEnabled()) {
            throw new Error('YouTube API key not configured. Please add your YouTube Data API key in Settings > Integrations to import playlists.');
        }

        const playlistId = extractPlaylistId(playlistUrl);
        if (!playlistId) {
            throw new Error('Invalid YouTube playlist URL');
        }

        // Fetch playlist info from YouTube Data API
        const playlistInfo = await fetchPlaylistInfo(playlistId);

        // Import all videos from the playlist
        const videosToImport = await importPlaylistVideos(playlistInfo, true);
        
        // Create documents for each video
        const importedDocs = [];
        for (const video of videosToImport) {
            try {
                const doc = await db.createDocument({
                    title: video.title,
                    file_path: video.url,
                    file_type: 'youtube',
                });
                importedDocs.push(doc);
            } catch (error) {
                console.warn(`[Browser] Failed to import video ${video.videoId}:`, error);
            }
        }

        return {
            id: playlistId,
            playlist_id: playlistId,
            playlist_url: playlistUrl,
            title: playlistInfo.title,
            channel_name: playlistInfo.channelTitle,
            channel_id: playlistInfo.channelId,
            description: playlistInfo.description,
            thumbnail_url: playlistInfo.thumbnail,
            total_videos: importedDocs.length,
            is_active: true,
            auto_import_new: false,
            queue_intersperse_interval: 5,
            priority_rating: 5,
            last_refreshed_at: new Date().toISOString(),
            refresh_interval_hours: 24,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
        };
    },

    update_playlist_subscription: async () => {
        // No-op in browser mode - subscriptions are not persisted
        return;
    },

    delete_playlist_subscription: async () => {
        // No-op in browser mode - subscriptions are not persisted
        return;
    },

    refresh_playlist: async (args) => {
        const subscriptionId = args.subscriptionId as string;
        
        if (!isYouTubeApiEnabled()) {
            throw new Error('YouTube API key not configured. Please add your YouTube Data API key in Settings > Integrations.');
        }

        // Fetch fresh playlist info
        const playlistInfo = await fetchPlaylistInfo(subscriptionId);

        return {
            new_videos_found: playlistInfo.videos.length,
            imported_count: 0, // Videos are imported on subscribe, not refresh
        };
    },

    import_playlist_video: async (args) => {
        const videoId = args.playlistVideoId as string;
        // In browser mode, this is handled during subscribe_to_playlist
        // Return a mock document
        throw new Error('Individual video import not supported in browser mode. Please import the entire playlist.');
    },

    get_unimported_playlist_videos: async () => {
        // Not applicable in browser mode
        return [];
    },

    get_playlist_settings: async () => {
        // Return default settings
        return {
            id: 'global',
            enabled: isYouTubeApiEnabled(),
            default_intersperse_interval: 5,
            default_priority: 5,
            max_consecutive_playlist_videos: 1,
            prefer_new_videos: true,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
        };
    },

    update_playlist_settings: async () => {
        // No-op in browser mode - settings are managed via useSettingsStore
        return;
    },

    get_playlist_queue_items: async () => {
        // Not applicable in browser mode
        return [];
    },

    mark_playlist_video_queued: async () => {
        // No-op in browser mode
        return;
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

    // Anna's Archive / LibGen search - using Library Genesis API
    search_books: async (args) => {
        const { searchLibGen } = await import('../api/libgen');
        const query = args.query as string;
        const limit = (args.limit as number) || 25;
        
        console.log('[Browser] Searching LibGen for:', query);
        
        try {
            const books = await searchLibGen({
                query,
                count: limit,
                sortBy: 'def',
                reverse: false,
            });
            
            // Convert to the expected format
            return books.map(book => ({
                id: book.md5 || book.id,
                title: book.title,
                author: book.author || null,
                year: book.year ? parseInt(book.year) : null,
                publisher: book.publisher || null,
                language: book.language || null,
                formats: [book.extension.toUpperCase()],
                cover_url: book.cover || null,
                description: book.description || null,
                isbn: book.isbn || null,
                md5: book.md5 || null,
                file_size: book.size || null,
            }));
        } catch (error) {
            console.error('[Browser] LibGen search failed:', error);
            throw error;
        }
    },

    download_book: async (args) => {
        const { getDownloadLink } = await import('../api/libgen');
        const bookId = args.bookId as string;
        const format = (args.format as string)?.toLowerCase() || 'pdf';
        
        console.log('[Browser] Getting download link for book:', bookId);
        
        try {
            // Get the download URL
            const downloadUrl = await getDownloadLink(bookId);
            
            // Open the download URL in a new tab
            // Note: Actual file download may require going through LibGen's download page
            window.open(downloadUrl, '_blank');
            
            return {
                file_path: downloadUrl,
                file_name: `${bookId}.${format}`,
                file_size: 0, // Size unknown until download starts
            };
        } catch (error) {
            console.error('[Browser] Book download failed:', error);
            throw error;
        }
    },

    // PDF to HTML conversion (not available in browser mode)
    convert_pdf_to_html: async (args) => {
        const filePath = args.file_path as string;
        throw new Error('PDF to HTML conversion requires the desktop app (Tauri). This feature is not available in web browser mode.');
    },

    convert_document_pdf_to_html: async (args) => {
        const id = args.id as string;
        throw new Error('PDF to HTML conversion requires the desktop app (Tauri). This feature is not available in web browser mode.');
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
    llm_chat: async (args) => {
        const provider = args.provider as string;
        const model = args.model as string | undefined;
        const messages = args.messages as Array<{ role: string; content: string }>;
        const temperature = (args.temperature as number) ?? 0.7;
        const maxTokens = (args.maxTokens as number) || 2000;
        const apiKey = args.apiKey as string | undefined;
        const baseUrl = args.baseUrl as string | undefined;

        if (!apiKey && provider !== 'ollama') {
            throw new Error('API key is required');
        }

        // In browser mode, we support OpenRouter and OpenAI-compatible APIs
        const providerConfig: Record<string, { url: string; defaultModel: string }> = {
            openrouter: { url: baseUrl || 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' },
            openai: { url: baseUrl || 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
            anthropic: { url: baseUrl || 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-20241022' },
        };

        const config = providerConfig[provider];
        if (!config) {
            throw new Error(`Provider '${provider}' is not supported in browser mode. Supported: openrouter, openai`);
        }

        const actualModel = model || config.defaultModel;

        // Handle Anthropic separately due to different API format
        if (provider === 'anthropic') {
            const response = await fetch(`${config.url}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey!,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: actualModel,
                    max_tokens: maxTokens,
                    temperature,
                    messages: messages.filter(m => m.role !== 'system').map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    system: messages.find(m => m.role === 'system')?.content,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return {
                content: data.content?.[0]?.text || '',
                usage: data.usage ? {
                    promptTokens: data.usage.input_tokens,
                    completionTokens: data.usage.output_tokens,
                    totalTokens: data.usage.input_tokens + data.usage.output_tokens,
                } : undefined,
            };
        }

        // OpenAI-compatible API (OpenAI, OpenRouter)
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };

        // Add OpenRouter-specific headers
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://incrementum.app';
            headers['X-Title'] = 'Incrementum';
        }

        const response = await fetch(`${config.url}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: actualModel,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                temperature,
                max_tokens: maxTokens,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${provider} API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            } : undefined,
        };
    },

    llm_chat_with_context: async (args) => {
        const provider = args.provider as string;
        const model = args.model as string | undefined;
        const messages = args.messages as Array<{ role: string; content: string }>;
        const context = args.context as { type: string; documentId?: string; content?: unknown; selection?: string; contextWindowTokens?: number };
        const apiKey = args.apiKey as string | undefined;
        const baseUrl = args.baseUrl as string | undefined;

        const decodeByteString = (value: string): string => {
            const bytes = value.split(",").map((part) => parseInt(part.trim(), 10));
            if (bytes.some((byte) => Number.isNaN(byte))) {
                return value;
            }
            try {
                return new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
            } catch {
                return value;
            }
        };

        const normalizeContextContent = (value: unknown): string | undefined => {
            if (value == null) return undefined;
            if (typeof value === "string") {
                const trimmed = value.trim();
                const bytePattern = /^\d{1,3}(?:,\s*\d{1,3})+$/;
                return bytePattern.test(trimmed) ? decodeByteString(trimmed) : trimmed;
            }
            if (value instanceof Uint8Array) {
                return new TextDecoder("utf-8").decode(value);
            }
            if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
                try {
                    return new TextDecoder("utf-8").decode(Uint8Array.from(value));
                } catch {
                    return value.join(",");
                }
            }
            return String(value);
        };

        const trimContext = (value: string | undefined, maxTokens?: number): string | undefined => {
            if (!value) return undefined;
            const tokenLimit = maxTokens && maxTokens > 0 ? maxTokens : 2000;
            const maxChars = tokenLimit * 4;
            if (value.length <= maxChars) return value;
            return value.slice(0, maxChars);
        };

        const normalizedContent = trimContext(
            normalizeContextContent(context.content),
            context.contextWindowTokens
        );

        // Build context prompt
        let contextPrompt = '';
        if (context.type === 'document' && normalizedContent) {
            contextPrompt = `You are a helpful assistant analyzing the following document content:\n\n${normalizedContent}\n\nAnswer questions based on this document.`;
            if (context.selection && context.selection.trim().length > 0) {
                contextPrompt += `\n\nSelected text:\n${context.selection}`;
            }
        } else if (context.type === 'web') {
            contextPrompt = 'You are a helpful assistant that can search the web for information.';
        } else {
            contextPrompt = 'You are a helpful assistant.';
        }

        // Prepend context as system message
        const messagesWithContext = [
            { role: 'system', content: contextPrompt },
            ...messages,
        ];

        // Call llm_chat with the enhanced messages
        return await commandHandlers.llm_chat({
            provider,
            model,
            messages: messagesWithContext,
            temperature: 0.7,
            maxTokens: 2000,
            apiKey,
            baseUrl,
        });
    },

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
