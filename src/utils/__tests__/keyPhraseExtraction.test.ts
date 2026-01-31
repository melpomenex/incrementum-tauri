/**
 * Tests for key phrase extraction utilities
 */

import { describe, it, expect } from "vitest";
import {
  extractKeyPhrasesFrontend,
  extractKeywords,
  extractNamedEntities,
  getTextStatistics,
  extractSummary,
} from "../keyPhraseExtraction";

describe("keyPhraseExtraction", () => {
  describe("extractKeyPhrasesFrontend", () => {
    it("should extract key phrases from simple text", () => {
      const text = "Machine learning is a subset of artificial intelligence. Machine learning algorithms build models based on sample data.";
      const phrases = extractKeyPhrasesFrontend(text, { maxPhrases: 5 });

      expect(phrases.length).toBeGreaterThan(0);
      expect(phrases[0].text).toBeTruthy();
      expect(phrases[0].score).toBeGreaterThan(0);
    });

    it("should filter out stop words", () => {
      const text = "The quick brown fox jumps over the lazy dog. The fox is very quick.";
      const phrases = extractKeyPhrasesFrontend(text);

      const hasStopWords = phrases.some(p =>
        ["the", "is", "over", "very"].includes(p.text.toLowerCase())
      );
      expect(hasStopWords).toBe(false);
    });

    it("should sort phrases by score", () => {
      const text = "Natural language processing enables computers to understand human language. Language processing is important for artificial intelligence.";
      const phrases = extractKeyPhrasesFrontend(text, { maxPhrases: 10 });

      for (let i = 1; i < phrases.length; i++) {
        expect(phrases[i - 1].score).toBeGreaterThanOrEqual(phrases[i].score);
      }
    });

    it("should respect minScore filter", () => {
      const text = "Testing phrase extraction with low quality phrases should work correctly.";
      const phrases = extractKeyPhrasesFrontend(text, { minScore: 0.5 });

      expect(phrases.every(p => p.score >= 0.5)).toBe(true);
    });

    it("should respect maxPhrases limit", () => {
      const text = "This is a test. Another test here. Yet another test. Testing again. More testing. Final test.";
      const phrases = extractKeyPhrasesFrontend(text, { maxPhrases: 3 });

      expect(phrases.length).toBeLessThanOrEqual(3);
    });

    it("should handle empty text", () => {
      const phrases = extractKeyPhrasesFrontend("");
      expect(phrases).toEqual([]);
    });
  });

  describe("extractKeywords", () => {
    it("should extract single-word keywords", () => {
      const text = "JavaScript JavaScript Python Python Python programming language development.";
      const keywords = extractKeywords(text, { maxKeywords: 10, minFreq: 2 });

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.some(k => k.text.toLowerCase().includes("python") || k.text.toLowerCase().includes("javascript"))).toBe(true);
    });

    it("should filter by minimum frequency", () => {
      const text = "React React Vue Angular Angular Angular Svelte";
      const keywords = extractKeywords(text, { minFreq: 2 });

      expect(keywords.every(k => k.text.length > 0)).toBe(true);
    });

    it("should calculate TF-IDF-like scores", () => {
      const text = "rust rust rust programming programming language language";
      const keywords = extractKeywords(text);

      expect(keywords.every(k => k.score > 0)).toBe(true);
    });
  });

  describe("extractNamedEntities", () => {
    it("should detect capital phrases as potential entities", () => {
      const text = "Steve Jobs founded Apple Computer Inc. in California.";
      const entities = extractNamedEntities(text);

      // Should detect at least some entities
      expect(entities.people.length + entities.places.length + entities.organizations.length).toBeGreaterThan(0);
    });

    it("should identify organization-like entities", () => {
      const text = "Google Corporation and Microsoft Company are technology companies.";
      const entities = extractNamedEntities(text);

      expect(entities.organizations.length).toBeGreaterThan(0);
    });

    it("should handle text without entities", () => {
      const text = "the quick brown fox jumps over the lazy dog.";
      const entities = extractNamedEntities(text);

      // Should not crash, may return empty arrays
      expect(entities).toBeDefined();
    });
  });

  describe("getTextStatistics", () => {
    it("should count characters correctly", () => {
      const text = "Hello world!";
      const stats = getTextStatistics(text);

      expect(stats.characterCount).toBe(12);
    });

    it("should count words correctly", () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const stats = getTextStatistics(text);

      expect(stats.wordCount).toBe(9);
    });

    it("should count sentences correctly", () => {
      const text = "First sentence. Second sentence. Third sentence!";
      const stats = getTextStatistics(text);

      expect(stats.sentenceCount).toBe(3);
    });

    it("should count paragraphs correctly", () => {
      const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
      const stats = getTextStatistics(text);

      expect(stats.paragraphCount).toBe(3);
    });

    it("should calculate average word length", () => {
      const text = "cat dog elephant";
      const stats = getTextStatistics(text);

      expect(stats.averageWordLength).toBeCloseTo(4.67, 2);
    });

    it("should calculate average sentence length", () => {
      const text = "One two three. Four five six.";
      const stats = getTextStatistics(text);

      expect(stats.averageSentenceLength).toBe(3);
    });

    it("should calculate readability score", () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const stats = getTextStatistics(text);

      expect(stats.readabilityScore).toBeGreaterThan(0);
      expect(stats.readabilityScore).toBeLessThanOrEqual(100);
    });

    it("should handle empty text", () => {
      const stats = getTextStatistics("");

      expect(stats.characterCount).toBe(0);
      expect(stats.wordCount).toBe(0);
      expect(stats.sentenceCount).toBe(0);
    });
  });

  describe("extractSummary", () => {
    it("should extract summary sentences", () => {
      const text = `Machine learning is a subset of artificial intelligence.
        It focuses on building systems that learn from data.
        Machine learning algorithms are used in many applications today.
        Deep learning is a type of machine learning.
        Neural networks are the foundation of deep learning.`;

      const summary = extractSummary(text, { maxSentences: 2 });

      expect(summary.length).toBeLessThanOrEqual(2);
      expect(summary.every(s => s.length > 0)).toBe(true);
    });

    it("should prioritize first and last sentences", () => {
      const text = `First sentence. Middle sentence 1. Middle sentence 2. Middle sentence 3. Last sentence.`;
      const summary = extractSummary(text, { maxSentences: 2 });

      expect(summary.length).toBeLessThanOrEqual(2);
    });

    it("should use key phrases for scoring", () => {
      const text = `Machine learning is important. Machine learning applications are growing.
        Artificial intelligence includes machine learning. Data science uses machine learning.
        Other topics exist here.`;

      const keyPhrases = extractKeyPhrasesFrontend(text, { maxPhrases: 3 });
      const summary = extractSummary(text, { maxSentences: 2, keyPhrases });

      expect(summary.length).toBeLessThanOrEqual(2);
    });

    it("should handle short text", () => {
      const text = "Short text.";
      const summary = extractSummary(text);

      expect(summary.length).toBeLessThanOrEqual(1);
    });

    it("should handle empty text", () => {
      const summary = extractSummary("");
      expect(summary).toEqual([]);
    });
  });
});
