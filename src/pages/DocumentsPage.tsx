import { useState, useEffect, useCallback } from "react";
import { useDocumentStore } from "../stores/documentStore";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  BookOpen,
  Plus,
} from "lucide-react";

export function DocumentsPage() {
  const { documents, isLoading, loadDocuments, importDocument, deleteDocument } = useDocumentStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocuments();

    // Debug: Add global click listener
    const handleGlobalClick = (e: MouseEvent) => {
      console.log("Global click detected:", e.target);
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [loadDocuments]);

  const handleImport = async () => {
    console.log("=== handleImport called ===");
    try {
      console.log("Opening dialog...");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Documents",
            extensions: ["pdf", "epub", "md", "txt", "html"],
          },
        ],
      });
      console.log("Dialog result:", selected);
      if (selected && typeof selected === "string") {
        console.log("Importing document:", selected);
        await importDocument(selected);
        console.log("Import complete!");
      } else {
        console.log("No file selected or invalid result:", selected);
      }
    } catch (error) {
      console.error("Failed to import document:", error);
    }
  };

  const testClick = () => {
    console.log("=== Button was clicked ===");
    alert("Button click works!");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(id);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return "📕";
      case "epub":
        return "📖";
      case "markdown":
        return "📝";
      case "html":
        return "🌐";
      case "youtube":
        return "📺";
      default:
        return "📄";
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="border-b border-border bg-card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-foreground-secondary">
              {filteredDocs.length} documents
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={testClick}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:opacity-90"
            >
              Test
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Document
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-foreground-secondary">Loading...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-foreground-secondary opacity-50" />
            <p className="text-foreground-secondary mb-4">
              {searchQuery ? "No documents match your search" : "No documents yet"}
            </p>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90"
            >
              Import Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{getDocIcon(doc.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {doc.title}
                    </h3>
                    {doc.category && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-primary-50 text-primary-700 rounded">
                        {doc.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-foreground-secondary mb-3">
                  <span>{doc.extractCount || 0} extracts</span>
                  <span>{doc.learningItemCount || 0} cards</span>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 px-2 py-1.5 bg-primary-50 text-primary-700 rounded text-xs hover:bg-primary-100 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
