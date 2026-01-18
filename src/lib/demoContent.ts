/**
 * Demo Content System for Web/PWA
 *
 * Web-friendly version that loads demo content from a public URL
 * instead of local filesystem access.
 */

import { parseAnkiPackage } from '../utils/ankiParserBrowser';

// Configuration
export const DEMO_CONTENT_CONFIG = {
  // Base URL for demo content (can be overridden via environment variable)
  baseUrl: import.meta.env.VITE_DEMO_CONTENT_URL || '/demo-content',

  // Skip demo import (can be set via environment variable)
  skipImport: import.meta.env.VITE_SKIP_DEMO_IMPORT === '1' || import.meta.env.VITE_SKIP_DEMO_IMPORT === 'true',
};

/**
 * Check if demo content should be imported
 */
export async function shouldImportDemoContent(learningItemStore: any): Promise<boolean> {
  if (DEMO_CONTENT_CONFIG.skipImport) {
    console.log('[Demo Content] Skipped via environment variable');
    return false;
  }

  // Check if there are any existing learning items
  try {
    const items = await learningItemStore?.getItems?.();
    if (items && items.length > 0) {
      console.log('[Demo Content] Database not empty, skipping import');
      return false;
    }
  } catch (error) {
    console.error('[Demo Content] Error checking database:', error);
  }

  return true;
}

/**
 * Get list of available demo .apkg files
 */
export async function getDemoApkgFiles(): Promise<string[]> {
  try {
    const response = await fetch(`${DEMO_CONTENT_CONFIG.baseUrl}/index.json`);
    if (!response.ok) {
      console.log('[Demo Content] No demo content index found');
      return [];
    }

    const index = await response.json();
    return index.apkgFiles || [];
  } catch (error) {
    console.log('[Demo Content] Could not load demo content index:', error);
    return [];
  }
}

/**
 * Get list of available demo book files
 */
export async function getDemoBookFiles(): Promise<string[]> {
  try {
    const response = await fetch(`${DEMO_CONTENT_CONFIG.baseUrl}/index.json`);
    if (!response.ok) {
      return [];
    }

    const index = await response.json();
    return index.bookFiles || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get demo content status
 */
export async function getDemoContentStatus(): Promise<string> {
  const apkgFiles = await getDemoApkgFiles();
  const bookFiles = await getDemoBookFiles();

  if (apkgFiles.length === 0 && bookFiles.length === 0) {
    return 'No demo content available';
  }

  return `Demo content available: ${apkgFiles.length} .apkg file(s), ${bookFiles.length} book file(s)`;
}

/**
 * Import a demo .apkg file from URL
 */
export async function importDemoApkg(filename: string): Promise<{
  documents: Array<{ title: string; content: string; fileType: string; category: string; tags: string[] }>;
  learningItems: Array<{ documentId: string; itemType: string; question: string; answer: string; tags: string[] }>;
}> {
  const url = `${DEMO_CONTENT_CONFIG.baseUrl}/${filename}`;
  console.log(`[Demo Content] Loading ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load demo file: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  const decks = await parseAnkiPackage(uint8Array);

  // Import the deck conversion logic here to avoid circular dependencies
  const { convertAnkiToLearningItems } = await import('../utils/ankiParserBrowser');
  return convertAnkiToLearningItems(decks);
}

/**
 * Check and import demo content on first run
 */
export async function checkAndImportDemoContent(
  learningItemStore: any,
  documentStore: any
): Promise<number> {
  if (!await shouldImportDemoContent(learningItemStore)) {
    return 0;
  }

  console.log('[Demo Content] Importing demo content...');

  let importedCount = 0;

  // Import .apkg files
  const apkgFiles = await getDemoApkgFiles();
  for (const filename of apkgFiles) {
    try {
      console.log(`[Demo Content] Importing demo APKG: ${filename}`);
      const result = await importDemoApkg(filename);

      // Create documents
      for (const doc of result.documents) {
        await documentStore?.create?.(doc);
      }

      // Create learning items
      for (const item of result.learningItems) {
        await learningItemStore?.create?.(item);
      }

      importedCount++;
    } catch (error) {
      console.error(`[Demo Content] Failed to import ${filename}:`, error);
    }
  }

  console.log(`[Demo Content] Import complete - ${importedCount} file(s) imported`);

  return importedCount;
}

/**
 * Manually import demo content (triggered by user action)
 */
export async function importDemoContentManually(): Promise<string> {
  const apkgFiles = await getDemoApkgFiles();
  const bookFiles = await getDemoBookFiles();

  let result = 'Demo Content:\n\n';

  if (apkgFiles.length === 0 && bookFiles.length === 0) {
    result += 'No demo content available.\n\n';
  } else {
    if (apkgFiles.length > 0) {
      result += `.apkg files (${apkgFiles.length}):\n`;
      for (const file of apkgFiles) {
        result += `  - ${file}\n`;
      }
      result += '\n';
    }

    if (bookFiles.length > 0) {
      result += `Book files (${bookFiles.length}):\n`;
      for (const file of bookFiles) {
        result += `  - ${file}\n`;
      }
      result += '\n';
    }
  }

  result += '\nNote: Demo content is automatically imported on first run with an empty database.\n';
  result += `Demo content URL: ${DEMO_CONTENT_CONFIG.baseUrl}`;

  return result;
}

/**
 * Create demo-content/index.json file template
 * This file should be hosted at the demo content URL
 */
export const DEMO_INDEX_TEMPLATE = {
  apkgFiles: [
    'basics.apkg',
    'programming.apkg',
  ],
  bookFiles: [
    'sample.epub',
    'tutorial.pdf',
  ],
};
