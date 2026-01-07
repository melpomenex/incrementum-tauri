/**
 * Search utilities and helpers
 * Highlighting, fuzzy matching, operators, and scoring
 */

import { SearchResult, SearchResultType, SearchQuery, SearchOperator } from "./GlobalSearch";

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(
  text: string,
  query: string,
  maxLength: number = 200
): { excerpt: string; highlights: string[] } {
  if (!query.trim()) {
    return {
      excerpt: text.slice(0, maxLength) + (text.length > maxLength ? "..." : ""),
      highlights: [],
    };
  }

  const searchTerms = extractSearchTerms(query);
  const highlights: string[] = [];

  // Find all matches with context
  const matches: Array<{ index: number; length: number; term: string }> = [];

  searchTerms.forEach((term) => {
    const regex = new RegExp(escapeRegex(term), "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        term: match[0],
      });
      if (!highlights.includes(match[0])) {
        highlights.push(match[0]);
      }
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Generate excerpt with highlights
  if (matches.length === 0) {
    return {
      excerpt: text.slice(0, maxLength) + (text.length > maxLength ? "..." : ""),
      highlights: [],
    };
  }

  // Get best excerpt (around first match or most dense matches)
  const contextLength = 50;
  let bestStart = matches[0].index;
  let bestScore = 1;

  for (let i = 0; i < matches.length; i++) {
    const start = Math.max(0, matches[i].index - contextLength);
    const end = Math.min(
      text.length,
      matches[i].index + matches[i].length + contextLength
    );

    // Count matches in this window
    const score = matches.filter(
      (m) => m.index >= start && m.index + m.length <= end
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  // Create excerpt
  const excerptStart = Math.max(0, bestStart - contextLength);
  const excerptEnd = Math.min(
    text.length,
    bestStart + maxLength - contextLength * 2
  );

  let excerpt = text.slice(excerptStart, excerptEnd);

  // Add ellipsis if needed
  if (excerptStart > 0) excerpt = "..." + excerpt;
  if (excerptEnd < text.length) excerpt = excerpt + "...";

  // Apply highlighting
  searchTerms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    excerpt = excerpt.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  });

  return { excerpt, highlights };
}

/**
 * Extract search terms from query
 */
export function extractSearchTerms(query: string): string[] {
  // Remove operators and extract terms
  const terms: string[] = [];

  // Handle quoted phrases
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    terms.push(match[1]);
  }

  // Remove phrases from query
  const queryWithoutPhrases = query.replace(/"[^"]+"/g, "");

  // Split remaining query by whitespace and operators
  const tokens = queryWithoutPhrases
    .split(/\s+/)
    .filter((t) => t && !t.startsWith("-") && !t.startsWith("+") && t !== "AND" && t !== "OR" && t !== "NOT");

  terms.push(...tokens);

  return terms.filter((t) => t.length > 0);
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate search relevance score
 */
export function calculateRelevanceScore(
  result: Pick<SearchResult, "title" | "content">,
  query: string,
  type: SearchResultType
): number {
  const searchTerms = extractSearchTerms(query.toLowerCase());
  const titleLower = result.title.toLowerCase();
  const contentLower = (result.content || "").toLowerCase();

  let score = 0;

  searchTerms.forEach((term) => {
    // Title matches are worth more
    const titleMatches = (titleLower.match(new RegExp(escapeRegex(term), "g")) || []).length;
    score += titleMatches * 10;

    // Exact title match bonus
    if (titleLower === term) score += 50;

    // Start of title match bonus
    if (titleLower.startsWith(term)) score += 20;

    // Content matches
    const contentMatches = (contentLower.match(new RegExp(escapeRegex(term), "g")) || []).length;
    score += contentMatches * 1;

    // Phrase match bonus
    if (titleLower.includes(term) || contentLower.includes(term)) {
      score += 5;
    }
  });

  // Type-specific weighting
  const typeWeights: Record<SearchResultType, number> = {
    [SearchResultType.Document]: 1.0,
    [SearchResultType.Extract]: 1.2,
    [SearchResultType.Flashcard]: 1.5,
    [SearchResultType.Category]: 0.8,
    [SearchResultType.Tag]: 0.5,
  };

  score *= typeWeights[type];

  return Math.min(score, 100);
}

/**
 * Fuzzy match using Levenshtein distance
 */
export function fuzzyMatch(
  text: string,
  pattern: string,
  maxDistance: number = 2
): { match: boolean; score: number } {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  if (patternLower === textLower) {
    return { match: true, score: 1.0 };
  }

  if (patternLower.length === 0) {
    return { match: false, score: 0 };
  }

  const distance = levenshteinDistance(textLower, patternLower);
  const maxLen = Math.max(textLower.length, patternLower.length);
  const normalizedDistance = distance / maxLen;

  return {
    match: distance <= maxDistance,
    score: 1 - normalizedDistance,
  };
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Apply search operators to query
 */
export function applySearchOperators(query: string): SearchQuery {
  const operators: SearchOperator[] = [];
  let processedQuery = query;

  // Handle NOT operator (-term)
  const notMatches = query.match(/-(\S+)/g);
  if (notMatches) {
    notMatches.forEach((match) => {
      const term = match.slice(1);
      operators.push({ type: "not", value: term });
      processedQuery = processedQuery.replace(match, "");
    });
  }

  // Handle AND/OR operators
  const orMatches = query.match(/(\S+)\s+OR\s+(\S+)/gi);
  if (orMatches) {
    orMatches.forEach((match) => {
      const [left, right] = match.split(/\s+OR\s+/i);
      operators.push({ type: "or", value: `${left} ${right}` });
      processedQuery = processedQuery.replace(match, left);
    });
  }

  // Handle quoted phrases
  const phraseMatches = query.match(/"([^"]+)"/g);
  if (phraseMatches) {
    phraseMatches.forEach((match) => {
      const phrase = match.slice(1, -1);
      operators.push({ type: "phrase", value: phrase });
    });
  }

  // Handle wildcard (*)
  if (query.includes("*")) {
    operators.push({
      type: "wildcard",
      value: query.replace(/\*/g, ".*"),
    });
  }

  return {
    query: processedQuery.trim(),
    operators: operators.length > 0 ? operators : undefined,
  };
}

/**
 * Filter results by search operators
 */
export function applyOperatorFilters(
  results: SearchResult[],
  operators: SearchOperator[]
): SearchResult[] {
  return results.filter((result) => {
    return operators.every((op) => {
      const content = `${result.title} ${result.content || ""}`.toLowerCase();

      switch (op.type) {
        case "not":
          return !content.includes(op.value.toLowerCase());

        case "phrase":
          return content.includes(op.value.toLowerCase());

        case "wildcard":
          const regex = new RegExp(`^${op.value}$`, "i");
          return regex.test(content);

        default:
          return true;
      }
    });
  });
}

/**
 * Generate search suggestions
 */
export function generateSuggestions(
  query: string,
  recentSearches: string[],
  popularSearches: string[],
  categories: string[]
): string[] {
  const suggestions: string[] = [];
  const queryLower = query.toLowerCase();

  // Add matching recent searches
  recentSearches
    .filter((s) => s.toLowerCase().startsWith(queryLower))
    .slice(0, 3)
    .forEach((s) => suggestions.push(s));

  // Add matching popular searches
  popularSearches
    .filter((s) => s.toLowerCase().startsWith(queryLower))
    .slice(0, 3)
    .forEach((s) => suggestions.push(s));

  // Add matching categories
  categories
    .filter((c) => c.toLowerCase().startsWith(queryLower))
    .slice(0, 2)
    .forEach((c) => suggestions.push(`category:${c}`));

  return suggestions;
}

/**
 * Parse advanced search syntax
 */
export interface AdvancedSearchQuery {
  text?: string;
  title?: string;
  content?: string;
  tag?: string[];
  category?: string[];
  type?: SearchResultType[];
  before?: Date;
  after?: Date;
}

export function parseAdvancedSearch(query: string): AdvancedSearchQuery {
  const result: AdvancedSearchQuery = {};

  // Parse type: filter
  const typeMatch = query.match(/type:(\w+)/i);
  if (typeMatch) {
    result.type = [typeMatch[1] as SearchResultType];
  }

  // Parse tag: filter
  const tagMatches = query.match(/tag:(\w+)/gi);
  if (tagMatches) {
    result.tag = tagMatches.map((m) => m.split(":")[1]);
  }

  // Parse category: filter
  const categoryMatches = query.match(/category:(\w+)/gi);
  if (categoryMatches) {
    result.category = categoryMatches.map((m) => m.split(":")[1]);
  }

  // Parse title: filter
  const titleMatch = query.match(/title:(.+)/i);
  if (titleMatch) {
    result.title = titleMatch[1];
  }

  // Parse content: filter
  const contentMatch = query.match(/content:(.+)/i);
  if (contentMatch) {
    result.content = contentMatch[1];
  }

  // Parse before/after dates
  const beforeMatch = query.match(/before:(.+)/i);
  if (beforeMatch) {
    result.before = new Date(beforeMatch[1]);
  }

  const afterMatch = query.match(/after:(.+)/i);
  if (afterMatch) {
    result.after = new Date(afterMatch[1]);
  }

  // Remaining text is general search
  let remainingQuery = query;
  [
    ...tagMatches,
    ...categoryMatches,
    typeMatch,
    titleMatch,
    contentMatch,
    beforeMatch,
    afterMatch,
  ].forEach((match) => {
    if (match) remainingQuery = remainingQuery.replace(match, "");
  });

  result.text = remainingQuery.trim() || undefined;

  return result;
}

/**
 * Create search query object from advanced syntax
 */
export function createSearchQuery(
  query: string,
  advanced?: AdvancedSearchQuery
): SearchQuery {
  return {
    query: advanced?.text || query,
    types: advanced?.type,
    tags: advanced?.tag,
    categories: advanced?.category,
    dateRange:
      advanced?.before || advanced?.after
        ? {
            start: advanced.after || new Date(0),
            end: advanced.before || new Date(),
          }
        : undefined,
  };
}

/**
 * Rank and sort search results
 */
export function rankSearchResults(
  results: SearchResult[],
  query: string
): SearchResult[] {
  return results
    .map((result) => ({
      ...result,
      score: calculateRelevanceScore(result, query, result.type),
    }))
    .sort((a, b) => b.score - a.score);
}
