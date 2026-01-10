/**
 * Key Phrase Extraction Utilities
 * Extract important keywords and phrases from text
 */

import { extractKeyPhrases as extractKeyPhrasesCommand } from "../api/ocrCommands";

/**
 * Key phrase with relevance score
 */
export interface KeyPhrase {
  text: string;
  score: number;
}

/**
 * Key phrase extraction options
 */
export interface KeyPhraseExtractionOptions {
  maxPhrases?: number;
  minScore?: number;
  minLength?: number;
  maxLength?: number;
  useBackend?: boolean;
}

/**
 * English stop words
 */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between",
  "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do",
  "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
  "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
  "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his",
  "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll",
  "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
  "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
  "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've",
  "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while",
  "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you",
  "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
]);

/**
 * Extract key phrases from text using RAKE algorithm (frontend)
 */
export function extractKeyPhrasesFrontend(
  text: string,
  options: KeyPhraseExtractionOptions = {}
): KeyPhrase[] {
  const {
    maxPhrases = 10,
    minScore = 0.1,
    minLength = 3,
    maxLength = 50,
  } = options;

  // Split text into sentences
  const sentences = text
    .split(/[.!?;:\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Extract candidate phrases
  const phrases: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    const currentPhrase: string[] = [];

    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (STOP_WORDS.has(cleanWord) || cleanWord.length < minLength) {
        if (currentPhrase.length > 0) {
          phrases.push(currentPhrase.join(" "));
          currentPhrase.length = 0;
        }
      } else {
        currentPhrase.push(word);
      }
    }

    if (currentPhrase.length > 0) {
      phrases.push(currentPhrase.join(" "));
    }
  }

  // Calculate word frequencies
  const wordFreq = new Map<string, number>();
  const wordDegrees = new Map<string, number>();

  for (const phrase of phrases) {
    const words = phrase.split(/\s+/).filter((w) => w.length >= minLength);
    if (words.length === 0) continue;

    const degree = words.length - 1;
    for (const word of words) {
      const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      wordFreq.set(lowerWord, (wordFreq.get(lowerWord) || 0) + 1);
      wordDegrees.set(phrase, (wordDegrees.get(phrase) || 0) + degree);
    }
  }

  // Calculate phrase scores
  const scoredPhrases: KeyPhrase[] = phrases
    .map((phrase) => {
      const words = phrase.split(/\s+/).filter((w) => w.length >= minLength);
      const wordScoreSum = words.reduce((sum, word) => {
        const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return sum + (wordFreq.get(lowerWord) || 0);
      }, 0);

      const degree = wordDegrees.get(phrase) || 0;
      const score = wordScoreSum > 0 ? degree / wordScoreSum : 0;

      return {
        text: phrase,
        score,
      };
    })
    .filter((kp) => kp.score >= minScore && kp.text.length <= maxLength)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPhrases);

  return scoredPhrases;
}

/**
 * Extract key phrases from text (uses backend if available)
 */
export async function extractKeyPhrases(
  text: string,
  options: KeyPhraseExtractionOptions = {}
): Promise<KeyPhrase[]> {
  if (options.useBackend !== false) {
    try {
      const result = await extractKeyPhrasesCommand({
        text,
        max_phrases: options.maxPhrases || 10,
      });
      return result.phrases;
    } catch {
      // Fall back to frontend extraction
    }
  }

  return extractKeyPhrasesFrontend(text, options);
}

/**
 * Extract keywords (single words) from text
 */
export function extractKeywords(
  text: string,
  options: { maxKeywords?: number; minFreq?: number } = {}
): KeyPhrase[] {
  const { maxKeywords = 20, minFreq = 2 } = options;

  // Tokenize and count word frequencies
  const wordFreq = new Map<string, number>();
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/g, "");
    if (cleanWord.length >= 3 && !STOP_WORDS.has(cleanWord)) {
      wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
    }
  }

  // Convert to key phrases with TF-IDF-like scoring
  const totalWords = words.length;
  const keywords: KeyPhrase[] = Array.from(wordFreq.entries())
    .filter(([_, freq]) => freq >= minFreq)
    .map(([word, freq]) => ({
      text: word,
      score: (freq / totalWords) * Math.log(freq),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);

  return keywords;
}

/**
 * Extract named entities (people, places, organizations)
 * This is a simple heuristic-based extraction
 */
export function extractNamedEntities(text: string): {
  people: string[];
  places: string[];
  organizations: string[];
} {
  const people: string[] = [];
  const places: string[] = [];
  const organizations: string[] = [];

  // Simple patterns for capitalization (heuristic)
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);

    // Look for consecutive capitalized words (potential proper nouns)
    let currentEntity: string[] = [];
    let consecutiveCapitalized = 0;

    for (const word of words) {
      const isCapitalized = /^[A-Z][a-z]+$/.test(word);

      if (isCapitalized) {
        currentEntity.push(word);
        consecutiveCapitalized++;
      } else {
        if (consecutiveCapitalized >= 2 && consecutiveCapitalized <= 4) {
          const entity = currentEntity.join(" ");

          // Simple heuristics for entity type
          if (/(University|Institute|Corporation|Company|Ltd|Inc|Corp)/.test(entity)) {
            organizations.push(entity);
          } else if (/(City|State|Country|River|Mount|Lake)/.test(entity)) {
            places.push(entity);
          } else {
            // Could be either person or place, add to people for now
            if (entity.length < 50) {
              people.push(entity);
            }
          }
        }
        currentEntity = [];
        consecutiveCapitalized = 0;
      }
    }
  }

  return {
    people: [...new Set(people)],
    places: [...new Set(places)],
    organizations: [...new Set(organizations)],
  };
}

/**
 * Calculate text statistics
 */
export function getTextStatistics(text: string): {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  averageSentenceLength: number;
  readabilityScore: number;
} {
  const characterCount = text.length;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const averageWordLength = wordCount > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
    : 0;

  const averageSentenceLength = sentenceCount > 0
    ? wordCount / sentenceCount
    : 0;

  // Flesch Reading Ease score
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const readabilityScore = wordCount > 0 && sentenceCount > 0
    ? 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount)
    : 0;

  return {
    characterCount,
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordLength,
    averageSentenceLength,
    readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
  };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Extract summary sentences from text
 */
export function extractSummary(
  text: string,
  options: { maxSentences?: number; keyPhrases?: KeyPhrase[] } = {}
): string[] {
  const { maxSentences = 3, keyPhrases = [] } = options;

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length <= maxSentences) {
    return sentences;
  }

  // Score sentences based on position and key phrase overlap
  const scoredSentences = sentences.map((sentence, index) => {
    let score = 0;

    // Position: first and last sentences are more important
    if (index === 0 || index === sentences.length - 1) {
      score += 0.5;
    } else {
      score += 1 - Math.abs(index - sentences.length / 2) / (sentences.length / 2);
    }

    // Key phrase overlap
    if (keyPhrases.length > 0) {
      const lowerSentence = sentence.toLowerCase();
      for (const phrase of keyPhrases.slice(0, 5)) {
        if (lowerSentence.includes(phrase.text.toLowerCase())) {
          score += phrase.score * 0.3;
        }
      }
    }

    // Length preference (medium length sentences are better)
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 25) {
      score += 0.3;
    }

    return { sentence, score };
  });

  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map((s) => s.sentence);
}
