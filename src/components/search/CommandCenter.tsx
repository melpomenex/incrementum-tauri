import { useCallback, useEffect, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { GlobalSearch, SearchResult, SearchQuery, SearchResultType } from "./GlobalSearch";
import { useDocumentStore } from "../../stores/documentStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useStudyDeckStore } from "../../stores/studyDeckStore";
import { useUIStore } from "../../stores/uiStore";
import { matchesDeckTags } from "../../utils/studyDecks";
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

export function CommandCenter() {
  const documents = useDocumentStore((state) => state.documents, shallow);
  const addTab = useTabsStore((state) => state.addTab);
  const decks = useStudyDeckStore((state) => state.decks, shallow);
  const activeDeckId = useStudyDeckStore((state) => state.activeDeckId);
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

  const activeDeckTags = useMemo(() => {
    const deck = decks.find((item) => item.id === activeDeckId);
    return deck?.tagFilters ?? [];
  }, [decks, activeDeckId]);
  const hasActiveDeck = Boolean(activeDeckId);

  const handleSearch = useCallback(async (query: SearchQuery): Promise<SearchResult[]> => {
    const term = query.query.toLowerCase();
    const results: SearchResult[] = [];

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
      const scopedDocs = hasActiveDeck
        ? documents.filter((doc) =>
            matchesDeckTags(doc.tags ?? [], { id: "", name: "", tagFilters: activeDeckTags })
          )
        : documents;
      const matchedDocs = scopedDocs.filter(doc => 
        doc.title.toLowerCase().includes(term)
      );

      matchedDocs.forEach(doc => {
        results.push({
          id: doc.id,
          type: SearchResultType.Document,
          title: doc.title,
          excerpt: `Page ${doc.currentPage} of ${doc.totalPages}`,
          score: 0.9,
          metadata: {
            documentId: doc.id,
            fileType: doc.fileType
          }
        });
      });
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }, [documents, addTab, activeDeckTags, hasActiveDeck]);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.type === SearchResultType.Command) {
      const action = (result.metadata as any)?.action;
      if (typeof action === 'function') {
        action();
      }
    } else if (result.type === SearchResultType.Document) {
      // Open document in tab
      // We need the full document object, find it in store
      const doc = documents.find(d => d.id === result.id);
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
