/**
 * OCR (Optical Character Recognition) functionality using Tesseract.js
 */

// Tesseract.js types (simplified - actual types would come from @types/tesseract.js)
export interface OCRResult {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
}

export interface OCRLine {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: OCRWord[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OCROptions {
  language?: string | string[];
  oem?: OCRMode;
  psm?: PageSegMode;
  whitelist?: string;
  blacklist?: string;
}

export enum OCRMode {
  TesseractOnly = 0,
  LstmOnly = 1,
  Default = 3,
}

export enum PageSegMode {
  OsdOnly = 0,
  AutoOsd = 1,
  AutoOnly = 2,
  Auto = 3,
  SingleColumn = 4,
  SingleBlockVertText = 5,
  SingleBlock = 6,
  SingleLine = 7,
  SingleWord = 8,
  CircleWord = 9,
  SingleChar = 10,
  SparseText = 11,
  SparseTextOsd = 12,
}

export enum OCRLanguage {
  English = "eng",
  Spanish = "spa",
  French = "fra",
  German = "deu",
  Italian = "ita",
  Portuguese = "por",
  Russian = "rus",
  ChineseSimplified = "chi_sim",
  ChineseTraditional = "chi_tra",
  Japanese = "jpn",
  Korean = "kor",
  Arabic = "ara",
  Hindi = "hin",
  Dutch = "nld",
  Polish = "pol",
  Turkish = "tur",
  Vietnamese = "vie",
  Thai = "tha",
  Hebrew = "heb",
}

/**
 * Available OCR languages
 */
export const AVAILABLE_LANGUAGES = [
  { code: OCRLanguage.English, name: "English" },
  { code: OCRLanguage.Spanish, name: "Spanish" },
  { code: OCRLanguage.French, name: "French" },
  { code: OCRLanguage.German, name: "German" },
  { code: OCRLanguage.Italian, name: "Italian" },
  { code: OCRLanguage.Portuguese, name: "Portuguese" },
  { code: OCRLanguage.Russian, name: "Russian" },
  { code: OCRLanguage.ChineseSimplified, name: "Chinese (Simplified)" },
  { code: OCRLanguage.ChineseTraditional, name: "Chinese (Traditional)" },
  { code: OCRLanguage.Japanese, name: "Japanese" },
  { code: OCRLanguage.Korean, name: "Korean" },
  { code: OCRLanguage.Arabic, name: "Arabic" },
  { code: OCRLanguage.Hindi, name: "Hindi" },
  { code: OCRLanguage.Dutch, name: "Dutch" },
  { code: OCRLanguage.Polish, name: "Polish" },
  { code: OCRLanguage.Turkish, name: "Turkish" },
  { code: OCRLanguage.Vietnamese, name: "Vietnamese" },
  { code: OCRLanguage.Thai, name: "Thai" },
  { code: OCRLanguage.Hebrew, name: "Hebrew" },
];

/**
 * Perform OCR on an image
 */
export async function performOCR(
  image: string | File | HTMLImageElement,
  options: OCROptions = {}
): Promise<OCRResult> {
  // Dynamic import of Tesseract.js
  const Tesseract = await import("tesseract.js");

  const {
    language = OCRLanguage.English,
    oem = OCRMode.Default,
    psm = PageSegMode.Auto,
  } = options;

  const langStr = Array.isArray(language) ? language.join("+") : language;

  try {
    const result = await Tesseract.recognize(image, langStr, {
      logger: (m: any) => {
        // Progress logging can be done here
        console.log(m);
      },
    });

    // Parse Tesseract result
    return parseTesseractResult(result.data);
  } catch (error) {
    console.error("OCR failed:", error);
    throw new Error(`OCR processing failed: ${error}`);
  }
}

/**
 * Parse Tesseract result to our format
 */
function parseTesseractResult(data: any): OCRResult {
  const lines: OCRLine[] = [];
  const words: OCRWord[] = [];

  if (data.lines) {
    data.lines.forEach((line: any) => {
      const lineWords: OCRWord[] = [];

      if (line.words) {
        line.words.forEach((word: any) => {
          const w: OCRWord = {
            text: word.text,
            confidence: word.confidence,
            bbox: {
              x0: word.bbox.x0,
              y0: word.bbox.y0,
              x1: word.bbox.x1,
              y1: word.bbox.y1,
            },
          };
          lineWords.push(w);
          words.push(w);
        });
      }

      lines.push({
        text: line.text,
        confidence: line.confidence,
        bbox: {
          x0: line.bbox.x0,
          y0: line.bbox.y0,
          x1: line.bbox.x1,
          y1: line.bbox.y1,
        },
        words: lineWords,
      });
    });
  }

  return {
    text: data.text || "",
    confidence: data.confidence || 0,
    lines,
    words,
  };
}

/**
 * Perform OCR with progress callback
 */
export async function performOCRWithProgress(
  image: string | File | HTMLImageElement,
  onProgress: (progress: number, status: string) => void,
  options: OCROptions = {}
): Promise<OCRResult> {
  const Tesseract = await import("tesseract.js");

  const { language = OCRLanguage.English } = options;
  const langStr = Array.isArray(language) ? language.join("+") : language;

  const worker = await Tesseract.createWorker(langStr);

  try {
    onProgress(0, "Initializing...");

    const result = await worker.recognize(image, {}, {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          onProgress(Math.round(m.progress * 100), m.status);
        } else {
          onProgress(0, m.status);
        }
      },
    });

    await worker.terminate();

    return parseTesseractResult(result.data);
  } catch (error) {
    await worker.terminate();
    throw new Error(`OCR processing failed: ${error}`);
  }
}

/**
 * Get OCR language display name
 */
export function getLanguageDisplayName(code: string): string {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
  return lang?.name || code;
}

/**
 * Preload OCR language data
 */
export async function preloadLanguage(language: string = OCRLanguage.English): Promise<void> {
  const Tesseract = await import("tesseract.js");
  await Tesseract.loadLanguage(language);
}

/**
 * Check if OCR language is available
 */
export function isLanguageAvailable(code: string): boolean {
  return AVAILABLE_LANGUAGES.some((l) => l.code === code);
}

/**
 * Extract text from image file
 */
export async function extractTextFromImage(
  file: File,
  options?: OCROptions
): Promise<OCRResult> {
  return performOCR(file, options);
}

/**
 * Extract text from multiple images (batch processing)
 */
export async function extractTextFromMultipleImages(
  images: Array<string | File>,
  onProgress?: (current: number, total: number) => void,
  options?: OCROptions
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length);
    const result = await performOCR(images[i], options);
    results.push(result);
  }

  return results;
}

/**
 * Calculate OCR quality score
 */
export function calculateOCRQuality(result: OCRResult): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check confidence
  if (result.confidence < 50) {
    score -= 30;
    issues.push("Low overall confidence");
  } else if (result.confidence < 70) {
    score -= 15;
    issues.push("Medium overall confidence");
  }

  // Check for empty results
  if (!result.text.trim()) {
    score = 0;
    issues.push("No text detected");
  }

  // Check word confidence
  const lowConfWords = result.words.filter((w) => w.confidence < 50);
  if (lowConfWords.length > result.words.length * 0.3) {
    score -= 20;
    issues.push("Many low-confidence words");
  }

  // Check for common OCR errors
  const errorPatterns = [
    /\|/g, // Vertical bars often misrecognized
    /1\//g, // Slash confusion
  ];

  let errorCount = 0;
  errorPatterns.forEach((pattern) => {
    const matches = result.text.match(pattern);
    if (matches) {
      errorCount += matches.length;
    }
  });

  if (errorCount > 10) {
    score -= 10;
    issues.push("Possible character recognition errors");
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Validate OCR result
 */
export function validateOCRResult(result: OCRResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const quality = calculateOCRQuality(result);

  if (result.text.trim().length === 0) {
    warnings.push("No text was extracted from the image");
  }

  if (result.confidence < 50) {
    warnings.push("Very low confidence - results may be inaccurate");
  } else if (result.confidence < 70) {
    warnings.push("Low confidence - please review results");
  }

  if (quality.score < 50) {
    warnings.push("Poor OCR quality detected");
  }

  return {
    isValid: warnings.length === 0 || warnings.length <= 2,
    warnings,
  };
}

/**
 * Clean OCR text (post-processing)
 */
export function cleanOCRText(text: string): string {
  return text
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    // Fix common OCR errors
    .replace(/\|/g, "I")
    .replace(/([a-z])\1\1+/g, "$1$1") // Remove repeated letters
    .trim();
}

/**
 * Get OCR statistics
 */
export function getOCRStatistics(result: OCRResult): {
  totalLines: number;
  totalWords: number;
  avgConfidence: number;
  avgWordConfidence: number;
} {
  const avgWordConfidence =
    result.words.length > 0
      ? result.words.reduce((sum, w) => sum + w.confidence, 0) / result.words.length
      : 0;

  return {
    totalLines: result.lines.length,
    totalWords: result.words.length,
    avgConfidence: result.confidence,
    avgWordConfidence,
  };
}

/**
 * Search within OCR results
 */
export function searchOCRResult(result: OCRResult, query: string): Array<{
  word: OCRWord;
  line: OCRLine;
}> {
  const results: Array<{ word: OCRWord; line: OCRLine }> = [];
  const lowerQuery = query.toLowerCase();

  result.lines.forEach((line) => {
    line.words.forEach((word) => {
      if (word.text.toLowerCase().includes(lowerQuery)) {
        results.push({ word, line });
      }
    });
  });

  return results;
}

/**
 * Merge multiple OCR results
 */
export function mergeOCRResults(results: OCRResult[]): OCRResult {
  const mergedLines: OCRLine[] = [];
  const mergedWords: OCRWord[] = [];
  const texts: string[] = [];
  let totalConfidence = 0;

  results.forEach((result) => {
    texts.push(result.text);
    totalConfidence += result.confidence;
    mergedLines.push(...result.lines);
    mergedWords.push(...result.words);
  });

  return {
    text: texts.join("\n\n"),
    confidence: results.length > 0 ? totalConfidence / results.length : 0,
    lines: mergedLines,
    words: mergedWords,
  };
}

/**
 * Export OCR result to text file
 */
export function exportOCRToText(result: OCRResult): string {
  let output = `OCR Result\n`;
  output += `Confidence: ${result.confidence.toFixed(2)}%\n`;
  output += `Lines: ${result.lines.length}\n`;
  output += `Words: ${result.words.length}\n`;
  output += `\n${"=".repeat(50)}\n\n`;
  output += result.text;

  return output;
}

/**
 * Export OCR result with line positions (for annotations)
 */
export function exportOCRWithPositions(result: OCRResult): string {
  let output = "";

  result.lines.forEach((line, index) => {
    output += `[Line ${index + 1}] (${line.bbox.x0},${line.bbox.y0}) - (${line.bbox.x1},${line.bbox.y1})\n`;
    output += `Confidence: ${line.confidence.toFixed(2)}%\n`;
    output += `${line.text}\n\n`;
  });

  return output;
}

/**
 * Save OCR result to localStorage
 */
export function saveOCRResult(id: string, result: OCRResult): void {
  const data = {
    result,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(`ocr_result_${id}`, JSON.stringify(data));
}

/**
 * Load OCR result from localStorage
 */
export function loadOCRResult(id: string): { result: OCRResult; timestamp: string } | null {
  const data = localStorage.getItem(`ocr_result_${id}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear OCR result from localStorage
 */
export function clearOCRResult(id: string): void {
  localStorage.removeItem(`ocr_result_${id}`);
}

/**
 * Get all saved OCR results
 */
export function getAllSavedOCRResults(): Array<{ id: string; result: OCRResult; timestamp: string }> {
  const results: Array<{ id: string; result: OCRResult; timestamp: string }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("ocr_result_")) {
      const id = key.replace("ocr_result_", "");
      const data = loadOCRResult(id);
      if (data) {
        results.push({ id, ...data });
      }
    }
  }

  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
