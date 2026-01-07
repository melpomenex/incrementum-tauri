/**
 * Data Migration UI Component
 */

import { useState, useEffect } from "react";
import {
  Database,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Backup,
  FolderOpen,
  FileText,
} from "lucide-react";
import {
  readCPPDatabase,
  getCPPDatabaseInfo,
  validateCPPDatabase,
  migrateCPPData,
  createMigrationBackup,
  rollbackMigration,
  getMigrationStatus,
  clearMigrationFlag,
  CPPMigrationData,
} from "../../api/migration";

/**
 * Migration stage
 */
type MigrationStage =
  | "idle"
  | "detecting"
  | "validating"
  | "backup"
  | "migrating"
  | "complete"
  | "error";

/**
 * Migration progress
 */
interface MigrationProgress {
  stage: MigrationStage;
  current: number;
  total: number;
  message: string;
}

/**
 * Migration UI Component
 */
export function DataMigrationUI() {
  const [dbPath, setDbPath] = useState("");
  const [dbInfo, setDbInfo] = useState<{
    exists: boolean;
    version: string;
    documentCount: number;
    flashcardCount: number;
    extractCount: number;
    fileSize: number;
  } | null>(null);

  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress>({
    stage: "idle",
    current: 0,
    total: 0,
    message: "",
  });

  const [migrationResult, setMigrationResult] = useState<{
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
  } | null>(null);

  const [backupPath, setBackupPath] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect C++ database
  const detectDatabase = async () => {
    if (!dbPath) return;

    setMigrationProgress({
      stage: "detecting",
      current: 0,
      total: 1,
      message: "Detecting C++ database...",
    });

    try {
      const info = await getCPPDatabaseInfo(dbPath);
      setDbInfo(info);

      if (info.exists) {
        setMigrationProgress({
          stage: "idle",
          current: 1,
          total: 1,
          message: `Found C++ database with ${info.documentCount} documents`,
        });
      } else {
        setMigrationProgress({
          stage: "error",
          current: 0,
          total: 1,
          message: "C++ database not found at specified path",
        });
      }
    } catch (error) {
      setMigrationProgress({
        stage: "error",
        current: 0,
        total: 1,
        message: `Failed to detect database: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  // Validate database
  const validateDatabase = async () => {
    if (!dbPath) return;

    setMigrationProgress({
      stage: "validating",
      current: 0,
      total: 1,
      message: "Validating database structure...",
    });

    try {
      const result = await validateCPPDatabase(dbPath);
      setValidation(result);

      if (result.valid) {
        setMigrationProgress({
          stage: "idle",
          current: 1,
          total: 1,
          message: "Database validation passed",
        });
      } else {
        setMigrationProgress({
          stage: "error",
          current: 0,
          total: 1,
          message: "Database validation failed",
        });
      }
    } catch (error) {
      setValidation({
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
      });
    }
  };

  // Start migration
  const startMigration = async () => {
    if (!dbPath || !validation?.valid) {
      alert("Please select and validate a database before migrating");
      return;
    }

    setIsProcessing(true);

    try {
      // Create backup
      setMigrationProgress({
        stage: "backup",
        current: 0,
        total: 1,
        message: "Creating backup of new database...",
      });

      const backup = await createMigrationBackup(dbPath);
      setBackupPath(backup);

      // Start migration
      setMigrationProgress({
        stage: "migrating",
        current: 0,
        total: 1,
        message: "Starting migration...",
      });

      const result = await migrateCPPData(dbPath, (progress) => {
        setMigrationProgress({
          stage: "migrating",
          current: progress.current,
          total: progress.total,
          message: progress.message,
        });
      });

      setMigrationResult(result);

      if (result.success) {
        setMigrationProgress({
          stage: "complete",
          current: 1,
          total: 1,
          message: "Migration completed successfully!",
        });
      } else {
        setMigrationProgress({
          stage: "error",
          current: 0,
          total: 1,
          message: "Migration failed. See errors below.",
        });
      }
    } catch (error) {
      setMigrationProgress({
        stage: "error",
        current: 0,
        total: 1,
        message: `Migration error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Rollback migration
  const handleRollback = async () => {
    if (!backupPath) {
      alert("No backup available for rollback");
      return;
    }

    if (!confirm("Are you sure you want to rollback? This will undo all changes from the migration.")) {
      return;
    }

    setIsProcessing(true);

    try {
      const success = await rollbackMigration(backupPath);
      if (success) {
        alert("Rollback completed successfully");
        setMigrationResult(null);
        setBackupPath("");
        setMigrationProgress({
          stage: "idle",
          current: 0,
          total: 1,
          message: "",
        });
      } else {
        alert("Rollback failed");
      }
    } catch (error) {
      alert(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Select database file
  const selectDatabase = async () => {
    try {
      // Use Tauri file dialog
      const { open } = await import("@tauri-apps/api/dialog");
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Database",
          extensions: ["db", "sqlite", "sqlite3"]
        }]
      });

      if (selected && typeof selected === "string") {
        setDbPath(selected);
        // Auto-detect after selection
        setTimeout(() => detectDatabase(), 500);
      }
    } catch (error) {
      console.error("Failed to open file dialog:", error);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Data Migration</h2>
          <p className="text-sm text-muted-foreground">Migrate data from the C++ version</p>
        </div>
      </div>

      {/* Database Selection */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Select C++ Database</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="/path/to/incrementum.db"
              className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={selectDatabase}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted"
            >
              <FolderOpen className="w-4 h-4" />
              Browse
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={detectDatabase}
              disabled={!dbPath || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Detect Database
            </button>

            <button
              onClick={validateDatabase}
              disabled={!dbInfo?.exists || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Validate
            </button>
          </div>
        </div>
      </div>

      {/* Database Info */}
      {dbInfo && dbInfo.exists && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Database Information</h3>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Version</dt>
              <dd className="text-lg font-semibold">{dbInfo.version}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Documents</dt>
              <dd className="text-lg font-semibold">{dbInfo.documentCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Flashcards</dt>
              <dd className="text-lg font-semibold">{dbInfo.flashcardCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Extracts</dt>
              <dd className="text-lg font-semibold">{dbInfo.extractCount}</dd>
            </div>
            <div className="col-span-2 md:col-span-4">
              <dt className="text-sm text-muted-foreground">File Size</dt>
              <dd className="text-lg font-semibold">{formatFileSize(dbInfo.fileSize)}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className={`bg-card border rounded-lg p-6 ${
          validation.valid
            ? "border-green-500/20 bg-green-500/10"
            : "border-destructive/20 bg-destructive/10"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            <h3 className="text-lg font-semibold">Validation Results</h3>
          </div>

          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-destructive mb-2">Errors:</h4>
              <ul className="space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i} className="text-sm text-destructive/80 flex items-start gap-2">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-500 mb-2">Warnings:</h4>
              <ul className="space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-yellow-500/80 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Migration Progress */}
      {migrationProgress.stage !== "idle" && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Migration Progress</h3>

            {migrationProgress.stage === "migrating" && (
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            )}

            {migrationProgress.stage === "complete" && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}

            {migrationProgress.stage === "error" && (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">{migrationProgress.message}</p>

          {migrationProgress.total > 0 && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
              />
            </div>
          )}

          {migrationProgress.stage === "complete" && migrationResult && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-green-500 mb-2">Migration Complete!</h4>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Documents</dt>
                  <dd className="font-semibold">{migrationResult.imported.documents}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Extracts</dt>
                  <dd className="font-semibold">{migrationResult.imported.extracts}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Flashcards</dt>
                  <dd className="font-semibold">{migrationResult.imported.flashcards}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Scheduling Data</dt>
                  <dd className="font-semibold">{migrationResult.imported.scheduling}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Review Logs</dt>
                  <dd className="font-semibold">{migrationResult.imported.reviewLogs}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Categories</dt>
                  <dd className="font-semibold">{migrationResult.imported.categories}</dd>
                </div>
              </dl>

              {migrationResult.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-500/20">
                  <h5 className="text-sm font-medium text-yellow-500 mb-2">Warnings:</h5>
                  <ul className="space-y-1">
                    {migrationResult.errors.map((error, i) => (
                      <li key={i} className="text-xs text-yellow-500/80">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {migrationProgress.stage === "error" && migrationResult?.errors && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h4 className="text-sm font-semibold text-destructive mb-2">Migration Errors</h4>
              <ul className="space-y-1">
                {migrationResult.errors.map((error, i) => (
                  <li key={i} className="text-sm text-destructive/80">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {validation?.valid && !migrationResult && (
        <div className="flex items-center gap-3">
          <button
            onClick={startMigration}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Start Migration
              </>
            )}
          </button>

          {backupPath && (
            <button
              onClick={handleRollback}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
            >
              <Backup className="w-4 h-4" />
              Rollback
            </button>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Migration Information</p>
            <ul className="space-y-1">
              <li>• A backup will be automatically created before migration</li>
              <li>• All data including documents, extracts, flashcards, and review progress will be migrated</li>
              <li>• The original C++ database will not be modified</li>
              <li>• You can rollback to the backup if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
