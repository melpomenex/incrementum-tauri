/**
 * ArXiv paper import functionality
 */

/**
 * ArXiv paper metadata
 */
export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  updated: string;
  pdfUrl: string;
  absUrl: string;
  categories: string[];
  comment?: string;
  journalRef?: string;
  doi?: string;
  primaryCategory: string;
}

/**
 * ArXiv API namespace
 */
const ARXIV_API = "http://export.arxiv.org/api/query";

/**
 * Search ArXiv for papers
 */
export async function searchArxiv(
  query: string,
  maxResults: number = 10
): Promise<ArxivPaper[]> {
  try {
    const searchQuery = `all:${query}`;
    const url = `${ARXIV_API}?search_query=${encodeURIComponent(
      searchQuery
    )}&start=0&max_results=${maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseArxivResponse(xmlText);
  } catch (error) {
    console.error("Failed to search ArXiv:", error);
    return [];
  }
}

/**
 * Get paper by ID
 */
export async function getArxivPaper(paperId: string): Promise<ArxivPaper | null> {
  try {
    const url = `${ARXIV_API}?id_list=${encodeURIComponent(paperId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const papers = parseArxivResponse(xmlText);
    return papers[0] || null;
  } catch (error) {
    console.error("Failed to fetch ArXiv paper:", error);
    return null;
  }
}

/**
 * Get recent papers from a category
 */
export async function getArxivCategoryPapers(
  category: string,
  maxResults: number = 20
): Promise<ArxivPaper[]> {
  try {
    const url = `${ARXIV_API}?search_query=cat:${encodeURIComponent(
      category
    )}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseArxivResponse(xmlText);
  } catch (error) {
    console.error("Failed to fetch ArXiv category papers:", error);
    return [];
  }
}

/**
 * Parse ArXiv API XML response
 */
function parseArxivResponse(xmlText: string): ArxivPaper[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const entries = xmlDoc.querySelectorAll("entry");
  const papers: ArxivPaper[] = [];

  entries.forEach((entry) => {
    const id = entry
      .querySelector("id")?.textContent?.split("/").pop() || "";
    const title = entry.querySelector("title")?.textContent?.trim() || "";
    const summary = entry.querySelector("summary")?.textContent?.trim() || "";
    const published = entry.querySelector("published")?.textContent || "";
    const updated = entry.querySelector("updated")?.textContent || "";

    // Authors
    const authors: string[] = [];
    entry.querySelectorAll("author name").forEach((name) => {
      if (name.textContent) {
        authors.push(name.textContent);
      }
    });

    // Categories
    const categories: string[] = [];
    const primaryCategory =
      entry.querySelector("primary_category")?.getAttribute("term") || "";
    entry.querySelectorAll("category").forEach((cat) => {
      const term = cat.getAttribute("term");
      if (term) {
        categories.push(term);
      }
    });

    // Links
    const pdfLink = entry.querySelector(`link[title="pdf"]`);
    const pdfUrl = pdfLink?.getAttribute("href") || "";
    const absLink = entry.querySelector("link");
    const absUrl = absLink?.getAttribute("href") || "";

    // Optional fields
    const comment = entry.querySelector("comment")?.textContent;
    const journalRef = entry.querySelector("journal_ref")?.textContent;
    const doi = entry.querySelector("doi")?.textContent;

    papers.push({
      id,
      title,
      authors,
      summary,
      published,
      updated,
      pdfUrl,
      absUrl,
      categories,
      comment,
      journalRef,
      doi,
      primaryCategory,
    });
  });

  return papers;
}

/**
 * Get ArXiv category display name
 */
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    "cs.AI": "Artificial Intelligence",
    "cs.CL": "Computation and Language",
    "cs.CV": "Computer Vision",
    "cs.LG": "Machine Learning",
    "cs.NE": "Neural and Evolutionary Computing",
    "stat.ML": "Machine Learning (Statistics)",
    "math.OC": "Optimization and Control",
    "q-bio": "Quantitative Biology",
    "physics": "Physics",
    "quant-ph": "Quantum Physics",
    "cond-mat": "Condensed Matter",
  };

  return categoryMap[category] || category;
}

/**
 * Popular ArXiv categories
 */
export const POPULAR_CATEGORIES = [
  { id: "cs.AI", name: "Artificial Intelligence" },
  { id: "cs.CL", name: "Computation and Language" },
  { id: "cs.CV", name: "Computer Vision" },
  { id: "cs.LG", name: "Machine Learning" },
  { id: "cs.NE", name: "Neural and Evolutionary Computing" },
  { id: "stat.ML", name: "Machine Learning (Statistics)" },
  { id: "cs.CR", name: "Cryptography and Security" },
  { id: "cs.DB", name: "Databases" },
  { id: "cs.IR", name: "Information Retrieval" },
  { id: "math.OC", name: "Optimization and Control" },
];

/**
 * Format authors list
 */
export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return "Unknown";
  if (authors.length <= 2) return authors.join(" and ");
  return `${authors[0]} et al.`;
}

/**
 * Format date for display
 */
export function formatArxivDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Extract paper ID from ArXiv URL
 */
export function extractArxivId(url: string): string | null {
  const patterns = [
    /arxiv\.org\/abs\/(\d+\.\d+)/,
    /arxiv\.org\/pdf\/(\d+\.\d+)/,
    /arxiv\.org\/format\/(\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get ArXiv PDF download URL
 */
export function getArxivPdfUrl(paperId: string): string {
  return `https://arxiv.org/pdf/${paperId}.pdf`;
}

/**
 * Save paper to library (placeholder for future implementation)
 */
export function savePaperToLibrary(paper: ArxivPaper): void {
  const saved = getSavedPapers();
  if (!saved.find((p) => p.id === paper.id)) {
    saved.push({
      ...paper,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem("arxiv_papers", JSON.stringify(saved));
  }
}

/**
 * Get saved papers
 */
export function getSavedPapers(): Array<ArxivPaper & { savedAt: string }> {
  const data = localStorage.getItem("arxiv_papers");
  return data ? JSON.parse(data) : [];
}

/**
 * Remove paper from library
 */
export function removePaperFromLibrary(paperId: string): void {
  const saved = getSavedPapers();
  const filtered = saved.filter((p) => p.id !== paperId);
  localStorage.setItem("arxiv_papers", JSON.stringify(filtered));
}

/**
 * Check if paper is saved
 */
export function isPaperSaved(paperId: string): boolean {
  const saved = getSavedPapers();
  return saved.some((p) => p.id === paperId);
}
