import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalSearch, SearchResult, SearchQuery, SearchResultType } from "./GlobalSearch";
import { useDocumentStore } from "../../stores/documentStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useStudyDeckStore } from "../../stores/studyDeckStore";
import { useUIStore } from "../../stores/uiStore";
import { useExtractStore } from "../../stores/extractStore";
import { matchesDeckTags } from "../../utils/studyDecks";
import { calculateRelevanceScore, extractSearchTerms, fuzzyMatch, highlightSearchTerms } from "./SearchUtils";
import { extractDocumentText, getDocuments as fetchDocuments } from "../../api/documents";
import { isTauri } from "../../lib/tauri";
import {
  DocumentViewer,
  DashboardTab,
  QueueTab,
  ReviewTab,
  DocumentsTab,
  AnalyticsTab,
  SettingsTab
} from "../../components/tabs/TabRegistry";
import { Command, CommandCategory, getDefaultCommands } from "../common/CommandPalette";
import {
  Plus,
  BookOpen,
  Layers,
  BarChart3,
  Settings,
  Home,
  Zap
} from "lucide-react";
import type { Document } from "../../types/document";
import type { StudyDeck } from "../../types/study-decks";
import type { TabsState } from "../../stores/tabsStore";
import type { UIState } from "../../stores/uiStore";
import type { StudyDeckState } from "../../stores/studyDeckStore";
import type { Extract } from "../../types/document";
import { fetchYouTubeTranscript } from "../../api/youtube";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "to",
  "us",
  "was",
  "we",
  "were",
  "will",
  "with",
  "you",
  "your",
]);

const SHORT_MEANINGFUL_TERMS = new Set(["ai", "ml", "ui", "ux", "vr", "ar", "3d"]);

const extractYouTubeId = (urlOrId: string): string => {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }

  return urlOrId;
};

const isMeaningfulTerm = (term: string): boolean => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.includes(" ")) {
    const parts = normalized.split(/\s+/).filter(Boolean);
    return parts.some((part) => !STOPWORDS.has(part));
  }

  if (STOPWORDS.has(normalized)) return false;
  if (/^\d+$/.test(normalized)) return normalized.length >= 2;
  if (normalized.length >= 3) return true;

  return SHORT_MEANINGFUL_TERMS.has(normalized);
};

const buildTranscriptText = (segments: Array<{ text: string }>): string =>
  segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

// Stable selectors defined outside component to avoid infinite re-renders
const selectAddTab = (state: TabsState) => state.addTab;
const selectActiveDeckId = (state: StudyDeckState) => state.activeDeckId;
const selectCommandPaletteOpen = (state: UIState) => state.commandPaletteOpen;
const selectSetCommandPaletteOpen = (state: UIState) => state.setCommandPaletteOpen;
const selectDocuments = (state: { documents: Document[] }) => state.documents;
const selectDocumentsLoading = (state: { isLoading: boolean }) => state.isLoading;
const selectLoadDocuments = (state: { loadDocuments: () => Promise<void> }) => state.loadDocuments;
const selectDecks = (state: { decks: StudyDeck[] }) => state.decks;
const selectExtracts = (state: { extracts: Extract[] }) => state.extracts;
const selectExtractsLoading = (state: { isLoading: boolean }) => state.isLoading;
const selectLoadExtracts = (state: { loadExtracts: (documentId?: string) => Promise<void> }) =>
  state.loadExtracts;

export function CommandCenter() {
  const documents = useDocumentStore(selectDocuments);
  const documentsLoading = useDocumentStore(selectDocumentsLoading);
  const loadDocuments = useDocumentStore(selectLoadDocuments);
  const addTab = useTabsStore(selectAddTab);
  const decks = useStudyDeckStore(selectDecks);
  const activeDeckId = useStudyDeckStore(selectActiveDeckId);
  const commandPaletteOpen = useUIStore(selectCommandPaletteOpen);
  const setCommandPaletteOpen = useUIStore(selectSetCommandPaletteOpen);
  const extracts = useExtractStore(selectExtracts);
  const extractsLoading = useExtractStore(selectExtractsLoading);
  const loadExtracts = useExtractStore(selectLoadExtracts);
  const indexedDocsRef = useRef<Set<string>>(new Set());
  const indexingRef = useRef(false);
  const documentsSnapshotRef = useRef<Document[]>([]);
  const documentsFetchInFlight = useRef<Promise<Document[]> | null>(null);
  const transcriptCacheRef = useRef<Map<string, { text: string; lower: string }>>(new Map());
  const transcriptFetchInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!documentsLoading && documents.length === 0) {
      void loadDocuments();
    }
  }, [documents.length, documentsLoading, loadDocuments]);

  useEffect(() => {
    if (documents.length > 0) {
      documentsSnapshotRef.current = documents;
    }
  }, [documents]);

  useEffect(() => {
    if (commandPaletteOpen && !extractsLoading && extracts.length === 0) {
      void loadExtracts();
    }
  }, [commandPaletteOpen, extracts.length, extractsLoading, loadExtracts]);

  useEffect(() => {
    if (!commandPaletteOpen || documents.length === 0) return;
    if (indexingRef.current) return;
    if (!isTauri()) return;

    const missingContent = documents.filter((doc) =>
      !indexedDocsRef.current.has(doc.id) &&
      (!doc.content || doc.content.trim().length === 0) &&
      (doc.fileType === "pdf" || doc.fileType === "epub" || doc.fileType === "html")
    );
    if (missingContent.length === 0) return;

    let cancelled = false;
    indexingRef.current = true;
    const run = async () => {
      for (const doc of missingContent) {
        try {
          await extractDocumentText(doc.id);
        } catch (error) {
          console.warn("[CommandCenter] Failed to extract document text", doc.id, error);
        } finally {
          indexedDocsRef.current.add(doc.id);
        }
      }
    };
    void run().finally(() => {
      if (!cancelled) {
        indexingRef.current = false;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [commandPaletteOpen, documents]);

  const activeDeck = useMemo(
    () => decks.find((item) => item.id === activeDeckId) ?? null,
    [decks, activeDeckId]
  );
  const activeDeckTags = useMemo(
    () => activeDeck?.tagFilters ?? [],
    [activeDeck]
  );
  const shouldFilterByDeck = false;

  const handleSearch = useCallback(async (query: SearchQuery): Promise<SearchResult[]> => {
    const term = query.query.toLowerCase().trim();
    const results: SearchResult[] = [];
    if (!term) return results;

    const queryTerms = extractSearchTerms(query.query)
      .map((item) => item.toLowerCase().trim())
      .filter(Boolean);
    const meaningfulTerms = queryTerms.filter(isMeaningfulTerm);
    const searchTerms = meaningfulTerms.length > 0 ? meaningfulTerms : [term];
    const allowContentSearch = meaningfulTerms.length > 0;

    const matchesTerms = (text: string, terms: string[]): boolean =>
      terms.some((value) => text.includes(value));

    const fuzzyMatches = (text: string): boolean => {
      if (!allowContentSearch) return false;
      if (term.length < 3) return false;
      if (text.length > 80) return false;
      const { match, score } = fuzzyMatch(text, term, 2);
      return match && score >= 0.6;
    };

    const isWeb = !isTauri();
    const maxResults = 50;
    const maxDocsToScan = isWeb ? 500 : Infinity;
    const maxExtractsToScan = isWeb ? 1000 : Infinity;
    const maxTranscriptFetches = isWeb ? 5 : 20;
    let transcriptFetches = 0;

    let docsForSearch = documents.length > 0 ? documents : documentsSnapshotRef.current;
    if (docsForSearch.length === 0 && !documentsLoading) {
      if (!documentsFetchInFlight.current) {
        documentsFetchInFlight.current = fetchDocuments().catch((error) => {
          console.warn("[CommandCenter] Failed to fetch documents for search", error);
          return [];
        });
      }
      docsForSearch = await documentsFetchInFlight.current;
      documentsFetchInFlight.current = null;
      if (docsForSearch.length > 0) {
        documentsSnapshotRef.current = docsForSearch;
      }
    }

    // 1. Search Commands
    const navigationCommands: Command[] = [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "Navigate to the dashboard",
        icon: <Home className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Dashboard",
          icon: "📊",
          type: "dashboard",
          content: DashboardTab,
          closable: false,
        }),
        keywords: ["home", "main"],
      },
      {
        id: "nav-documents",
        label: "Go to Documents",
        description: "View all documents",
        icon: <BookOpen className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Documents",
          icon: "📂",
          type: "documents",
          content: DocumentsTab,
          closable: true,
        }),
        keywords: ["library", "files"],
      },
      {
        id: "nav-queue",
        label: "Go to Queue",
        description: "View reading queue",
        icon: <Layers className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Queue",
          icon: "📚",
          type: "queue",
          content: QueueTab,
          closable: true,
        }),
        keywords: ["list", "reading"],
      },
      {
        id: "nav-analytics",
        label: "Go to Statistics",
        description: "View learning statistics",
        icon: <BarChart3 className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Statistics",
          icon: "📈",
          type: "analytics",
          content: AnalyticsTab,
          closable: true,
        }),
        keywords: ["stats", "progress"],
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        description: "View application settings",
        icon: <Settings className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Settings",
          icon: "⚙️",
          type: "settings",
          content: SettingsTab,
          closable: true,
        }),
        keywords: ["config", "preferences"],
      },
      {
        id: "nav-review",
        label: "Start Review",
        description: "Start a review session",
        icon: <Zap className="w-4 h-4" />,
        category: CommandCategory.Navigation,
        action: () => addTab({
          title: "Review",
          icon: "🧠",
          type: "review",
          content: ReviewTab,
          closable: true,
        }),
        keywords: ["review", "study"],
      },
    ];

    const allCommands = [...getDefaultCommands(), ...navigationCommands];

    const matchedCommands = allCommands.filter((cmd) => {
      const label = cmd.label.toLowerCase();
      const description = cmd.description?.toLowerCase() ?? "";
      const keywords = cmd.keywords?.map((keyword) => keyword.toLowerCase()) ?? [];
      const termMatch = matchesTerms(label, searchTerms) || matchesTerms(description, searchTerms);
      const keywordMatch = keywords.some((keyword) => matchesTerms(keyword, searchTerms));

      if (termMatch || keywordMatch) return true;
      return fuzzyMatches(label) || (description ? fuzzyMatches(description) : false);
    });

    matchedCommands.forEach(cmd => {
      results.push({
        id: `cmd-${cmd.id}`,
        type: SearchResultType.Command,
        title: cmd.label,
        excerpt: cmd.description,
        score: 1,
        metadata: {
          // Store the action in a way we can retrieve it
          action: cmd.action
        } as any
      });
    });

    // 2. Search Documents
    // If types filter is set and doesn't include Document, skip
    if (!query.types || query.types.includes(SearchResultType.Document)) {
      const scopedDocs = docsForSearch;
      let scanned = 0;
      for (const doc of scopedDocs) {
        if (scanned >= maxDocsToScan || results.length >= maxResults) break;
        scanned += 1;

        const titleLower = doc.title.toLowerCase();
        const titleMatch = matchesTerms(titleLower, searchTerms) || (!allowContentSearch && titleLower.includes(term)) || fuzzyMatches(titleLower);
        const content = doc.content ?? "";
        const contentLower = content.toLowerCase();
        const contentMatch = !isWeb && allowContentSearch && matchesTerms(contentLower, searchTerms);

        let transcriptMatch = false;
        let transcriptText: string | null = null;
        if (allowContentSearch && doc.fileType === "youtube" && results.length < maxResults) {
          const cached = transcriptCacheRef.current.get(doc.id);
          if (cached) {
            transcriptMatch = matchesTerms(cached.lower, searchTerms);
            transcriptText = cached.text;
          } else if (!transcriptFetchInFlightRef.current.has(doc.id) && transcriptFetches < maxTranscriptFetches) {
            transcriptFetchInFlightRef.current.add(doc.id);
            transcriptFetches += 1;
            try {
              const videoId = extractYouTubeId(doc.filePath);
              if (videoId) {
                const segments = await fetchYouTubeTranscript(videoId);
                if (segments.length > 0) {
                  const text = buildTranscriptText(segments);
                  if (text) {
                    const entry = { text, lower: text.toLowerCase() };
                    transcriptCacheRef.current.set(doc.id, entry);
                    transcriptMatch = matchesTerms(entry.lower, searchTerms);
                    transcriptText = entry.text;
                  }
                }
              }
            } catch (error) {
              console.warn("[CommandCenter] Failed to fetch YouTube transcript", doc.id, error);
            } finally {
              transcriptFetchInFlightRef.current.delete(doc.id);
            }
          }
        }

        if (!titleMatch && !contentMatch && !transcriptMatch) continue;

        const excerptSource = transcriptMatch && transcriptText
          ? transcriptText
          : contentMatch
            ? content
            : doc.title;
        const { excerpt, highlights } = highlightSearchTerms(excerptSource, query.query);
        const score = calculateRelevanceScore(
          { title: doc.title, content: transcriptMatch && transcriptText ? transcriptText : content },
          query.query,
          SearchResultType.Document
        );

        results.push({
          id: doc.id,
          type: SearchResultType.Document,
          title: doc.title,
          excerpt: transcriptMatch
            ? `Transcript — ${excerpt}`
            : contentMatch
              ? excerpt
              : undefined,
          highlights,
          score: score / 100,
          metadata: {
            documentId: doc.id,
            fileType: doc.fileType,
            category: doc.category,
            tags: doc.tags ?? [],
            transcriptMatch,
          },
        });
      }
    }

    // 3. Search Extracts (full content search)
    if (!query.types || query.types.includes(SearchResultType.Extract)) {
      let scanned = 0;
      for (const extract of extracts) {
        if (scanned >= maxExtractsToScan || results.length >= maxResults) break;
        scanned += 1;

        const content = extract.content ?? "";
        const contentLower = content.toLowerCase();
        if (!allowContentSearch || !matchesTerms(contentLower, searchTerms)) continue;
        const parentDoc = documents.find((doc) => doc.id === extract.documentId);
        const { excerpt, highlights } = highlightSearchTerms(content, query.query);
        const prefix = extract.pageNumber ? `Page ${extract.pageNumber} — ` : "";

        results.push({
          id: extract.id,
          type: SearchResultType.Extract,
          title: extract.pageTitle || parentDoc?.title || "Extract",
          excerpt: `${prefix}${excerpt}`,
          highlights,
          score: calculateRelevanceScore(
            { title: extract.pageTitle || parentDoc?.title || "Extract", content },
            query.query,
            SearchResultType.Extract
          ) / 100,
          metadata: {
            documentId: extract.documentId,
            tags: extract.tags ?? [],
            category: extract.category,
          },
        });
      }
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }, [documents, extracts, addTab, activeDeck, shouldFilterByDeck]);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.type === SearchResultType.Command) {
      const action = (result.metadata as any)?.action;
      if (typeof action === 'function') {
        action();
      }
    } else if (result.type === SearchResultType.Document || result.type === SearchResultType.Extract) {
      // Open document in tab
      // We need the full document object, find it in store
      const docId = result.type === SearchResultType.Extract
        ? (result.metadata as any)?.documentId
        : result.id;
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        addTab({
          title: doc.title,
          icon: doc.fileType === "pdf" ? "📕" : doc.fileType === "epub" ? "📖" : doc.fileType === "youtube" ? "📺" : "📄",
          type: "document-viewer",
          content: DocumentViewer,
          closable: true,
          data: { documentId: doc.id },
        });
      }
    }
  }, [documents, addTab]);

  useEffect(() => {
    const handleToggle = () => {
      const { commandPaletteOpen: isOpen } = useUIStore.getState();
      setCommandPaletteOpen(!isOpen);
    };

    window.addEventListener("command-palette-toggle", handleToggle as EventListener);
    return () => window.removeEventListener("command-palette-toggle", handleToggle as EventListener);
  }, [setCommandPaletteOpen]);

  return (
    <GlobalSearch
      onSearch={handleSearch}
      onResultClick={handleResultClick}
      hideTrigger={true}
      isOpen={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    />
  );
}
