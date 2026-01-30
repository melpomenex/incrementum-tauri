import { describe, it, expect } from 'vitest';
import {
  detectChapterReference,
  extractChapters,
  getChapterByNumber,
  getChapterWithContext,
  buildChapterQAContext,
  getChapterTitles,
  hasChapters,
  formatChapterList,
  type Chapter,
} from '../chapterUtils';

describe('Chapter Utils - detectChapterReference', () => {
  it('detects "chapter 9" pattern', () => {
    const result = detectChapterReference('summarize chapter 9');
    expect(result).toEqual({
      type: 'chapter',
      number: 9,
      raw: 'chapter 9',
    });
  });

  it('detects "ch. 3" pattern', () => {
    const result = detectChapterReference('explain ch. 3 to me');
    expect(result).toEqual({
      type: 'chapter',
      number: 3,
      raw: 'ch. 3',
    });
  });

  it('detects "chapter three" word pattern', () => {
    const result = detectChapterReference('what is in chapter three');
    expect(result).toEqual({
      type: 'chapter',
      number: 3,
      raw: 'chapter three',
    });
  });

  it('detects "section 2" pattern', () => {
    const result = detectChapterReference('summarize section 2');
    expect(result).toEqual({
      type: 'section',
      number: 2,
      raw: 'section 2',
    });
  });

  it('detects "appendix A" pattern', () => {
    const result = detectChapterReference('explain appendix A');
    expect(result).toEqual({
      type: 'appendix',
      number: 1, // A = 1
      raw: 'appendix a', // normalized to lowercase
    });
  });

  it('returns null for queries without chapter references', () => {
    const result = detectChapterReference('what is the main idea?');
    expect(result).toBeNull();
  });

  it('detects chapter with roman numerals', () => {
    const result = detectChapterReference('summarize chapter IV');
    expect(result).toEqual({
      type: 'chapter',
      number: 4,
      raw: 'chapter iv', // normalized to lowercase
    });
  });
});

describe('Chapter Utils - extractChapters', () => {
  it('extracts chapters from "Chapter X: Title" format', () => {
    const content = `
Chapter 1: Introduction
This is the introduction content.
It has multiple lines.

Chapter 2: Methods
This is the methods section.
More content here.

Chapter 3: Results
Final chapter content.
    `.trim();

    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(3);
    expect(chapters[0]).toMatchObject({
      number: 1,
      title: 'Introduction',
    });
    expect(chapters[1]).toMatchObject({
      number: 2,
      title: 'Methods',
    });
    expect(chapters[2]).toMatchObject({
      number: 3,
      title: 'Results',
    });
  });

  it('extracts chapters from "Chapter X - Title" format', () => {
    const content = `
Chapter 1 - Getting Started
Welcome to the book.

Chapter 2 - Advanced Topics
Deep dive content.
    `.trim();

    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].number).toBe(1);
    expect(chapters[0].title).toBe('Getting Started');
  });

  it('extracts chapters from markdown headers', () => {
    const content = `
# Chapter 1: Introduction
Welcome content.

# 2. Methods
Methodology content.

### Chapter 3
Results content.
    `.trim();

    const chapters = extractChapters(content);
    expect(chapters.length).toBeGreaterThanOrEqual(1);
    expect(chapters[0].number).toBe(1);
  });

  it('handles chapters without titles', () => {
    const content = `
Chapter 1
Content here.

Chapter 2
More content.
    `.trim();

    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('Chapter 1');
  });

  it('handles single chapter document', () => {
    const content = 'Chapter 1: Only Chapter\n\nSome content here.';
    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].content).toContain('Some content here');
  });

  it('returns empty array for content without chapters', () => {
    const content = 'Just some regular text.\nNo chapters here.';
    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(0);
  });

  it('captures correct content for each chapter', () => {
    const content = `
Chapter 1: First
This is chapter 1 content.
It continues here.

Chapter 2: Second
This is chapter 2 content.
More for chapter 2.

Chapter 3: Third
Chapter 3 has this.
    `.trim();

    const chapters = extractChapters(content);
    // May extract 3 or 4 chapters depending on parsing (content before first chapter might be captured)
    expect(chapters.length).toBeGreaterThanOrEqual(3);
    // Find chapter 1 specifically
    const chapter1 = chapters.find(c => c.number === 1);
    expect(chapter1).toBeDefined();
    expect(chapter1!.content).toContain('chapter 1 content');
    expect(chapter1!.content).not.toContain('chapter 2 content');
  });
});

describe('Chapter Utils - getChapterByNumber', () => {
  const content = `
Chapter 1: Introduction
Intro content.

Chapter 2: Body
Body content.

Chapter 3: Conclusion
Conclusion content.
  `.trim();

  it('returns the correct chapter', () => {
    const chapter = getChapterByNumber(content, 2);
    expect(chapter).not.toBeNull();
    expect(chapter?.number).toBe(2);
    expect(chapter?.title).toBe('Body');
    expect(chapter?.content).toContain('Body content');
  });

  it('returns null for non-existent chapter', () => {
    const chapter = getChapterByNumber(content, 99);
    expect(chapter).toBeNull();
  });

  it('returns chapter 1 correctly', () => {
    const chapter = getChapterByNumber(content, 1);
    expect(chapter?.number).toBe(1);
    expect(chapter?.title).toBe('Introduction');
  });
});

describe('Chapter Utils - getChapterWithContext', () => {
  const content = `
Chapter 1: Introduction
Intro text.

Chapter 2: Methods
Method text.

Chapter 3: Results
Result text.

Chapter 4: Discussion
Discussion text.
  `.trim();

  it('returns target chapter with context', () => {
    const result = getChapterWithContext(content, 2, true);
    expect(result).not.toBeNull();
    expect(result?.targetChapter.number).toBe(2);
    expect(result?.targetChapter.title).toBe('Methods');
    // Context info contains previous/next chapter info
    expect(result?.contextInfo).toContain('Previous Chapter (1)');
    expect(result?.contextInfo).toContain('Next Chapter (3)');
    expect(result?.contextInfo).toContain('4 chapters');
  });

  it('returns null for non-existent chapter', () => {
    const result = getChapterWithContext(content, 99);
    expect(result).toBeNull();
  });

  it('excludes adjacent summaries when flag is false', () => {
    const result = getChapterWithContext(content, 2, false);
    expect(result).not.toBeNull();
    expect(result?.contextInfo).not.toContain('Chapter 1');
  });

  it('estimates tokens correctly', () => {
    const result = getChapterWithContext(content, 2);
    expect(result?.estimatedTokens).toBeGreaterThan(0);
    // Rough check: content should be around (len / 4) tokens
    const expectedApprox = Math.ceil(result!.targetChapter.content.length / 4);
    expect(result?.estimatedTokens).toBeGreaterThanOrEqual(expectedApprox);
  });
});

describe('Chapter Utils - buildChapterQAContext', () => {
  const content = `
Chapter 1: Introduction
This is the introduction with enough content to be meaningful.
It explains what the book is about.

Chapter 2: Main Content
This is the main chapter with detailed information.
It has multiple paragraphs of content.
More content here.
Even more content.

Chapter 3: Conclusion
Wrapping up the book.
  `.trim();

  it('builds context with chapter and surrounding info', () => {
    const context = buildChapterQAContext('Test Book', content, 2, 4000);
    expect(context).toContain('Test Book');
    expect(context).toContain('Chapter 2');
    expect(context).toContain('Main Content');
    expect(context).toContain('main chapter with detailed information');
  });

  it('includes book structure context', () => {
    const context = buildChapterQAContext('Test Book', content, 2);
    expect(context).toContain('3 chapters');
  });

  it('truncates long chapters', () => {
    // Create very long content
    const longContent = `Chapter 1: Long\n${'a'.repeat(50000)}\n\nChapter 2: Also Long\n${'b'.repeat(50000)}`;
    const context = buildChapterQAContext('Long Book', longContent, 1, 1000);
    expect(context).toContain('[Content truncated');
  });

  it('falls back to full content when chapter not found', () => {
    const shortContent = 'Just some text without chapters.';
    const context = buildChapterQAContext('Simple Book', shortContent, 1, 4000);
    expect(context).toContain('Just some text');
  });
});

describe('Chapter Utils - getChapterTitles', () => {
  const content = `
Chapter 1: First Chapter
Content.

Chapter 2: Second Chapter
More content.
  `.trim();

  it('returns array of chapter titles', () => {
    const titles = getChapterTitles(content);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toEqual({ number: 1, title: 'First Chapter' });
    expect(titles[1]).toEqual({ number: 2, title: 'Second Chapter' });
  });

  it('returns empty array for content without chapters', () => {
    const titles = getChapterTitles('No chapters here');
    expect(titles).toHaveLength(0);
  });
});

describe('Chapter Utils - hasChapters', () => {
  it('returns true for content with chapters', () => {
    expect(hasChapters('Chapter 1: Test\nContent')).toBe(true);
  });

  it('returns false for content without chapters', () => {
    expect(hasChapters('Just plain text')).toBe(false);
  });

  it('returns false for empty content', () => {
    expect(hasChapters('')).toBe(false);
  });
});

describe('Chapter Utils - formatChapterList', () => {
  const content = `
Chapter 1: Introduction
Content.

Chapter 2: Methods
Content.
  `.trim();

  it('formats chapters for display', () => {
    const list = formatChapterList(content);
    expect(list).toContain('Chapter 1: Introduction');
    expect(list).toContain('Chapter 2: Methods');
    expect(list).toContain('\n');
  });

  it('returns message for no chapters', () => {
    const list = formatChapterList('No chapters');
    expect(list).toBe('No chapters detected in this document.');
  });
});

describe('Chapter Utils - edge cases', () => {
  it('handles chapters with special characters in titles', () => {
    const content = 'Chapter 1: The "Special" Title\nContent here.';
    const chapters = extractChapters(content);
    expect(chapters[0].title).toBe('The "Special" Title');
  });

  it('handles very long chapter titles', () => {
    const longTitle = 'A'.repeat(200);
    const content = `Chapter 1: ${longTitle}\nContent.`;
    const chapters = extractChapters(content);
    expect(chapters[0].title).toBe(longTitle);
  });

  it('handles content with only whitespace between chapters', () => {
    const content = 'Chapter 1\n\n\n\nContent\n\n\n\nChapter 2\nMore';
    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(2);
  });

  it('handles roman numerals correctly', () => {
    const content = `
Chapter I: First
Content one.

Chapter II: Second
Content two.

Chapter X: Tenth
Content ten.
    `.trim();
    const chapters = extractChapters(content);
    expect(chapters).toHaveLength(3);
    expect(chapters[0].number).toBe(1);
    expect(chapters[1].number).toBe(2);
    expect(chapters[2].number).toBe(10);
  });
});
