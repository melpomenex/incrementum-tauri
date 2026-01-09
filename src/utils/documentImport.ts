/**
 * Document Import Utilities
 * Handles importing documents from various sources: URLs, Arxiv, files, etc.
 */

import { invoke } from '@tauri-apps/api/core';
import { Document } from '../types/document';

/**
 * Fetch content from a URL and create a document
 */
export async function importFromUrl(url: string): Promise<Omit<Document, 'id'>> {
  try {
    // Validate URL
    const validUrl = new URL(url);

    // Fetch content through Tauri backend to avoid CORS
    const content = await invoke<string>('fetch_url_content', { url: validUrl.toString() });

    // Extract metadata from URL
    const urlParts = validUrl.pathname.split('/');
    const fileName = urlParts[urlParts.length - 1] || validUrl.hostname;
    const title = fileName.replace(/\.(html?|md|txt)$/i, '') || `Web Content - ${validUrl.hostname}`;

    // Determine file type
    let fileType: Document['fileType'] = 'html';
    if (url.match(/\.(md|markdown)$/i)) {
      fileType = 'markdown';
    } else if (url.match(/\.(txt)$/i)) {
      fileType = 'other';
    }

    // Create document object
    const document: Omit<Document, 'id'> = {
      title: title,
      filePath: url, // Store original URL
      fileType: fileType,
      content: content,
      contentHash: await generateHash(content),
      category: 'Web Import',
      tags: ['web-import', new URL(url).hostname],
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      extractCount: 0,
      learningItemCount: 0,
      priorityRating: 0,
      prioritySlider: 0,
      priorityScore: 5,
      isArchived: false,
      isFavorite: false,
      metadata: {
        source: url,
        fetchedAt: new Date().toISOString(),
        language: 'en',
      },
    };

    return document;
  } catch (error) {
    throw new Error(`Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import paper from Arxiv
 */
export async function importFromArxiv(input: string): Promise<Omit<Document, 'id'>> {
  try {
    // Extract Arxiv ID from URL or direct input
    const arxivId = extractArxivId(input);
    if (!arxivId) {
      throw new Error('Invalid Arxiv ID or URL');
    }

    // Fetch paper metadata from Arxiv API
    const metadata = await fetchArxivMetadata(arxivId);

    // Download PDF
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    const pdfContent = await invoke<string>('fetch_url_content', { url: pdfUrl });

    // Create document object
    const document: Omit<Document, 'id'> = {
      title: metadata.title,
      filePath: pdfUrl,
      fileType: 'pdf',
      content: metadata.abstract,
      contentHash: await generateHash(pdfContent),
      category: 'Research Papers',
      tags: [
        'arxiv',
        'research',
        ...metadata.categories.slice(0, 3),
      ],
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      extractCount: 0,
      learningItemCount: 0,
      priorityRating: 0,
      prioritySlider: 0,
      priorityScore: 7, // Research papers are high priority
      isArchived: false,
      isFavorite: false,
      metadata: {
        author: metadata.authors.join(', '),
        subject: metadata.primary_category,
        keywords: metadata.categories,
        createdAt: metadata.published,
        pageCount: undefined, // Will be determined when PDF is processed
        language: 'en',
        arxivId: arxivId,
        arxivUrl: `https://arxiv.org/abs/${arxivId}`,
        pdfUrl: pdfUrl,
      },
    };

    return document;
  } catch (error) {
    throw new Error(`Failed to import from Arxiv: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract Arxiv ID from various input formats
 */
function extractArxivId(input: string): string | null {
  // Remove whitespace
  const cleaned = input.trim();

  // Direct ID format: 2301.07041 or cs.AI/1234567
  const directIdMatch = cleaned.match(/^(\d{4}\.\d+|[a-z-]+\/\d+)$/);
  if (directIdMatch) {
    return directIdMatch[1];
  }

  // URL format: https://arxiv.org/abs/2301.07041 or https://arxiv.org/pdf/2301.07041.pdf
  const urlMatch = cleaned.match(/arxiv\.org\/(abs|pdf)\/(\d{4}\.\d+|[a-z-]+\/\d+)/);
  if (urlMatch) {
    return urlMatch[2];
  }

  return null;
}

/**
 * Fetch metadata from Arxiv API
 */
interface ArxivMetadata {
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  primary_category: string;
  published: string;
  updated: string;
}

async function fetchArxivMetadata(arxivId: string): Promise<ArxivMetadata> {
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Arxiv API error: ${response.status}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    const entry = xmlDoc.querySelector('entry');
    if (!entry) {
      throw new Error('Paper not found on Arxiv');
    }

    const title = entry.querySelector('title')?.textContent?.trim() || 'Unknown Title';
    const summary = entry.querySelector('summary')?.textContent?.trim() || '';
    const published = entry.querySelector('published')?.textContent || new Date().toISOString();
    const updated = entry.querySelector('updated')?.textContent || new Date().toISOString();

    // Extract authors
    const authors: string[] = [];
    entry.querySelectorAll('author name').forEach((author) => {
      authors.push(author.textContent || '');
    });

    // Extract categories
    const categories: string[] = [];
    const primaryCategory = entry.querySelector('primary_category')?.textContent || '';
    entry.querySelectorAll('category').forEach((cat) => {
      const term = cat.getAttribute('term');
      if (term) categories.push(term);
    });

    return {
      title,
      authors,
      abstract: summary,
      categories: [...new Set(categories)], // Deduplicate
      primary_category: primaryCategory,
      published,
      updated,
    };
  } catch (error) {
    console.error('Error fetching Arxiv metadata:', error);
    // Return minimal metadata on error
    return {
      title: `Arxiv Paper ${arxivId}`,
      authors: [],
      abstract: '',
      categories: [],
      primary_category: 'unknown',
      published: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  }
}

/**
 * Generate hash for content
 */
async function generateHash(content: string): Promise<string> {
  // Simple hash function for now
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Import from screenshot
 */
export async function importFromScreenshot(imageData: ArrayBuffer): Promise<Omit<Document, 'id'>> {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
  const hash = await generateHash(base64);

  const document: Omit<Document, 'id'> = {
    title: `Screenshot ${new Date().toLocaleString()}`,
    filePath: `screenshot://${hash}`,
    fileType: 'other',
    content: `Screenshot captured at ${new Date().toISOString()}`,
    contentHash: hash,
    category: 'Screenshots',
    tags: ['screenshot'],
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    extractCount: 0,
    learningItemCount: 0,
    priorityRating: 0,
    prioritySlider: 0,
    priorityScore: 3,
    isArchived: false,
    isFavorite: false,
    metadata: {
      fileSize: imageData.byteLength,
      createdAt: new Date().toISOString(),
    },
  };

  return document;
}

/**
 * Validate URL before import
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    // Check for common non-content URLs
    const excludedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (excludedDomains.includes(parsed.hostname)) {
      return { valid: false, error: 'Local URLs are not supported' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    };
  }
}

/**
 * Validate Arxiv ID or URL
 */
export function validateArxivInput(input: string): { valid: boolean; error?: string } {
  const arxivId = extractArxivId(input);

  if (!arxivId) {
    return {
      valid: false,
      error: 'Invalid Arxiv ID or URL. Expected format: 2301.07041 or https://arxiv.org/abs/2301.07041',
    };
  }

  return { valid: true };
}
