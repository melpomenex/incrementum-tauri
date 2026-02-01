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
  algorithm: "fsrs";
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
  lineHeight: number;
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
  provider: "tesseract" | "google" | "aws" | "azure" | "marker" | "nougat";
  language: string;
  autoOCR: boolean;
  googleProjectId?: string;
  googleLocation?: string;
  googleProcessorId?: string;
  googleCredentialsPath?: string;
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  preferLocal: boolean;
  mathOcrEnabled: boolean;
  mathOcrCommand?: string;
  mathOcrModelDir?: string;
  keyPhraseExtraction: boolean;
  autoExtractOnLoad: boolean;
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
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  showBadge: boolean;
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
 * Audio Transcription Settings
 */
interface AudioTranscriptionSettings {
  autoTranscription: boolean;
  language: string;
  timestampGeneration: boolean;
  speakerDiarization: boolean;
  confidenceScores: boolean;
  confidenceThreshold: number;
}

/**
 * Smart Queue Settings
 */
interface SmartQueueSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  mode: 'normal' | 'filtered' | 'intelligent';
}

/**
 * Scroll Queue Settings
 */
interface ScrollQueueSettings {
  flashcardPercentage: number; // 0-100, percentage of queue that should be flashcards
  extractsCountAsFlashcards: boolean; // Whether extracts count towards the flashcard percentage
}

/**
 * RSS Queue Settings
 */
export interface RSSQueueSettings {
  /** Whether to include RSS items in the main queue at all */
  includeInQueue: boolean;
  /** Percentage of queue items that should be RSS (0-100) */
  percentage: number;
  /** Maximum number of RSS items to include per session (0 = unlimited) */
  maxItemsPerSession: number;
  /** Specific feed IDs to include in the queue (empty = all feeds) */
  includedFeedIds: string[];
  /** Feed IDs explicitly excluded from the queue */
  excludedFeedIds: string[];
  /** Whether to only include unread items */
  unreadOnly: boolean;
  /** Whether to prefer newer items */
  preferRecent: boolean;
}

/**
 * YouTube API Settings
 */
interface YouTubeSettings {
  apiKey?: string;
  enabled: boolean;
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
  audioTranscription: AudioTranscriptionSettings;
  smartQueue: SmartQueueSettings;
  scrollQueue: ScrollQueueSettings;
  rssQueue: RSSQueueSettings;
  youtube: YouTubeSettings;
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
      lineHeight: 1.6,
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
      googleProjectId: undefined,
      googleLocation: "us",
      googleProcessorId: undefined,
      googleCredentialsPath: undefined,
      awsRegion: "us-east-1",
      awsAccessKey: undefined,
      awsSecretKey: undefined,
      azureEndpoint: undefined,
      azureApiKey: undefined,
      preferLocal: true,
      mathOcrEnabled: false,
      mathOcrCommand: "nougat",
      mathOcrModelDir: undefined,
      keyPhraseExtraction: false,
      autoExtractOnLoad: false,
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
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    showBadge: true,
  },
  privacy: {
    telemetryEnabled: false,
    crashReportsEnabled: false,
    analyticsEnabled: false,
  },
  audioTranscription: {
    autoTranscription: false,
    language: "en",
    timestampGeneration: true,
    speakerDiarization: false,
    confidenceScores: false,
    confidenceThreshold: 0.7,
  },
  smartQueue: {
    autoRefresh: false,
    refreshInterval: 60,
    mode: 'normal',
  },
  scrollQueue: {
    flashcardPercentage: 30, // 30% of queue should be flashcards by default
    extractsCountAsFlashcards: true, // Extracts count towards the flashcard percentage
  },
  rssQueue: {
    includeInQueue: true,
    percentage: 20, // 20% of queue should be RSS by default
    maxItemsPerSession: 10, // Max 10 RSS items per session
    includedFeedIds: [], // Empty = all feeds included by default
    excludedFeedIds: [], // No feeds excluded by default
    unreadOnly: true, // Only include unread items
    preferRecent: true, // Prefer newer items
  },
  youtube: {
    apiKey: undefined,
    enabled: false,
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
