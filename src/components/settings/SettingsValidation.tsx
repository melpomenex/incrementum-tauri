/**
 * Settings validation utilities and components
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

/**
 * Validation severity
 */
export enum ValidationSeverity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  id: string;
  key: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  fixAction?: () => void | Promise<void>;
}

/**
 * Settings validation store
 */
interface ValidationStore {
  issues: ValidationIssue[];
  addIssue: (issue: ValidationIssue) => void;
  removeIssue: (id: string) => void;
  clearIssues: () => void;
  validateAll: () => Promise<void>;
}

/**
 * Use settings validation store
 */
export const useValidationStore = create<ValidationStore>()(
  persist(
    (set, get) => ({
      issues: [],

      addIssue: (issue) => {
        set((state) => {
          // Remove existing issue with same key
          const filtered = state.issues.filter((i) => i.key !== issue.key);
          return { issues: [...filtered, issue] };
        });
      },

      removeIssue: (id) => {
        set((state) => ({
          issues: state.issues.filter((i) => i.id !== id),
        }));
      },

      clearIssues: () => {
        set({ issues: [] });
      },

      validateAll: async () => {
        // Run all validators
        const allIssues: ValidationIssue[] = [];

        // Add validation results
        set({ issues: allIssues });
      },
    }),
    {
      name: "validation-storage",
    }
  )
);

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

/**
 * Settings validator class
 */
export class SettingsValidator {
  private issues: ValidationIssue[] = [];

  constructor() {
    this.issues = [];
  }

  /**
   * Add a validation error
   */
  error(key: string, message: string, suggestion?: string, fixAction?: () => void) {
    this.issues.push({
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key,
      severity: ValidationSeverity.Error,
      message,
      suggestion,
      fixAction,
    });
  }

  /**
   * Add a validation warning
   */
  warning(key: string, message: string, suggestion?: string, fixAction?: () => void) {
    this.issues.push({
      id: `warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key,
      severity: ValidationSeverity.Warning,
      message,
      suggestion,
      fixAction,
    });
  }

  /**
   * Add an info message
   */
  info(key: string, message: string, suggestion?: string) {
    this.issues.push({
      id: `info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      key,
      severity: ValidationSeverity.Info,
      message,
      suggestion,
    });
  }

  /**
   * Check if a value is required
   */
  required(value: unknown, key: string, label: string) {
    if (!value || (typeof value === "string" && !value.trim())) {
      this.error(key, `${label} is required`, `Please provide a valid ${label.toLowerCase()}`);
      return false;
    }
    return true;
  }

  /**
   * Check if a URL is valid
   */
  validUrl(value: string, key: string, label: string) {
    try {
      new URL(value);
      return true;
    } catch {
      this.error(key, `${label} must be a valid URL`, `Include the protocol (e.g., https://)`);
      return false;
    }
  }

  /**
   * Check if a value is within range
   */
  inRange(value: number, key: string, label: string, min: number, max: number) {
    if (value < min || value > max) {
      this.error(key, `${label} must be between ${min} and ${max}`, `Adjust to a value within this range`);
      return false;
    }
    return true;
  }

  /**
   * Check if a file path exists
   */
  pathExists(value: string, key: string, label: string) {
    // This would need to be implemented with Tauri API
    // For now, just check if not empty
    if (!value || !value.trim()) {
      this.error(key, `${label} path is required`);
      return false;
    }
    return true;
  }

  /**
   * Check API key format
   */
  validApiKey(value: string, key: string, provider: string) {
    if (!value || value.length < 10) {
      this.error(
        key,
        `Invalid ${provider} API key`,
        `${provider} API keys are typically longer than 10 characters`
      );
      return false;
    }
    return true;
  }

  /**
   * Get validation result
   */
  getResult(): ValidationResult {
    const errors = this.issues.filter((i) => i.severity === ValidationSeverity.Error);
    const warnings = this.issues.filter((i) => i.severity === ValidationSeverity.Warning);
    const info = this.issues.filter((i) => i.severity === ValidationSeverity.Info);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Get all issues
   */
  getIssues(): ValidationIssue[] {
    return this.issues;
  }
}

/**
 * Validate all settings
 */
export async function validateAllSettings(config: {
  sync?: { enabled: boolean; endpoint?: string; apiKey?: string };
  ai?: { provider: string; apiKey?: string };
  general?: { language: string; dataPath: string };
}): Promise<ValidationResult> {
  const validator = new SettingsValidator();

  // Validate sync settings
  if (config.sync?.enabled) {
    if (!config.sync.endpoint) {
      validator.error("sync.endpoint", "Sync endpoint is required", "Enter your sync server URL");
    } else {
      validator.validUrl(config.sync.endpoint, "sync.endpoint", "Sync endpoint");
    }

    if (!config.sync.apiKey) {
      validator.error("sync.apiKey", "Sync API key is required", "Enter your sync API key");
    }
  }

  // Validate AI settings
  if (config.ai?.provider && config.ai.provider !== "ollama") {
    if (!config.ai.apiKey) {
      validator.warning(
        "ai.apiKey",
        `No ${config.ai.provider} API key configured`,
        "AI features will not work without an API key"
      );
    } else {
      validator.validApiKey(config.ai.apiKey, "ai.apiKey", config.ai.provider);
    }
  }

  // Validate general settings
  if (config.general?.dataPath) {
    validator.pathExists(config.general.dataPath, "general.dataPath", "Data path");
  }

  return validator.getResult();
}

/**
 * Validation summary component
 */
export function ValidationSummary({ result }: { result: ValidationResult }) {
  if (result.errors.length === 0 && result.warnings.length === 0 && result.info.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">All settings are valid</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {result.errors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{result.errors.length} Error{result.errors.length > 1 ? "s" : ""}</span>
          </div>
          <ul className="space-y-1">
            {result.errors.map((error) => (
              <li key={error.id} className="text-sm text-destructive/80">
                {error.message}
                {error.suggestion && (
                  <span className="ml-2 text-destructive/60">({error.suggestion})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold">{result.warnings.length} Warning{result.warnings.length > 1 ? "s" : ""}</span>
          </div>
          <ul className="space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning.id} className="text-sm text-yellow-500/80 flex items-start justify-between">
                <span>
                  {warning.message}
                  {warning.suggestion && (
                    <span className="ml-2 text-yellow-500/60">({warning.suggestion})</span>
                  )}
                </span>
                {warning.fixAction && (
                  <button
                    onClick={warning.fixAction}
                    className="text-xs underline hover:text-yellow-500"
                  >
                    Fix
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.info.length > 0 && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Info className="w-5 h-5" />
            <span className="text-sm font-semibold">{result.info.length} Info</span>
          </div>
          <ul className="space-y-1">
            {result.info.map((info) => (
              <li key={info.id} className="text-sm text-blue-500/80">
                {info.message}
                {info.suggestion && (
                  <span className="ml-2 text-blue-500/60">({info.suggestion})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Settings validation panel component
 */
export function SettingsValidationPanel() {
  const { issues, clearIssues } = useValidationStore();

  const errors = issues.filter((i) => i.severity === ValidationSeverity.Error);
  const warnings = issues.filter((i) => i.severity === ValidationSeverity.Warning);
  const info = issues.filter((i) => i.severity === ValidationSeverity.Info);

  const result: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <ValidationSummary result={result} />
    </div>
  );
}

/**
 * Hook to validate settings on change
 */
export function useSettingsValidation() {
  const { issues, addIssue, removeIssue, clearIssues } = useValidationStore();

  const validateSetting = useCallback((
    key: string,
    value: unknown,
    rules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      min?: number;
      max?: number;
      custom?: (value: unknown) => string | null;
    }
  ) => {
    // Remove existing issue for this key
    removeIssue(key);

    // Required check
    if (rules.required && !value) {
      addIssue({
        id: `validation-${key}`,
        key,
        severity: ValidationSeverity.Error,
        message: "This field is required",
      });
      return false;
    }

    if (!value) return true;

    // String validations
    if (typeof value === "string") {
      if (rules.minLength && value.length < rules.minLength) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: `Must be at least ${rules.minLength} characters`,
        });
        return false;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: `Must be no more than ${rules.maxLength} characters`,
        });
        return false;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: "Invalid format",
        });
        return false;
      }
    }

    // Number validations
    if (typeof value === "number") {
      if (rules.min !== undefined && value < rules.min) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: `Must be at least ${rules.min}`,
        });
        return false;
      }

      if (rules.max !== undefined && value > rules.max) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: `Must be no more than ${rules.max}`,
        });
        return false;
      }
    }

    // Custom validation
    if (rules.custom) {
      const error = rules.custom(value);
      if (error) {
        addIssue({
          id: `validation-${key}`,
          key,
          severity: ValidationSeverity.Error,
          message: error,
        });
        return false;
      }
    }

    return true;
  }, [addIssue, removeIssue]);

  return {
    issues,
    errors: issues.filter((i) => i.severity === ValidationSeverity.Error),
    warnings: issues.filter((i) => i.severity === ValidationSeverity.Warning),
    hasErrors: issues.filter((i) => i.severity === ValidationSeverity.Error).length > 0,
    validateSetting,
    clearIssues,
  };
}
