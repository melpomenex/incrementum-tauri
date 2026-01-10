/**
 * Document Processing Pipeline
 * Handles automatic segmentation, text extraction, metadata enrichment, and thumbnail generation
 */

import { invokeCommand } from "../lib/tauri";

export interface ProcessedDocument {
  content: string;
  segments: DocumentSegment[];
  metadata?: DocumentMetadata;
  thumbnail?: string;
}

export interface DocumentSegment {
  id: string;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  type: "chapter" | "section" | "paragraph" | "code" | "list";
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  description?: string;
  keywords?: string[];
  language?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  readingTime?: number; // in minutes
  complexityScore?: number; // 0-100
}

export interface ProcessingOptions {
  enableSegmentation?: boolean;
  enableMetadataExtraction?: boolean;
  enableThumbnailGeneration?: boolean;
  segmentStrategy?: "paragraph" | "chapter" | "section" | "semantic";
  maxSegmentLength?: number; // characters
  minSegmentLength?: number; // characters
}

/**
 * Main document processing pipeline
 */
export async function processDocument(
  documentId: string,
  content: string,
  fileType: string,
  options: ProcessingOptions = {}
): Promise<ProcessedDocument> {
  const {
    enableSegmentation = true,
    enableMetadataExtraction = true,
    enableThumbnailGeneration = false,
    segmentStrategy = "paragraph",
    maxSegmentLength = 2000,
    minSegmentLength = 200,
  } = options;

  const result: ProcessedDocument = {
    content,
    segments: [],
  };

  // 1. Text Extraction (if needed)
  let extractedContent = content;
  if (fileType === "pdf" || fileType === "epub") {
    extractedContent = await extractTextContent(documentId, fileType);
    result.content = extractedContent;
  }

  // 2. Auto-segmentation
  if (enableSegmentation && extractedContent) {
    result.segments = await segmentDocument(
      extractedContent,
      segmentStrategy,
      minSegmentLength,
      maxSegmentLength
    );
  }

  // 3. Metadata Enrichment
  if (enableMetadataExtraction && extractedContent) {
    result.metadata = await extractMetadata(extractedContent, fileType);
  }

  // 4. Thumbnail Generation
  if (enableThumbnailGeneration) {
    result.thumbnail = await generateThumbnail(documentId, fileType);
  }

  return result;
}

/**
 * Extract text content from document
 */
async function extractTextContent(documentId: string, fileType: string): Promise<string> {
  try {
    // This would typically be handled by the backend
    // For now, we'll return empty string
    console.log(`Extracting text from ${fileType} document: ${documentId}`);
    return "";
  } catch (error) {
    console.error("Failed to extract text content:", error);
    return "";
  }
}

/**
 * Segment document into manageable chunks
 */
async function segmentDocument(
  content: string,
  strategy: ProcessingOptions["segmentStrategy"] = "paragraph",
  minLength: number,
  maxLength: number
): Promise<DocumentSegment[]> {
  const segments: DocumentSegment[] = [];

  switch (strategy) {
    case "paragraph":
      return segmentByParagraph(content, minLength, maxLength);

    case "chapter":
      return segmentByChapter(content, minLength, maxLength);

    case "section":
      return segmentBySection(content, minLength, maxLength);

    case "semantic":
      return await segmentBySemantic(content, minLength, maxLength);

    default:
      return segmentByParagraph(content, minLength, maxLength);
  }
}

/**
 * Segment by paragraphs
 */
function segmentByParagraph(
  content: string,
  minLength: number,
  maxLength: number
): DocumentSegment[] {
  const segments: DocumentSegment[] = [];
  const paragraphs = content.split(/\n\s*\n/);

  let currentSegment = "";
  let startIndex = 0;
  let segmentIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentSegment.length + trimmed.length > maxLength && currentSegment.length > 0) {
      // Save current segment
      segments.push({
        id: `segment-${segmentIndex}`,
        title: generateTitle(currentSegment),
        content: currentSegment.trim(),
        startIndex,
        endIndex: startIndex + currentSegment.length,
        type: "paragraph",
      });

      startIndex += currentSegment.length;
      currentSegment = "";
      segmentIndex++;
    }

    currentSegment += trimmed + "\n\n";
  }

  // Add final segment
  if (currentSegment.trim().length > 0) {
    segments.push({
      id: `segment-${segmentIndex}`,
      title: generateTitle(currentSegment),
      content: currentSegment.trim(),
      startIndex,
      endIndex: startIndex + currentSegment.length,
      type: "paragraph",
    });
  }

  return segments.filter((seg) => seg.content.length >= minLength);
}

/**
 * Segment by chapters
 */
function segmentByChapter(
  content: string,
  minLength: number,
  maxLength: number
): DocumentSegment[] {
  const segments: DocumentSegment[] = [];
  const chapterRegex = /^(chapter|part|section)\s+\d+/gim;

  let startIndex = 0;
  let match;
  let lastIndex = 0;
  let segmentIndex = 0;

  while ((match = chapterRegex.exec(content)) !== null) {
    const chapterContent = content.slice(lastIndex, match.index).trim();

    if (chapterContent.length >= minLength) {
      segments.push({
        id: `chapter-${segmentIndex}`,
        title: extractChapterTitle(chapterContent) || `Chapter ${segmentIndex + 1}`,
        content: chapterContent,
        startIndex: lastIndex,
        endIndex: match.index,
        type: "chapter",
      });
      segmentIndex++;
    }

    lastIndex = match.index;
  }

  // Add final chapter
  const finalContent = content.slice(lastIndex).trim();
  if (finalContent.length >= minLength) {
    segments.push({
      id: `chapter-${segmentIndex}`,
      title: extractChapterTitle(finalContent) || `Chapter ${segmentIndex + 1}`,
      content: finalContent,
      startIndex: lastIndex,
      endIndex: content.length,
      type: "chapter",
    });
  }

  return segments;
}

/**
 * Segment by sections (headings)
 */
function segmentBySection(
  content: string,
  minLength: number,
  maxLength: number
): DocumentSegment[] {
  const segments: DocumentSegment[] = [];
  const headingRegex = /^#{1,3}\s+.+$/gm;

  let startIndex = 0;
  let match;
  let lastIndex = 0;
  let segmentIndex = 0;

  while ((match = headingRegex.exec(content)) !== null) {
    const sectionContent = content.slice(lastIndex, match.index).trim();

    if (sectionContent.length >= minLength) {
      segments.push({
        id: `section-${segmentIndex}`,
        title: extractHeading(content.slice(lastIndex, match.index + 50)) || `Section ${segmentIndex + 1}`,
        content: sectionContent,
        startIndex: lastIndex,
        endIndex: match.index,
        type: "section",
      });
      segmentIndex++;
    }

    lastIndex = match.index;
  }

  // Add final section
  const finalContent = content.slice(lastIndex).trim();
  if (finalContent.length >= minLength) {
    segments.push({
      id: `section-${segmentIndex}`,
      title: extractHeading(finalContent) || `Section ${segmentIndex + 1}`,
      content: finalContent,
      startIndex: lastIndex,
      endIndex: content.length,
      type: "section",
    });
  }

  return segments;
}

/**
 * Segment by semantic meaning (using AI in the future)
 */
async function segmentBySemantic(
  content: string,
  minLength: number,
  maxLength: number
): Promise<DocumentSegment[]> {
  // For now, fall back to paragraph segmentation
  // In the future, this could use AI to identify topic boundaries
  return segmentByParagraph(content, minLength, maxLength);
}

/**
 * Extract metadata from document content
 */
async function extractMetadata(
  content: string,
  fileType: string
): Promise<DocumentMetadata> {
  const metadata: DocumentMetadata = {};

  // Word count
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  metadata.wordCount = words.length;

  // Character count
  metadata.characterCount = content.length;

  // Reading time (average 200 words per minute)
  metadata.readingTime = Math.ceil(metadata.wordCount / 200);

  // Complexity score (based on average word length and sentence length)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  metadata.complexityScore = Math.min(100, Math.round((avgWordLength * 5 + avgSentenceLength * 2)));

  // Extract potential keywords (simple frequency analysis)
  const wordFreq = new Map<string, number>();
  words.forEach((word) => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, "");
    if (lower.length > 3) {
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    }
  });

  metadata.keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return metadata;
}

/**
 * Generate thumbnail for document
 */
async function generateThumbnail(documentId: string, fileType: string): Promise<string> {
  // This would typically be handled by the backend
  // For PDFs, render first page as image
  // For other formats, generate a preview
  console.log(`Generating thumbnail for ${fileType} document: ${documentId}`);
  return "";
}

/**
 * Helper functions
 */

function generateTitle(content: string): string {
  const firstSentence = content.split(/[.!?]/)[0].trim();
  return firstSentence.length > 60
    ? firstSentence.substring(0, 60) + "..."
    : firstSentence || "Untitled Segment";
}

function extractChapterTitle(content: string): string | null {
  const match = content.match(/^(chapter|part|section)\s+\d+:\s*(.+)$/im);
  return match ? match[2].trim() : null;
}

function extractHeading(content: string): string | null {
  const match = content.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Create extracts from processed document segments
 */
export async function createExtractsFromSegments(
  documentId: string,
  segments: DocumentSegment[]
): Promise<void> {
  for (const segment of segments) {
    try {
      await invokeCommand("create_extract", {
        extract: {
          documentId,
          title: segment.title,
          content: segment.content,
          extractedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(`Failed to create extract for segment ${segment.id}:`, error);
    }
  }
}

/**
 * Batch process multiple documents
 */
export async function batchProcessDocuments(
  documentIds: string[],
  options: ProcessingOptions = {}
): Promise<Map<string, ProcessedDocument>> {
  const results = new Map<string, ProcessedDocument>();

  for (const documentId of documentIds) {
    try {
      // Get document content
      const document = await invokeCommand("get_document", { id: documentId });
      const processed = await processDocument(
        documentId,
        document.content || "",
        document.fileType,
        options
      );
      results.set(documentId, processed);
    } catch (error) {
      console.error(`Failed to process document ${documentId}:`, error);
    }
  }

  return results;
}
