/**
 * Audiobook API
 * 
 * Handles audiobook metadata extraction, transcript management,
 * chapter parsing, and cover art fetching.
 */

import { isTauri } from "../lib/tauri";
import type { Document } from "../types/document";

export interface AudiobookMetadata {
  title: string;
  author?: string;
  narrator?: string;
  duration: number; // in seconds
  chapters: AudiobookChapter[];
  coverUrl?: string;
  description?: string;
  publisher?: string;
  publishYear?: number;
  language?: string;
  genre?: string[];
  isbn?: string;
  series?: string;
  seriesNumber?: number;
}

export interface AudiobookChapter {
  id: number;
  title: string;
  startTime: number; // in seconds
  endTime?: number; // in seconds
  duration?: number; // in seconds
}

export interface AudiobookTranscript {
  segments: TranscriptSegment[];
  fullText: string;
  language?: string;
  source: "generated" | "imported" | "fetched";
  lastUpdated: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  speaker?: string;
  confidence?: number;
}

export interface AudiobookImportOptions {
  filePath: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  transcript?: AudiobookTranscript;
  chapters?: AudiobookChapter[];
}

// Supported audiobook formats
export const AUDIOBOOK_FORMATS = [
  "mp3", "m4b", "m4a", "aac", "ogg", "flac", "opus", "wav", "wma"
];

// Check if file is an audiobook
export function isAudiobookFile(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return AUDIOBOOK_FORMATS.includes(ext);
}

// Scan directory for audiobook files
export async function scanDirectoryForAudiobooks(dirPath: string): Promise<string[]> {
  if (!isTauri()) {
    // Browser mode - can't scan directories
    return [];
  }
  
  const { invokeCommand } = await import("../lib/tauri");
  return await invokeCommand<string[]>("scan_directory_for_audiobooks", {
    dirPath,
    extensions: AUDIOBOOK_FORMATS,
  });
}

// Multi-part audiobook (single book in multiple files)
export interface MultiPartAudiobook {
  title: string;
  author?: string;
  parts: Array<{
    filePath: string;
    partNumber: number;
    duration?: number;
  }>;
  totalDuration: number;
}

// Detect if files are parts of the same book
export function detectMultiPartAudiobook(filePaths: string[]): MultiPartAudiobook | null {
  if (filePaths.length < 2) return null;
  
  // Sort files to ensure proper order
  const sortedPaths = [...filePaths].sort();
  
  // Get base names without extension
  const baseNames = sortedPaths.map(path => {
    const fileName = path.split("/").pop()?.split("\\").pop() || "";
    return fileName.replace(/\.[^/.]+$/, "");
  });
  
  // Check for common multi-part patterns
  const patterns = [
    // "Book Title Part 1", "Book Title Part 2"
    { regex: /^(.+?)\s+(?:part|pt|volume|vol|book|bk)\s*(\d+)$/i, group: 1 },
    // "Book Title - Part 1", "Book Title - Part 2"
    { regex: /^(.+?)\s*[-:]\s*(?:part|pt|volume|vol|book|bk)\s*(\d+)$/i, group: 1 },
    // "Book Title 1", "Book Title 2" (numbered at end)
    { regex: /^(.+?)\s+(\d+)$/i, group: 1 },
    // "01 Book Title", "02 Book Title" (numbered at start)
    { regex: /^(\d+)\s+(.+)$/i, group: 2 },
  ];
  
  for (const pattern of patterns) {
    const matches = baseNames.map(name => name.match(pattern.regex));
    
    // Check if all files match this pattern
    if (matches.every(m => m !== null)) {
      const groups = matches.map(m => m![pattern.group].trim());
      const partNumbers = matches.map(m => parseInt(m![2]));
      
      // Check if base name is consistent
      const baseName = groups[0];
      const allSameBase = groups.every(g => g === baseName);
      
      if (allSameBase) {
        // Parse "Author - Title" from base name
        const titleParts = baseName.split(" - ");
        const author = titleParts.length >= 2 ? titleParts[0].trim() : undefined;
        const title = titleParts.length >= 2 
          ? titleParts.slice(1).join(" - ").trim() 
          : baseName;
        
        return {
          title,
          author,
          parts: sortedPaths.map((path, idx) => ({
            filePath: path,
            partNumber: partNumbers[idx] || idx + 1,
          })),
          totalDuration: 0,
        };
      }
    }
  }
  
  // Fallback: if filenames are very similar (differ only by number)
  if (baseNames.length >= 2) {
    const first = baseNames[0];
    const last = baseNames[baseNames.length - 1];
    
    // Find common prefix (removing trailing numbers)
    const firstWithoutNumbers = first.replace(/\d+\s*$/g, '').trim();
    const lastWithoutNumbers = last.replace(/\d+\s*$/g, '').trim();
    
    if (firstWithoutNumbers === lastWithoutNumbers && firstWithoutNumbers.length > 3) {
      const titleParts = firstWithoutNumbers.split(" - ");
      const author = titleParts.length >= 2 ? titleParts[0].trim() : undefined;
      const title = titleParts.length >= 2 
        ? titleParts.slice(1).join(" - ").trim() 
        : firstWithoutNumbers;
      
      return {
        title,
        author,
        parts: sortedPaths.map((path, idx) => ({
          filePath: path,
          partNumber: idx + 1,
        })),
        totalDuration: 0,
      };
    }
  }
  
  return null;
}

// Batch audiobook import result
export interface BatchImportResult {
  successful: Array<{
    filePath: string;
    document: Document;
    metadata: Partial<AudiobookMetadata>;
  }>;
  failed: Array<{
    filePath: string;
    error: string;
  }>;
  total: number;
}

// Parse audiobook metadata from file
export async function parseAudiobookMetadata(filePath: string): Promise<AudiobookMetadata> {
  if (isTauri()) {
    // In Tauri, use backend to parse metadata
    const { invokeCommand } = await import("../lib/tauri");
    return await invokeCommand<AudiobookMetadata>("parse_audiobook_metadata", { filePath });
  }
  
  // Browser fallback - create basic metadata
  return createBasicMetadata(filePath);
}

// Create basic metadata from filename (browser fallback)
function createBasicMetadata(filePath: string): AudiobookMetadata {
  const fileName = filePath.split("/").pop()?.split("\\").pop() || "Unknown";
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // Try to parse "Author - Title" format
  const parts = nameWithoutExt.split(" - ");
  let title = nameWithoutExt;
  let author: string | undefined;
  
  if (parts.length >= 2) {
    author = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }
  
  return {
    title,
    author,
    duration: 0,
    chapters: [{
      id: 1,
      title: "Chapter 1",
      startTime: 0,
    }],
  };
}

// Search for audiobook cover art
export async function searchAudiobookCover(
  title: string,
  author?: string
): Promise<string[]> {
  try {
    // Use OpenLibrary or Google Books API for cover images
    const query = author ? `${title} ${author}` : title;
    const encodedQuery = encodeURIComponent(query);
    
    // Try Google Books first
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=5`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const covers: string[] = [];
    
    for (const item of data.items || []) {
      const imageLinks = item.volumeInfo?.imageLinks;
      if (imageLinks) {
        // Prefer larger images
        if (imageLinks.extraLarge) covers.push(imageLinks.extraLarge);
        else if (imageLinks.large) covers.push(imageLinks.large);
        else if (imageLinks.medium) covers.push(imageLinks.medium);
        else if (imageLinks.thumbnail) covers.push(imageLinks.thumbnail);
      }
    }
    
    return covers;
  } catch (error) {
    console.error("Failed to search audiobook cover:", error);
    return [];
  }
}

// Search for audiobook metadata
export async function searchAudiobookMetadata(
  title: string,
  author?: string
): Promise<Partial<AudiobookMetadata>[]> {
  try {
    const query = author ? `${title} ${author}` : title;
    const encodedQuery = encodeURIComponent(query);
    
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=5`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.volumeInfo?.title || title,
      author: item.volumeInfo?.authors?.[0] || author,
      description: item.volumeInfo?.description,
      publisher: item.volumeInfo?.publisher,
      publishYear: item.volumeInfo?.publishedDate 
        ? parseInt(item.volumeInfo.publishedDate.substring(0, 4)) 
        : undefined,
      genre: item.volumeInfo?.categories,
      language: item.volumeInfo?.language,
      isbn: item.volumeInfo?.industryIdentifiers?.find(
        (id: any) => id.type === "ISBN_13" || id.type === "ISBN_10"
      )?.identifier,
      coverUrl: item.volumeInfo?.imageLinks?.thumbnail,
    }));
  } catch (error) {
    console.error("Failed to search audiobook metadata:", error);
    return [];
  }
}

// Generate transcript using Whisper (Tauri only)
export async function generateTranscript(
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<AudiobookTranscript> {
  if (!isTauri()) {
    throw new Error("Transcript generation requires the desktop app");
  }
  
  const { invokeCommand } = await import("../lib/tauri");
  
  // Use Tauri backend with Whisper
  const result = await invokeCommand<{
    segments: TranscriptSegment[];
    language?: string;
  }>("generate_audiobook_transcript", { 
    filePath,
    // Model options
    model: "base",
    language: "auto",
  });
  
  const fullText = result.segments.map(s => s.text).join(" ");
  
  return {
    segments: result.segments,
    fullText,
    language: result.language,
    source: "generated",
    lastUpdated: new Date().toISOString(),
  };
}

// Import transcript from file
export async function importTranscriptFromFile(
  filePath: string
): Promise<AudiobookTranscript> {
  const { readDocumentFile } = await import("./documents");
  
  // Read file content
  const content = await readDocumentFile(filePath);
  const text = atob(content);
  
  // Try to parse as JSON first
  try {
    const json = JSON.parse(text);
    if (json.segments) {
      return {
        segments: json.segments,
        fullText: json.segments.map((s: TranscriptSegment) => s.text).join(" "),
        language: json.language,
        source: "imported",
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch {
    // Not JSON, treat as plain text
  }
  
  // Parse as plain text - create one segment per paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const segments: TranscriptSegment[] = paragraphs.map((text, index) => ({
    id: `segment-${index}`,
    text: text.trim(),
    startTime: 0, // Unknown timing for plain text
    endTime: 0,
  }));
  
  return {
    segments,
    fullText: text,
    source: "imported",
    lastUpdated: new Date().toISOString(),
  };
}

// Search for existing transcript online
export async function searchExistingTranscript(
  title: string,
  author?: string
): Promise<AudiobookTranscript | null> {
  // This could search various transcript repositories
  // For now, return null - would need to integrate with specific APIs
  return null;
}

// Parse chapters from audiobook file
export async function parseChapters(filePath: string): Promise<AudiobookChapter[]> {
  if (isTauri()) {
    const { invokeCommand } = await import("../lib/tauri");
    return await invokeCommand<AudiobookChapter[]>("parse_audiobook_chapters", { filePath });
  }
  
  // Browser fallback
  return [{
    id: 1,
    title: "Chapter 1",
    startTime: 0,
  }];
}

// Format duration in seconds to human readable
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Extract sample/preview from audiobook
export async function extractAudioSample(
  filePath: string,
  startTime: number,
  duration: number
): Promise<string> {
  if (!isTauri()) {
    throw new Error("Audio sample extraction requires the desktop app");
  }
  
  const { invokeCommand } = await import("../lib/tauri");
  return await invokeCommand<string>("extract_audio_sample", {
    filePath,
    startTime,
    duration,
  });
}
