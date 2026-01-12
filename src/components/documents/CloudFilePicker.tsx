/**
 * Cloud File Picker Component
 * Browse and import files from cloud storage
 */

import { useState, useEffect } from "react";
import { invokeCommand as invoke } from "../../lib/tauri";
import {
  X,
  FolderOpen,
  File,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  AlertCircle,
  Grid3x3,
  List,
  Search,
  Filter,
  Cloud,
} from "lucide-react";
import type { CloudProviderType, FileInfo } from "@/types/cloud";

interface CloudFilePickerProps {
  provider: CloudProviderType | null;
  isAuthenticated: boolean;
  open: boolean;
  onClose: () => void;
  onImport: (files: FileInfo[]) => void;
  allowedExtensions?: string[];
}

type ViewMode = "grid" | "list";
type SortBy = "name" | "date" | "size";

export function CloudFilePicker({
  provider,
  isAuthenticated,
  open,
  onClose,
  onImport,
  allowedExtensions,
}: CloudFilePickerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  useEffect(() => {
    if (open && isAuthenticated && provider) {
      loadFiles("/");
    } else {
      setFiles([]);
      setCurrentPath("");
      setSelectedFiles(new Set());
    }
  }, [open, isAuthenticated, provider]);

  const loadFiles = async (path: string) => {
    if (!provider) return;

    setLoading(true);
    setError(null);

    try {
      const result = await invoke<FileInfo[]>("cloud_list_files", {
        providerType: provider,
        path,
      });

      setFiles(result);
      setCurrentPath(path);
      setSelectedFiles(new Set());
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleFolderClick = (file: FileInfo) => {
    if (file.is_folder) {
      loadFiles(`${currentPath}/${file.name}`.replace("//", "/"));
    }
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = "/" + parts.join("/");
    loadFiles(newPath || "/");
  };

  const handleNavigateTo = (path: string) => {
    loadFiles(path);
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0 || !provider) return;

    setImporting(true);
    setError(null);

    try {
      const selectedFileInfos = files.filter((f) => selectedFiles.has(f.id));
      const result = await invoke<{
        imported: number;
        failed: number;
        errors: string[];
      }>("cloud_import_files", {
        providerType: provider,
        files: Array.from(selectedFiles),
      });

      if (result.errors.length > 0) {
        setError(`Import completed with ${result.failed} errors: ${result.errors.join(", ")}`);
      } else {
        onImport(selectedFileInfos);
        setSelectedFiles(new Set());
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.is_folder) {
      return <FolderOpen className="w-8 h-8 text-blue-500" />;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (ext === "epub") {
      return <FileText className="w-8 h-8 text-purple-500" />;
    }
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) {
      return <File className="w-8 h-8 text-green-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const filterFiles = () => {
    let filtered = files;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply extension filter
    if (allowedExtensions && allowedExtensions.length > 0) {
      filtered = filtered.filter((f) => {
        if (f.is_folder) return true;
        const ext = f.name.split(".").pop()?.toLowerCase();
        return allowedExtensions.includes(`.${ext || ""}`);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (a.is_folder && !b.is_folder) return -1;
      if (!a.is_folder && b.is_folder) return 1;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.modified_time).getTime() - new Date(a.modified_time).getTime();
        case "size":
          return b.size - a.size;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getBreadcrumbPath = () => {
    const parts = currentPath.split("/").filter(Boolean);
    const paths = [{ name: "Home", path: "/" }];
    let accum = "";

    parts.forEach((part, index) => {
      accum += "/" + part;
      paths.push({ name: part, path: accum });
    });

    return paths;
  };

  if (!open) return null;

  const filteredFiles = filterFiles();
  const hasSelection = selectedFiles.size > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Import from {provider?.replace("-", " ").toUpperCase()}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            {getBreadcrumbPath().map((crumb, index, arr) => (
              <div key={crumb.path} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <button
                  onClick={() => handleNavigateTo(crumb.path)}
                  className={`px-2 py-1 rounded hover:bg-muted transition-colors ${index === arr.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="size">Sort by Size</option>
              </select>

              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No files match your search" : "This folder is empty"}
                </p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.is_folder) {
                      handleFolderClick(file);
                    } else {
                      handleFileSelect(file.id);
                    }
                  }}
                  onDoubleClick={() => {
                    if (file.is_folder) {
                      handleFolderClick(file);
                    }
                  }}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-muted-foreground ${selectedFiles.has(file.id)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                    }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-2">{getFileIcon(file)}</div>
                    <div className="text-sm font-medium text-foreground truncate w-full">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.is_folder ? "Folder" : formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.is_folder) {
                      handleFolderClick(file);
                    } else {
                      handleFileSelect(file.id);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-muted-foreground ${selectedFiles.has(file.id)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                    }`}
                >
                  <div className="flex-shrink-0">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.is_folder ? "Folder" : formatFileSize(file.size)}
                    </div>
                  </div>
                  {file.is_folder && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasSelection ? (
                <>
                  {selectedFiles.size} file{selectedFiles.size > 1 ? "s" : ""} selected
                </>
              ) : (
                "Select files to import"
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={importing}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {currentPath !== "/" && (
                <button
                  onClick={handleNavigateUp}
                  disabled={importing}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Up
                </button>
              )}
              <button
                onClick={handleImport}
                disabled={!hasSelection || importing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
