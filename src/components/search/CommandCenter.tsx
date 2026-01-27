import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalSearch, SearchResult, SearchQuery, SearchResultType } from "./GlobalSearch";
import { useDocumentStore } from "../../stores/documentStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useStudyDeckStore } from "../../stores/studyDeckStore";
import { useUIStore } from "../../stores/uiStore";
import { useExtractStore } from "../../stores/extractStore";
import { matchesDeckTags } from "../../utils/studyDecks";
import { calculateRelevanceScore, highlightSearchTerms } from "./SearchUtils";
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

    const isWeb = !isTauri();
    const maxResults = 50;
    const maxDocsToScan = isWeb ? 500 : Infinity;
    const maxExtractsToScan = isWeb ? 1000 : Infinity;

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

    const matchedCommands = allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(term) ||
      cmd.description?.toLowerCase().includes(term) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(term))
    );

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

        const titleMatch = doc.title.toLowerCase().includes(term);
        const content = doc.content ?? "";
        const contentMatch = !isWeb && content.toLowerCase().includes(term);
        if (!titleMatch && !contentMatch) continue;

        const excerptSource = contentMatch ? content : doc.title;
        const { excerpt, highlights } = highlightSearchTerms(excerptSource, query.query);
        const score = calculateRelevanceScore(
          { title: doc.title, content },
          query.query,
          SearchResultType.Document
        );

        results.push({
          id: doc.id,
          type: SearchResultType.Document,
          title: doc.title,
          excerpt: contentMatch ? excerpt : undefined,
          highlights,
          score: score / 100,
          metadata: {
            documentId: doc.id,
            fileType: doc.fileType,
            category: doc.category,
            tags: doc.tags ?? [],
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
        if (!content.toLowerCase().includes(term)) continue;
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
