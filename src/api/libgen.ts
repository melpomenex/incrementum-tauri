/**
 * Library Genesis API client
 * Based on the libgen npm package API but using fetch for browser compatibility
 */

import { isTauri } from "../lib/tauri";

export interface LibGenBook {
  id: string;
  title: string;
  author: string;
  year: string;
  publisher: string;
  pages: string;
  language: string;
  size: string;
  extension: string;
  md5: string;
  cover?: string;
  description?: string;
  series?: string;
  edition?: string;
  isbn?: string;
}

export interface SearchOptions {
  query: string;
  count?: number;
  offset?: number;
  sortBy?: "def" | "title" | "publisher" | "year" | "pages" | "language" | "filesize" | "extension";
  searchIn?: "def" | "title" | "author" | "series" | "publisher" | "year" | "identifier" | "md5" | "extension";
  reverse?: boolean;
}

// LibGen mirrors in order of preference
const LIBGEN_MIRRORS = [
  "https://libgen.is",
  "https://libgen.li",
  "https://libgen.rs",
];

/**
 * Extract book IDs from search results HTML
 */
function extractIds(html: string): string[] {
  const ID_REGEX = /ID:[^0-9]+[0-9]+[^0-9]/g;
  const ids: string[] = [];
  
  const matches = html.match(ID_REGEX);
  if (!matches) return [];
  
  // Process in reverse order as per original implementation
  const reversed = [...matches].reverse();
  for (const match of reversed) {
    const id = match.replace(/[^0-9]/g, "");
    if (parseInt(id)) {
      ids.push(id);
    }
  }
  
  return ids;
}

/**
 * Get the fastest working mirror
 */
async function getWorkingMirror(): Promise<string> {
  for (const mirror of LIBGEN_MIRRORS) {
    try {
      const response = await fetch(mirror, { 
        method: "HEAD",
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return mirror;
      }
    } catch {
      continue;
    }
  }
  return LIBGEN_MIRRORS[0]; // Fallback to first
}

/**
 * Search for books on Library Genesis
 */
export async function searchLibGen(options: SearchOptions): Promise<LibGenBook[]> {
  const {
    query,
    count = 25,
    offset = 0,
    sortBy = "def",
    searchIn = "def",
    reverse = false,
  } = options;

  if (!query || query.length < 4) {
    throw new Error("Search query must be at least four characters");
  }

  const mirror = await getWorkingMirror();
  const sortmode = reverse ? "DESC" : "ASC";
  const closestPage = offset ? Math.floor(offset / 25) + 1 : 1;

  // Build search URL
  const searchUrl = `${mirror}/search.php?&req=${encodeURIComponent(query)}&view=detailed&column=${searchIn}&sort=${sortBy}&sortmode=${sortmode}&page=${closestPage}`;

  let allIds: string[] = [];
  let currentPage = closestPage;

  // Fetch IDs until we have enough
  while (allIds.length < count + offset) {
    const pageUrl = `${mirror}/search.php?&req=${encodeURIComponent(query)}&view=detailed&column=${searchIn}&sort=${sortBy}&sortmode=${sortmode}&page=${currentPage}`;
    
    const response = await fetch(pageUrl);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const html = await response.text();
    const ids = extractIds(html);
    
    if (ids.length === 0) break; // No more results
    
    allIds = allIds.concat(ids);
    currentPage++;
  }

  if (allIds.length === 0) {
    throw new Error(`No results for "${query}"`);
  }

  // Apply offset and limit
  let selectedIds = allIds;
  if (offset > 0) {
    const start = offset - (closestPage - 1) * 25;
    selectedIds = allIds.slice(start, start + count);
  } else {
    selectedIds = allIds.slice(0, count);
  }

  // Fetch detailed book data
  const jsonUrl = `${mirror}/json.php?ids=${selectedIds.join(",")}&fields=*`;
  
  const jsonResponse = await fetch(jsonUrl);
  if (!jsonResponse.ok) {
    throw new Error(`Failed to fetch book details: ${jsonResponse.statusText}`);
  }

  const books = await jsonResponse.json();
  
  // Normalize the data
  return books.map((book: any) => ({
    id: book.id || book.md5,
    title: book.title || "Unknown Title",
    author: book.author || "Unknown Author",
    year: book.year || "",
    publisher: book.publisher || "",
    pages: book.pages || "",
    language: book.language || "",
    size: book.filesize ? formatFileSize(book.filesize) : "",
    extension: (book.extension || "pdf").toLowerCase(),
    md5: book.md5 || "",
    cover: book.coverurl ? `${mirror}/covers/${book.coverurl}` : undefined,
    description: book.descr || "",
    series: book.series || "",
    edition: book.edition || "",
    isbn: book.isbn || "",
  }));
}

/**
 * Get download link for a book
 */
export async function getDownloadLink(md5: string): Promise<string> {
  const mirror = await getWorkingMirror();
  
  // LibGen download links are typically:
  // {mirror}/ads.php?md5={md5}&download=1
  // or
  // {mirror}/get.php?md5={md5}
  
  return `${mirror}/get.php?md5=${md5}`;
}

/**
 * Download a book file
 */
export async function downloadBook(
  md5: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const url = await getDownloadLink(md5);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const total = parseInt(response.headers.get("content-length") || "0");
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error("Failed to start download");
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    received += value.length;
    
    if (total && onProgress) {
      onProgress(received / total);
    }
  }

  // Combine chunks
  const blob = new Blob(chunks as BlobPart[]);
  return blob;
}

/**
 * Format file size from bytes to human readable
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Search and return results with download URLs
 */
export async function searchBooks(
  query: string,
  limit: number = 25
): Promise<LibGenBook[]> {
  return searchLibGen({
    query,
    count: limit,
    sortBy: "def",
    reverse: false,
  });
}
