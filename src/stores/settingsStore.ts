import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * FSRS Algorithm Parameters
 */
interface FSRSParams {
  desiredRetention: number;
  maximumInterval: number;
}

/**
 * Learning Settings
 */
interface LearningSettings {
  algorithm: "fsrs" | "sm2" | "sm5" | "sm8" | "sm15";
  newCardsPerDay: number;
  reviewsPerDay: number;
  initialInterval: number;
  graduatingInterval: number;
  easyInterval: number;
  lapseSteps: number[];
  lapseInterval: number;
  leechThreshold: number;
  maxReviewTime: number;
  fsrsParams: FSRSParams;
  timezone: string;
}

/**
 * PDF Settings
 */
interface PDFSettings {
  defaultZoom: number;
  twoPageSpread: boolean;
}

/**
 * EPUB Settings
 */
interface EPUBSettings {
  fontSize: number;
  fontFamily: "serif" | "sans-serif" | "monospace";
  autoScroll: boolean;
}

/**
 * Segmentation Settings
 */
interface SegmentationSettings {
  method: "semantic" | "paragraph" | "fixed" | "smart";
  targetLength: number;
  overlap: number;
}

/**
 * OCR Settings
 */
interface OCRSettings {
  provider: "tesseract" | "google" | "aws" | "azure";
  language: string;
  autoOCR: boolean;
}

/**
 * Document Settings
 */
interface DocumentSettings {
  defaultCategory: string;
  autoProcessOnImport: boolean;
  detectDuplicates: boolean;
  pdfSettings: PDFSettings;
  epubSettings: EPUBSettings;
  segmentation: SegmentationSettings;
  ocr: OCRSettings;
  cacheContent: boolean;
  autoCleanupCache: boolean;
}

/**
 * Appearance Settings
 */
interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  fontFamily: string;
  themeCustomizations?: {
    primaryColor?: string;
    fontFamily?: string;
  };
}

/**
 * General Settings
 */
interface GeneralSettings {
  language: string;
  startOfWeek: "sunday" | "monday";
  dateFormat: "us" | "iso" | "european";
}

/**
 * Interface Settings
 */
interface InterfaceSettings {
  showSidebar: boolean;
  showStats: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
}

/**
 * AI Settings
 */
interface AISettings {
  enabled: boolean;
  provider: "openai" | "anthropic" | "openrouter" | "ollama";
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  ollamaBaseUrl?: string;
}

/**
 * Sync Settings
 */
interface SyncSettings {
  enabled: boolean;
  provider: "dropbox" | "google-drive" | "icloud" | "webdav";
  interval: number;
  onStartup: boolean;
  lastSync?: string;
}

/**
 * Import/Export Settings
 */
interface ImportExportSettings {
  autoBackup: boolean;
  backupInterval: number;
  includeMedia: boolean;
}

/**
 * Notification Settings
 */
interface NotificationSettings {
  enabled: boolean;
  studyReminders: boolean;
  reminderTime: string;
  dueDateReminders: boolean;
  soundEnabled: boolean;
}

/**
 * Privacy Settings
 */
interface PrivacySettings {
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  analyticsEnabled: boolean;
}

/**
 * Main Settings Interface
 */
export interface Settings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  interface: InterfaceSettings;
  learning: LearningSettings;
  documents: DocumentSettings;
  ai: AISettings;
  sync: SyncSettings;
  importExport: ImportExportSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

/**
 * Default Settings
 */
export const defaultSettings: Settings = {
  general: {
    language: "en",
    startOfWeek: "monday",
    dateFormat: "iso",
  },
  appearance: {
    theme: "system",
    fontSize: 14,
    fontFamily: "Inter",
  },
  interface: {
    showSidebar: true,
    showStats: true,
    compactMode: false,
    animationsEnabled: true,
  },
  learning: {
    algorithm: "fsrs",
    newCardsPerDay: 20,
    reviewsPerDay: 100,
    initialInterval: 0,
    graduatingInterval: 1,
    easyInterval: 4,
    lapseSteps: [10, 20, 30],
    lapseInterval: 1,
    leechThreshold: 8,
    maxReviewTime: 60,
    fsrsParams: {
      desiredRetention: 0.9,
      maximumInterval: 36500,
    },
    timezone: "auto",
  },
  documents: {
    defaultCategory: "Uncategorized",
    autoProcessOnImport: false,
    detectDuplicates: true,
    pdfSettings: {
      defaultZoom: 1.0,
      twoPageSpread: false,
    },
    epubSettings: {
      fontSize: 16,
      fontFamily: "serif",
      autoScroll: true,
    },
    segmentation: {
      method: "semantic",
      targetLength: 200,
      overlap: 20,
    },
    ocr: {
      provider: "tesseract",
      language: "eng",
      autoOCR: false,
    },
    cacheContent: true,
    autoCleanupCache: false,
  },
  ai: {
    enabled: false,
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 4096,
  },
  sync: {
    enabled: false,
    provider: "dropbox",
    interval: 3600,
    onStartup: false,
  },
  importExport: {
    autoBackup: false,
    backupInterval: 86400,
    includeMedia: false,
  },
  notifications: {
    enabled: false,
    studyReminders: false,
    reminderTime: "09:00",
    dueDateReminders: true,
    soundEnabled: true,
  },
  privacy: {
    telemetryEnabled: false,
    crashReportsEnabled: false,
    analyticsEnabled: false,
  },
};

/**
 * Settings Store State
 */
interface SettingsState {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  updateSettingsCategory: <K extends keyof Settings>(
    category: K,
    updates: Partial<Settings[K]>
  ) => void;
  resetSettings: () => void;
  resetCategory: <K extends keyof Settings>(category: K) => void;
}

/**
 * Settings Store
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      updateSettingsCategory: (category, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: { ...state.settings[category], ...updates },
          },
        })),

      resetSettings: () => set({ settings: defaultSettings }),

      resetCategory: (category) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: { ...defaultSettings[category] },
          },
        })),
    }),
    {
      name: "incrementum-settings",
      version: 1,
    }
  )
);
