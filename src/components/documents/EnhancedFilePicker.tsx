/**
 * Enhanced File Picker Component
 * Supports multiple import sources: local files, URLs, Arxiv, screenshots, Anki, SuperMemo
 */

import { useState } from "react";
import {
  FileText,
  Upload,
  Link,
  Download,
  Image,
  Book,
  Camera,
  X,
  File,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { validateUrl, validateArxivInput } from "../../utils/documentImport";

type ImportSource = "local" | "url" | "arxiv" | "screenshot" | "anki" | "supermemo";

interface ImportOption {
  id: ImportSource;
  label: string;
  icon: React.ElementType;
  description: string;
  supportedFormats: string[];
}

const importOptions: ImportOption[] = [
  {
    id: "local",
    label: "Local File",
    icon: Upload,
    description: "Import PDF, EPUB, Markdown, or text files from your computer",
    supportedFormats: ["pdf", "epub", "md", "txt", "html", "json"],
  },
  {
    id: "url",
    label: "URL Import",
    icon: Link,
    description: "Import content from a web URL",
    supportedFormats: ["http://", "https://"],
  },
  {
    id: "arxiv",
    label: "Arxiv Paper",
    icon: FileText,
    description: "Import academic papers from Arxiv",
    supportedFormats: ["arxiv.org"],
  },
  {
    id: "screenshot",
    label: "Screenshot",
    icon: Camera,
    description: "Capture and import screen content",
    supportedFormats: ["png", "jpg", "jpeg"],
  },
  {
    id: "anki",
    label: "Anki Package",
    icon: Book,
    description: "Import Anki deck packages (.apkg)",
    supportedFormats: ["apkg"],
  },
  {
    id: "supermemo",
    label: "SuperMemo",
    icon: Download,
    description: "Import SuperMemo collections",
    supportedFormats: ["zip"],
  },
];

interface EnhancedFilePickerProps {
  onImport: (source: ImportSource, data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EnhancedFilePicker({
  onImport,
  onCancel,
  isLoading = false,
}: EnhancedFilePickerProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource>("local");
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSourceSelect = (source: ImportSource) => {
    setSelectedSource(source);
    setError(null);
  };

  const handleFileSelect = async () => {
    setError(null);

    try {
      if (selectedSource === "local") {
        // Use Tauri file picker
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: true,
          filters: [
            {
              name: "Supported Documents",
              extensions: ["pdf", "epub", "md", "txt", "html", "json"],
            },
          ],
        });

        if (selected && Array.isArray(selected)) {
          await onImport("local", { filePaths: selected });
        }
      } else if (selectedSource === "url") {
        if (!urlInput.trim()) {
          setError("Please enter a URL");
          return;
        }

        // Validate URL
        const validation = validateUrl(urlInput);
        if (!validation.valid) {
          setError(validation.error || "Invalid URL");
          return;
        }

        await onImport("url", { url: urlInput });
      } else if (selectedSource === "arxiv") {
        if (!urlInput.trim()) {
          setError("Please enter an Arxiv URL or ID");
          return;
        }

        // Validate Arxiv input
        const validation = validateArxivInput(urlInput);
        if (!validation.valid) {
          setError(validation.error || "Invalid Arxiv ID or URL");
          return;
        }

        await onImport("arxiv", { url: urlInput });
      } else if (selectedSource === "screenshot") {
        // Implement screenshot capture
        await onImport("screenshot", {});
      } else if (selectedSource === "anki" || selectedSource === "supermemo") {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [
            {
              name: selectedSource === "anki" ? "Anki Package" : "SuperMemo Collection",
              extensions: selectedSource === "anki" ? ["apkg"] : ["zip"],
            },
          ],
        });

        if (selected && Array.isArray(selected) && selected.length > 0) {
          await onImport(selectedSource, { filePath: selected[0] });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      setError(errorMessage);
      console.error("Import error:", err);
    }
  };

  const renderImportMethod = () => {
    switch (selectedSource) {
      case "local":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select files from your computer to import. Supported formats:
            </p>
            <div className="flex flex-wrap gap-2">
              {importOptions[0].supportedFormats.map((format) => (
                <span
                  key={format}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                >
                  {format.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        );

      case "url":
      case "arxiv":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {selectedSource === "arxiv" ? "Arxiv URL or ID" : "Content URL"}
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={
                  selectedSource === "arxiv"
                    ? "https://arxiv.org/abs/2301.xxxxx or 2301.xxxxx"
                    : "https://example.com/article"
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
            </div>
            {selectedSource === "arxiv" && (
              <p className="text-xs text-muted-foreground">
                Enter an Arxiv paper URL or ID (e.g., 2301.07041)
              </p>
            )}
          </div>
        );

      case "screenshot":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Capture your screen to import as an image document. Screenshots are saved as PNG files.
            </p>
            <div className="p-4 bg-muted rounded-md text-center text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-foreground font-medium">Click Import to capture your screen</p>
              <p className="text-muted-foreground mt-1">
                The entire screen will be captured
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-md">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Features:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Captures primary screen</li>
                  <li>• High-quality PNG format</li>
                  <li>• Auto-categorized as "Screenshots"</li>
                  <li>• Stored securely in your library</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case "anki":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an Anki deck package (.apkg) to import cards and media
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Book className="w-5 h-5 text-primary" />
              <span className="text-sm">Supports decks, cards, and media files</span>
            </div>
          </div>
        );

      case "supermemo":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a SuperMemo collection export (.zip) to import
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Download className="w-5 h-5 text-primary" />
              <span className="text-sm">Imports items, topics, and images</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Import Document</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an import source to add content to your library
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-180px)]">
          {/* Source Selection Sidebar */}
          <div className="w-64 border-r border-border p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              Import Source
            </h3>
            <div className="space-y-1">
              {importOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSourceSelect(option.id)}
                    disabled={isLoading}
                    className={`w-full flex items-start gap-3 p-3 rounded-md transition-colors text-left ${
                      selectedSource === option.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    } disabled:opacity-50`}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className={`text-xs mt-1 ${
                        selectedSource === option.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}>
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Import Method Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderImportMethod()}

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm hover:bg-muted rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {selectedSource === "local" && (
              <button
                onClick={() => {/* TODO: Show advanced options */}}
                disabled={isLoading}
                className="px-4 py-2 text-sm hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              >
                Advanced Options
              </button>
            )}
            <button
              onClick={handleFileSelect}
              disabled={isLoading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <File className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
