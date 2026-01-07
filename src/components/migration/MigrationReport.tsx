/**
 * Migration Report Generator
 * Generate detailed reports after data migration
 */

import { useState, useCallback } from "react";
import { Download, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

/**
 * Migration report data
 */
export interface MigrationReport {
  migrationDate: string;
  cppDbPath: string;
  cppDbVersion: string;

  // What was imported
  imported: {
    documents: number;
    extracts: number;
    flashcards: number;
    scheduling: number;
    reviewLogs: number;
    categories: number;
  };

  // What failed
  errors: Array<{
    type: string;
    id: string;
    message: string;
    timestamp: string;
  }>;

  // Warnings
  warnings: Array<{
    type: string;
    id: string;
    message: string;
    count: number;
  }>;

  // Statistics
  statistics: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    successRate: number;
    duration: number; // in seconds
  };

  // File migration info
  fileMigration: {
    filesMigrated: number;
    filesSkipped: number;
    filesFailed: number;
    totalSize: number;
  };
}

/**
 * Generate migration report
 */
export function generateMigrationReport(
  migrationResult: {
    success: boolean;
    imported: {
      documents: number;
      extracts: number;
      flashcards: number;
      scheduling: number;
      reviewLogs: number;
      categories: number;
    };
    errors: string[];
  },
  startTime: number,
  endTime: number,
  cppDbInfo: {
    path: string;
    version: string;
  },
  fileMigration?: {
    filesMigrated: number;
    filesSkipped: number;
    filesFailed: number;
    totalSize: number;
  }
): MigrationReport {
  const duration = (endTime - startTime) / 1000;
  const totalRecords = Object.values(migrationResult.imported).reduce((a, b) => a + b, 0);
  const failedRecords = migrationResult.errors.length;
  const successfulRecords = totalRecords - failedRecords;

  return {
    migrationDate: new Date().toISOString(),
    cppDbPath: cppDbInfo.path,
    cppDbVersion: cppDbInfo.version,
    imported: migrationResult.imported,
    errors: migrationResult.errors.map((error, index) => ({
      type: "error",
      id: `error-${index}`,
      message: error,
      timestamp: new Date().toISOString(),
    })),
    warnings: [],
    statistics: {
      totalRecords,
      successfulRecords,
      failedRecords,
      successRate: totalRecords > 0 ? (successfulRecords / totalRecords) * 100 : 0,
      duration,
    },
    fileMigration: fileMigration || {
      filesMigrated: 0,
      filesSkipped: 0,
      filesFailed: 0,
      totalSize: 0,
    },
  };
}

/**
 * Export report to JSON
 */
export function exportReportToJSON(report: MigrationReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `migration-report-${new Date(report.migrationDate).toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export report to text format
 */
export function exportReportToText(report: MigrationReport): void {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push("INCREMENTUM DATA MIGRATION REPORT");
  lines.push("=".repeat(80));
  lines.push("");

  lines.push(`Migration Date: ${new Date(report.migrationDate).toLocaleString()}`);
  lines.push(`C++ Database: ${report.cppDbPath}`);
  lines.push(`C++ Version: ${report.cppDbVersion}`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("IMPORT SUMMARY");
  lines.push("-".repeat(80));
  lines.push(`Documents:         ${report.imported.documents}`);
  lines.push(`Extracts:           ${report.imported.extracts}`);
  lines.push(`Flashcards:         ${report.imported.flashcards}`);
  lines.push(`Scheduling Data:    ${report.imported.scheduling}`);
  lines.push(`Review Logs:        ${report.imported.reviewLogs}`);
  lines.push(`Categories:         ${report.imported.categories}`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("STATISTICS");
  lines.push("-".repeat(80));
  lines.push(`Total Records:       ${report.statistics.totalRecords}`);
  lines.push(`Successful:          ${report.statistics.successfulRecords}`);
  lines.push(`Failed:              ${report.statistics.failedRecords}`);
  lines.push(`Success Rate:        ${report.statistics.successRate.toFixed(2)}%`);
  lines.push(`Duration:            ${report.statistics.duration.toFixed(2)} seconds`);
  lines.push("");

  if (report.fileMigration.filesMigrated > 0) {
    lines.push("-".repeat(80));
    lines.push("FILE MIGRATION");
    lines.push("-".repeat(80));
    lines.push(`Files Migrated:      ${report.fileMigration.filesMigrated}`);
    lines.push(`Files Skipped:       ${report.fileMigration.filesSkipped}`);
    lines.push(`Files Failed:        ${report.fileMigration.filesFailed}`);
    lines.push(`Total Size:          ${(report.fileMigration.totalSize / 1024 / 1024).toFixed(2)} MB`);
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("-".repeat(80));
    lines.push("WARNINGS");
    lines.push("-".repeat(80));
    report.warnings.forEach((warning) => {
      lines.push(`[${warning.type}] ${warning.message}`);
      if (warning.count > 1) {
        lines.push(`  (Affected ${warning.count} records)`);
      }
    });
    lines.push("");
  }

  if (report.errors.length > 0) {
    lines.push("-".repeat(80));
    lines.push("ERRORS");
    lines.push("-".repeat(80));
    report.errors.forEach((error) => {
      lines.push(`[${error.type}] ${error.message}`);
      lines.push(`  Time: ${new Date(error.timestamp).toLocaleString()}`);
    });
    lines.push("");
  }

  lines.push("=".repeat(80));
  lines.push("END OF REPORT");
  lines.push("=".repeat(80));

  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `migration-report-${new Date(report.migrationDate).toISOString().split("T")[0]}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Migration report viewer component
 */
export function MigrationReportViewer({ report }: { report: MigrationReport }) {
  const [viewMode, setViewMode] = useState<"summary" | "detailed" | "errors">("summary");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Migration Report</h2>
            <p className="text-sm text-muted-foreground">
              Generated {new Date(report.migrationDate).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportReportToJSON(report)}
            className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md hover:bg-muted text-sm"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={() => exportReportToText(report)}
            className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md hover:bg-muted text-sm"
          >
            <Download className="w-4 h-4" />
            Text
          </button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("summary")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "summary"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setViewMode("detailed")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === "detailed"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Detailed
        </button>
        {report.errors.length > 0 && (
          <button
            onClick={() => setViewMode("errors")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "errors"
                ? "border-b-2 border-destructive text-destructive"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Errors ({report.errors.length})
          </button>
        )}
      </div>

      {/* Summary view */}
      {viewMode === "summary" && (
        <div className="space-y-4">
          {/* Success status */}
          <div className={`p-4 rounded-lg border ${
            report.statistics.failedRecords === 0
              ? "bg-green-500/10 border-green-500/20"
              : "bg-yellow-500/10 border-yellow-500/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {report.statistics.failedRecords === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              <h3 className="text-lg font-semibold">
                {report.statistics.failedRecords === 0 ? "Migration Successful" : "Migration Completed with Errors"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.statistics.successfulRecords} of {report.statistics.totalRecords} records imported successfully
              ({report.statistics.successRate.toFixed(1)}%)
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <dt className="text-sm text-muted-foreground">Documents</dt>
              <dd className="text-2xl font-bold">{report.imported.documents}</dd>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <dt className="text-sm text-muted-foreground">Extracts</dt>
              <dd className="text-2xl font-bold">{report.imported.extracts}</dd>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <dt className="text-sm text-muted-foreground">Flashcards</dt>
              <dd className="text-2xl font-bold">{report.imported.flashcards}</dd>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <dt className="text-sm text-muted-foreground">Scheduling</dt>
              <dd className="text-2xl font-bold">{report.imported.scheduling}</dd>
            </div>
          </div>

          {/* Time */}
          <div className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Migration Duration</span>
            <span className="text-lg font-semibold">{report.statistics.duration.toFixed(2)} seconds</span>
          </div>
        </div>
      )}

      {/* Detailed view */}
      {viewMode === "detailed" && (
        <div className="space-y-4">
          {/* Source info */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Source Database</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Path:</dt>
                <dd className="font-mono">{report.cppDbPath}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version:</dt>
                <dd>{report.cppDbVersion}</dd>
              </div>
            </dl>
          </div>

          {/* Imported items */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Imported Items</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Documents:</dt>
                <dd className="font-semibold">{report.imported.documents}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Extracts:</dt>
                <dd className="font-semibold">{report.imported.extracts}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Flashcards:</dt>
                <dd className="font-semibold">{report.imported.flashcards}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Scheduling Records:</dt>
                <dd className="font-semibold">{report.imported.scheduling}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Review Logs:</dt>
                <dd className="font-semibold">{report.imported.reviewLogs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Categories:</dt>
                <dd className="font-semibold">{report.imported.categories}</dd>
              </div>
            </dl>
          </div>

          {/* Statistics */}
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Statistics</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total Records:</dt>
                <dd className="font-semibold">{report.statistics.totalRecords}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Successful:</dt>
                <dd className="font-semibold text-green-500">{report.statistics.successfulRecords}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Failed:</dt>
                <dd className="font-semibold text-destructive">{report.statistics.failedRecords}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Success Rate:</dt>
                <dd className="font-semibold">{report.statistics.successRate.toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration:</dt>
                <dd className="font-semibold">{report.statistics.duration.toFixed(2)}s</dd>
              </div>
            </dl>
          </div>

          {/* File migration */}
          {report.fileMigration.filesMigrated > 0 && (
            <div className="p-4 bg-card border border-border rounded-lg">
              <h3 className="text-sm font-semibold mb-3">File Migration</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Files Migrated:</dt>
                  <dd className="font-semibold">{report.fileMigration.filesMigrated}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Files Skipped:</dt>
                  <dd>{report.fileMigration.filesSkipped}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Files Failed:</dt>
                  <dd className="text-destructive">{report.fileMigration.filesFailed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Size:</dt>
                  <dd>{(report.fileMigration.totalSize / 1024 / 1024).toFixed(2)} MB</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-500 mb-3">Warnings</h3>
              <ul className="space-y-2">
                {report.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-500/80 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{warning.message}</p>
                      {warning.count > 1 && (
                        <p className="text-xs mt-1">Affected {warning.count} records</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Errors view */}
      {viewMode === "errors" && (
        <div className="space-y-4">
          {report.errors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No errors reported</p>
            </div>
          ) : (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h3 className="text-sm font-semibold text-destructive mb-4">
                Errors ({report.errors.length})
              </h3>
              <ul className="space-y-3">
                {report.errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{error.message}</p>
                        <p className="text-xs text-destructive/70 mt-1">
                          {new Date(error.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
