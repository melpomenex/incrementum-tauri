/**
 * Document Import Utilities
 * Handles importing documents from various sources: URLs, Arxiv, files, etc.
 */

import { Document } from '../types/document';
import { fetchUrlContent } from '../api/documents';

/**
 * Fetch content from a URL and create a document
 */
export async function importFromUrl(url: string): Promise<Omit<Document, 'id'>> {
  try {
    // Validate URL
    const validUrl = new URL(url);

    // Fetch content through Tauri backend to avoid CORS
    const fetched = await fetchUrlContent(validUrl.toString());

    // Extract metadata from URL
    const urlParts = validUrl.pathname.split('/');
    const fileName = urlParts[urlParts.length - 1] || validUrl.hostname;
    const title = fileName.replace(/\.(html?|md|txt)$/i, '') || `Web Content - ${validUrl.hostname}`;

    // Determine file type from fetched content type
    let fileType: Document['fileType'] = 'html';
    if (fetched.content_type.includes('pdf')) {
      fileType = 'pdf';
    } else if (fetched.content_type.includes('markdown') || fetched.content_type.includes('text/markdown')) {
      fileType = 'markdown';
    } else if (url.match(/\.(md|markdown)$/i)) {
      fileType = 'markdown';
    } else if (url.match(/\.(txt)$/i)) {
      fileType = 'other';
    }

    // For HTML files, we'll read the file and store the full HTML as content
    // This allows the viewer to display the page with proper formatting
    let content = `Imported from ${url}`;
    if (fileType === 'html') {
      try {
        // Read the fetched HTML file
        const { readDocumentFile } = await import('../api/documents');
        const base64Content = await readDocumentFile(fetched.file_path);

        // Convert base64 to string
        const htmlContent = atob(base64Content);

        // Parse HTML and clean it up like the browser extension does
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Remove scripts, iframes, and other potentially harmful elements
        doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());

        // Add a base tag to preserve relative links and images
        const baseTag = doc.querySelector('base');
        if (!baseTag) {
          const base = doc.createElement('base');
          base.href = validUrl.origin + '/';
          doc.head.insertBefore(base, doc.head.firstChild);
        }

        // Try to find and preserve the main content area (like browser extension does)
        const contentSelectors = [
          'main',
          'article',
          '[role="main"]',
          '.content',
          '.main-content',
          '#content',
          '#main',
          '.post-content',
          '.entry-content',
          '.article-content'
        ];

        let mainElement = null;
        for (const selector of contentSelectors) {
          mainElement = doc.querySelector(selector);
          if (mainElement) break;
        }

        // If we found a main content area, use it; otherwise use full body
        const contentHtml = mainElement ? mainElement.outerHTML : doc.body.innerHTML;

        // Create a clean HTML document with the content
        const cleanDoc = document.implementation.createHTMLDocument(title || 'Imported Page');
        cleanDoc.head.innerHTML = `
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <base href="${validUrl.origin}/">
          <title>${title || validUrl.hostname}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            img { max-width: 100%; height: auto; }
            pre { background: #f4f4f4; padding: 1em; overflow-x: auto; }
            code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
            blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
          </style>
        `;

        // Copy the content
        cleanDoc.body.innerHTML = contentHtml;

        // Serialize to HTML string
        content = cleanDoc.documentElement.outerHTML;
      } catch (error) {
        console.warn('Failed to process HTML content during import:', error);
        content = `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Imported from ${validUrl.hostname}</h2>
          <p>Content will be available once you open this document.</p>
          <p><a href="${url}" target="_blank">View original page →</a></p>
        </div>`;
      }
    }

    // Create document object
    const document: Omit<Document, 'id'> = {
      title: title,
      filePath: fetched.file_path,
      fileType: fileType,
      content: content,
      contentHash: await generateHash(fetched.file_path),
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

    // Download PDF using the backend fetch function
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    const fetched = await fetchUrlContent(pdfUrl);

    // Create document object
    const document: Omit<Document, 'id'> = {
      title: metadata.title,
      filePath: fetched.file_path,
      fileType: 'pdf',
      content: metadata.abstract,
      contentHash: await generateHash(fetched.file_path),
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
        originalFileName: fetched.file_name,
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
