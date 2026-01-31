/**
 * Audiobook API
 * 
 * Handles audiobook metadata extraction, transcript management,
 * chapter parsing, and cover art fetching.
 */

import { isTauri } from "../lib/tauri";

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
