/**
 * Import/Export Settings Component
 */

import { useState } from "react";
import { invokeCommand } from "../../lib/tauri";
import { Download, Upload, FileDown, FileUp, RefreshCw } from "lucide-react";
import { SettingsSection, SettingsRow } from "./SettingsPage";

/**
 * Export options
 */
interface ExportOptions {
  includeDocuments: boolean;
  includeExtracts: boolean;
  includeFlashcards: boolean;
  includeSettings: boolean;
  includeStatistics: boolean;
  includeMedia: boolean;
}

/**
 * Import/Export Settings
 */
export function ImportExportSettings({ onChange }: { onChange: () => void }) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeDocuments: true,
    includeExtracts: true,
    includeFlashcards: true,
    includeSettings: true,
    includeStatistics: false,
    includeMedia: false,
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async (format: "json" | "csv" | "incrementum") => {
    setIsProcessing(true);
    try {
      // Build export data based on options
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        options: exportOptions,
        // Data would be populated by actual export function
      };

      const filename = `incrementum-export-${new Date().toISOString().split("T")[0]}.${format}`;

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      onChange();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Please select a file to import");
      return;
    }

    setIsProcessing(true);
    try {
      const fileName = importFile.name.toLowerCase();
      if (fileName.endsWith(".apkg")) {
        const filePath = (importFile as File & { path?: string }).path;
        if (filePath) {
          const imported = await invokeCommand<unknown[]>("import_anki_package_to_learning_items", {
            apkgPath: filePath,
          });
          alert(`Imported ${imported.length} Anki card(s) as learning items`);
          onChange();
          return;
        }

        const apkgBytes = new Uint8Array(await importFile.arrayBuffer());
        const imported = await invokeCommand<unknown[]>("import_anki_package_bytes_to_learning_items", {
          apkgBytes: Array.from(apkgBytes),
        });
        alert(`Imported ${imported.length} Anki card(s) as learning items`);
        onChange();
        return;
      }

      if (fileName.endsWith(".zip") || fileName.endsWith(".7z")) {
        const filePath = (importFile as File & { path?: string }).path;
        if (!filePath) {
          throw new Error("Import requires access to the archive file path.");
        }

        const summary = await invokeCommand<{
          documents: number;
          extracts: number;
          learningItems: number;
          reviewSessions: number;
          reviewResults: number;
        }>("import_legacy_archive", { archivePath: filePath });


        alert(
          `Legacy import complete:\n` +
          `Documents: ${summary.documents}\n` +
          `Extracts: ${summary.extracts}\n` +
          `Learning Items: ${summary.learningItems}\n` +
          `Review Sessions: ${summary.reviewSessions}\n` +
          `Review Results: ${summary.reviewResults}`
        );
        onChange();
        return;
      }

      const text = await importFile.text();
      const data = JSON.parse(text);

      // Validate import data
      if (!data.version) {
        throw new Error("Invalid import file format");
      }

      // Process import
      // This would trigger actual import logic
      alert(`Import would process:\n${JSON.stringify(data.options, null, 2)}`);

      onChange();
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportFromCPlusPlus = () => {
    // Launch C++ database reader
    alert("C++ database migration will be implemented in Phase 4.6");
  };

  return (
    <>
      <SettingsSection
        title="Export Data"
        description="Choose what to include in your export"
      >
        <div className="space-y-4">
          {/* Export options */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-3 text-foreground">Data to Export</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeDocuments}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeDocuments: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Documents</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeExtracts}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeExtracts: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Extracts</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeFlashcards}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeFlashcards: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Flashcards & Progress</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSettings}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeSettings: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Settings</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeStatistics}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeStatistics: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Statistics & Analytics</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMedia}
                  onChange={(e) => {
                    setExportOptions({ ...exportOptions, includeMedia: e.target.checked });
                    onChange();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Media Files (PDFs, images, etc.)</span>
              </label>
            </div>
          </div>

          {/* Export format selection */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Format:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("json")}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export as JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                Export as CSV
              </button>
              <button
                onClick={() => handleExport("incrementum")}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                <FileUp className="w-4 h-4" />
                Incrementum Package
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Import Data"
        description="Import data from a backup or other sources"
      >
        <div className="space-y-4">
          {/* File selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Import File</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".json,.csv,.incrementum,.apkg,.zip,.7z"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
              />
              {importFile && (
                <button
                  onClick={() => setImportFile(null)}
                  className="p-2 hover:bg-muted rounded text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            {importFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Import options */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-3 text-foreground">Import Options</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded"
                />
                <span className="text-sm text-foreground">Skip duplicates (based on ID)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded"
                />
                <span className="text-sm text-foreground">Merge with existing data</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                />
                <span className="text-sm text-foreground">Create backup before import</span>
              </label>
            </div>
          </div>

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!importFile || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Data
              </>
            )}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Migrate from C++ Version"
        description="Import your data from the original C++ application"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import your documents, extracts, flashcards, and progress from the C++ version of Incrementum.
          </p>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-2 text-foreground">What will be imported:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All documents with metadata</li>
              <li>• Extracts and highlights</li>
              <li>• Flashcards with scheduling data</li>
              <li>• Categories and tags</li>
              <li>• Review history and statistics</li>
              <li>• Application settings</li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportFromCPlusPlus}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
            >
              <RefreshCw className="w-4 h-4" />
              Start Migration
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Scheduled Backups"
        description="Configure automatic backup settings"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Auto Backup"
            description="Automatically create backups at regular intervals"
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </SettingsRow>

          <SettingsRow
            label="Backup Frequency"
            description="How often to create automatic backups"
          >
            <select
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              onChange={onChange}
              defaultValue="daily"
            >
              <option value="hourly" className="text-foreground">Hourly</option>
              <option value="daily" className="text-foreground">Daily</option>
              <option value="weekly" className="text-foreground">Weekly</option>
              <option value="monthly" className="text-foreground">Monthly</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="Backup Location"
            description="Folder where backups are stored"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue="./backups"
                onChange={onChange}
                className="w-48 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="px-3 py-2 bg-background border border-border rounded-md hover:bg-muted text-foreground">
                Browse
              </button>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Max Backups"
            description="Maximum number of backups to keep"
          >
            <input
              type="number"
              min="1"
              max="100"
              defaultValue="10"
              onChange={onChange}
              className="w-20 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}
