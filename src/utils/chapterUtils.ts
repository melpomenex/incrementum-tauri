/**
 * Chapter Extraction and Detection Utilities
 * 
 * Provides utilities for:
 * - Extracting chapters from document content
 * - Detecting chapter references in user queries
 * - Retrieving specific chapter content for Q&A
 */

export interface Chapter {
  number: number;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface ChapterReference {
  type: 'chapter' | 'section' | 'part' | 'appendix';
  number: number;
  title?: string;
  raw: string;
}

// Patterns for detecting chapter references in user queries
const CHAPTER_REFERENCE_PATTERNS = [
  // "chapter 9", "chapter nine", "ch. 9", "ch 9"
  /(?:chapter|ch\.?|chap\.?)\s*(\d+|[\w-]+)/i,
  // "summarize chapter 3", "explain chapter 5"
  /(?:summarize|explain|describe|what is in|tell me about)\s+(?:chapter|ch\.?|chap\.?)\s*(\d+|[\w-]+)/i,
  // "section 2", "part 1"
  /(?:section|part)\s*(\d+|[\w-]+)/i,
  // "appendix A", "appendix 1"
  /appendix\s*([A-Z]|\d+)/i,
];

// Patterns for extracting chapters from document content
const CHAPTER_EXTRACTION_PATTERNS = [
  // "Chapter 1: Title" or "Chapter 1 - Title" or "Chapter 1. Title"
  /^(?:chapter|ch\.?|chap\.?)\s*(\d+|[IVX]+)\s*[:.\-]?\s*(.+?)?$/gim,
  // "CHAPTER ONE" - word numbers
  /^(?:chapter|ch\.?|chap\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*[:.\-]?\s*(.+?)?$/gim,
  // "1. Title" or "1 Title" at line start (for numbered chapters)
  /^Chapter\s+(\d+)\s*[:.\-]?\s*(.+?)?$/gim,
  // Markdown headers: "# Chapter 1" or "## 1. Title"
  /^#{1,3}\s*(?:chapter\s*)?(\d+|[IVX]+)[:.\-]?\s*(.+?)?$/gim,
  // EPUB-style: "Chapter 1" without explicit markers
  /^(?:chapter|ch\.?)\s*(\d+)\s*$/gim,
];

/**
 * Detect if a user query references a specific chapter
 */
export function detectChapterReference(query: string): ChapterReference | null {
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check for chapter patterns
  const chapterMatch = normalizedQuery.match(/(?:chapter|ch\.?|chap\.?)\s*(\d+|[\w-]+)/i);
  if (chapterMatch) {
    const number = parseChapterNumber(chapterMatch[1]);
    return {
      type: 'chapter',
      number,
      raw: chapterMatch[0],
    };
  }
  
  // Check for section patterns
  const sectionMatch = normalizedQuery.match(/(?:section|part)\s*(\d+|[\w-]+)/i);
  if (sectionMatch) {
    const number = parseChapterNumber(sectionMatch[1]);
    return {
      type: 'section',
      number,
      raw: sectionMatch[0],
    };
  }
  
  // Check for appendix patterns
  const appendixMatch = normalizedQuery.match(/appendix\s*([A-Z]|\d+)/i);
  if (appendixMatch) {
    return {
      type: 'appendix',
      number: appendixMatch[1].toUpperCase().charCodeAt(0) - 64, // A=1, B=2, etc.
      raw: appendixMatch[0],
    };
  }
  
  return null;
}

/**
 * Parse chapter number from string (handles digits and roman numerals)
 */
function parseChapterNumber(numStr: string): number {
  // Check if it's a roman numeral
  const romanMatch = numStr.match(/^[IVX]+$/i);
  if (romanMatch) {
    return romanToInt(numStr.toUpperCase());
  }
  
  // Check for word numbers
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12,
  };
  
  const lowerNum = numStr.toLowerCase();
  if (wordNumbers[lowerNum]) {
    return wordNumbers[lowerNum];
  }
  
  // Default to parsing as integer
  const parsed = parseInt(numStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert roman numeral to integer
 */
function romanToInt(roman: string): number {
  const values: Record<string, number> = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
  };
  
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]];
    const next = values[roman[i + 1]];
    
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  
  return result;
}

/**
 * Extract all chapters from document content
 */
export function extractChapters(content: string): Chapter[] {
  const chapters: Chapter[] = [];
  const lines = content.split('\n');
  
  let currentChapter: Partial<Chapter> | null = null;
  let currentContent: string[] = [];
  let chapterStartIndex = 0;
  let lineIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chapterInfo = parseChapterHeader(line);
    
    if (chapterInfo) {
      // Save previous chapter if exists
      if (currentChapter && currentChapter.number !== undefined) {
        chapters.push({
          number: currentChapter.number,
          title: currentChapter.title || `Chapter ${currentChapter.number}`,
          content: currentContent.join('\n').trim(),
          startIndex: chapterStartIndex,
          endIndex: lineIndex,
        });
      }
      
      // Start new chapter
      currentChapter = {
        number: chapterInfo.number,
        title: chapterInfo.title,
      };
      currentContent = [];
      chapterStartIndex = lineIndex;
    } else if (currentChapter) {
      currentContent.push(line);
    }
    
    lineIndex += line.length + 1; // +1 for newline
  }
  
  // Save last chapter
  if (currentChapter && currentChapter.number !== undefined) {
    chapters.push({
      number: currentChapter.number,
      title: currentChapter.title || `Chapter ${currentChapter.number}`,
      content: currentContent.join('\n').trim(),
      startIndex: chapterStartIndex,
      endIndex: content.length,
    });
  }
  
  // If no chapters found, try alternative patterns
  if (chapters.length === 0) {
    return extractChaptersByPattern(content);
  }
  
  return chapters;
}

/**
 * Parse a line to see if it's a chapter header
 */
function parseChapterHeader(line: string): { number: number; title?: string } | null {
  const trimmed = line.trim();
  
  // Pattern: "Chapter 1: Title" or "Chapter 1 - Title"
  const match1 = trimmed.match(/^(?:chapter|ch\.?|chap\.?)\s*(\d+|[IVX]+)\s*[:.\-]?\s*(.+)?$/i);
  if (match1) {
    return {
      number: parseChapterNumber(match1[1]),
      title: match1[2]?.trim() || undefined,
    };
  }
  
  // Pattern: "CHAPTER ONE" - word numbers
  const match2 = trimmed.match(/^(?:chapter|ch\.?|chap\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s*[:.\-]?\s*(.+)?$/i);
  if (match2) {
    return {
      number: parseChapterNumber(match2[1]),
      title: match2[2]?.trim() || undefined,
    };
  }
  
  // Pattern: Markdown header "# Chapter 1" or "## 1. Title"
  const match3 = trimmed.match(/^#{1,3}\s*(?:chapter\s*)?(\d+|[IVX]+)[:.\-]?\s*(.+)?$/i);
  if (match3) {
    return {
      number: parseChapterNumber(match3[1]),
      title: match3[2]?.trim() || undefined,
    };
  }
  
  // Pattern: "1. Title" at start of line (only if it looks like a chapter)
  const match4 = trimmed.match(/^(\d+)[:.\-]\s+(.+)$/);
  if (match4 && looksLikeChapterTitle(match4[2])) {
    return {
      number: parseInt(match4[1], 10),
      title: match4[2].trim(),
    };
  }
  
  return null;
}

/**
 * Check if a title looks like a chapter title (heuristic)
 */
function looksLikeChapterTitle(title: string): boolean {
  const chapterIndicators = [
    'chapter', 'introduction', 'overview', 'summary', 'conclusion',
    'background', 'method', 'results', 'discussion', 'analysis',
    'the', 'of', 'and', 'in', 'for', 'with', 'on', 'to'
  ];
  
  const lower = title.toLowerCase();
  
  // Check if it contains chapter-like words
  return chapterIndicators.some(indicator => lower.includes(indicator)) ||
         // Or if it's relatively short (likely a heading)
         title.length < 100;
}

/**
 * Extract chapters using regex patterns as fallback
 */
function extractChaptersByPattern(content: string): Chapter[] {
  const chapters: Chapter[] = [];
  
  // Use the main chapter regex to find all chapter positions
  const chapterRegex = /^(?:chapter|ch\.?|chap\.?)\s*(\d+|[IVX]+)[:.\-]?\s*(.+?)?$/gim;
  
  let match;
  let lastIndex = 0;
  let lastNumber = 0;
  let lastTitle = '';
  
  while ((match = chapterRegex.exec(content)) !== null) {
    if (lastIndex > 0) {
      // Save previous chapter
      const chapterContent = content.slice(lastIndex, match.index).trim();
      if (chapterContent.length > 100) { // Minimum content threshold
        chapters.push({
          number: lastNumber,
          title: lastTitle || `Chapter ${lastNumber}`,
          content: chapterContent,
          startIndex: lastIndex,
          endIndex: match.index,
        });
      }
    }
    
    lastNumber = parseChapterNumber(match[1]);
    lastTitle = match[2]?.trim() || '';
    lastIndex = match.index + match[0].length;
  }
  
  // Save last chapter
  if (lastIndex > 0 && lastNumber > 0) {
    const finalContent = content.slice(lastIndex).trim();
    if (finalContent.length > 100) {
      chapters.push({
        number: lastNumber,
        title: lastTitle || `Chapter ${lastNumber}`,
        content: finalContent,
        startIndex: lastIndex,
        endIndex: content.length,
      });
    }
  }
  
  return chapters;
}

/**
 * Get a specific chapter by number
 */
export function getChapterByNumber(content: string, chapterNumber: number): Chapter | null {
  const chapters = extractChapters(content);
  return chapters.find(ch => ch.number === chapterNumber) || null;
}

/**
 * Get chapter content with context (previous/next chapters summary)
 * Useful for providing context to LLM without feeding entire book
 */
export function getChapterWithContext(
  content: string, 
  chapterNumber: number,
  includeAdjacentSummaries: boolean = true
): { 
  targetChapter: Chapter; 
  contextInfo: string;
  estimatedTokens: number;
} | null {
  const chapters = extractChapters(content);
  const targetIndex = chapters.findIndex(ch => ch.number === chapterNumber);
  
  if (targetIndex === -1) {
    return null;
  }
  
  const targetChapter = chapters[targetIndex];
  let contextInfo = '';
  
  if (includeAdjacentSummaries) {
    // Add previous chapter summary
    if (targetIndex > 0) {
      const prev = chapters[targetIndex - 1];
      contextInfo += `Previous Chapter (${prev.number}): ${prev.title}\n`;
      contextInfo += `Preview: ${getChapterPreview(prev.content, 200)}\n\n`;
    }
    
    // Add next chapter title
    if (targetIndex < chapters.length - 1) {
      const next = chapters[targetIndex + 1];
      contextInfo += `Next Chapter (${next.number}): ${next.title}\n\n`;
    }
    
    // Add book structure context
    contextInfo += `Book Structure: This is Chapter ${targetChapter.number} of ${chapters.length} chapters.\n`;
  }
  
  // Estimate tokens (rough approximation: 4 chars per token)
  const estimatedTokens = Math.ceil((targetChapter.content.length + contextInfo.length) / 4);
  
  return {
    targetChapter,
    contextInfo,
    estimatedTokens,
  };
}

/**
 * Get a preview of chapter content (first N characters)
 */
function getChapterPreview(content: string, maxLength: number): string {
  const trimmed = content.slice(0, maxLength).trim();
  return trimmed.length < content.length ? trimmed + '...' : trimmed;
}

/**
 * Build optimized context for chapter-specific Q&A
 * Returns content that fits within token limits
 */
export function buildChapterQAContext(
  documentTitle: string,
  content: string,
  chapterNumber: number,
  maxTokens: number = 4000
): string {
  const result = getChapterWithContext(content, chapterNumber, true);
  
  if (!result) {
    // Fallback: if chapter not found, return truncated full content
    const maxChars = maxTokens * 4;
    return content.slice(0, maxChars);
  }
  
  const { targetChapter, contextInfo, estimatedTokens } = result;
  
  // If chapter fits within token limit, return with context
  if (estimatedTokens <= maxTokens * 0.8) { // 80% buffer for response
    return `Document: ${documentTitle}\n\n${contextInfo}---\n\nChapter ${targetChapter.number}: ${targetChapter.title}\n\n${targetChapter.content}`;
  }
  
  // If chapter is too long, truncate intelligently
  const maxChars = Math.floor(maxTokens * 4 * 0.7); // Leave room for context
  const truncatedContent = targetChapter.content.slice(0, maxChars);
  
  return `Document: ${documentTitle}\n\n${contextInfo}---\n\nChapter ${targetChapter.number}: ${targetChapter.title}\n\n${truncatedContent}\n\n[Content truncated due to length...]`;
}

/**
 * Get all chapter titles for a document (for displaying in UI)
 */
export function getChapterTitles(content: string): Array<{ number: number; title: string }> {
  const chapters = extractChapters(content);
  return chapters.map(ch => ({ number: ch.number, title: ch.title }));
}

/**
 * Check if document has extractable chapters
 */
export function hasChapters(content: string): boolean {
  return extractChapters(content).length > 0;
}

/**
 * Format chapter list for display in prompts
 */
export function formatChapterList(content: string): string {
  const chapters = getChapterTitles(content);
  
  if (chapters.length === 0) {
    return 'No chapters detected in this document.';
  }
  
  return chapters
    .map(ch => `Chapter ${ch.number}: ${ch.title}`)
    .join('\n');
}
