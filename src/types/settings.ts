/**
 * Settings System Types
 * Based on Incrementum-CPP SettingsDialog.cpp
 */

// General Settings
export interface GeneralSettings {
  autoSaveMinutes: number;
  maxRecentDocuments: number;
  defaultCategory: string;
  showStatsOnStartup: boolean;
  restoreSession: boolean;
}

// Interface Settings
export interface InterfaceSettings {
  theme: string;
  denseMode: boolean;
  toolbarIconSize: number;
  showStatistics: boolean;
  hintMode: boolean;
  hintModePersistent: boolean;
}

// Document Settings
export interface DocumentSettings {
  autoSegment: boolean;
  autoHighlight: boolean;
  segmentSize: number;
  segmentStrategy: 'semantic' | 'paragraph' | 'fixed' | 'smart';
  highlightColor: 0 | 1 | 2 | 3 | 4;
  ocr: {
    enabled: boolean;
    provider: 'google' | 'aws' | 'mistral' | 'mathpix' | 'gpt4o' | 'claude' | 'local';
    apiKey: string;
    preferLocal: boolean;
  };
  mathOcr: {
    enabled: boolean;
    command: string;
    args: string;
    modelDir: string;
    modelUrl: string;
  };
}

// Learning Settings
export interface LearningSettings {
  minInterval: number;
  maxInterval: number;
  retention: number;
  intervalModifier: number;
  chunkSchedulingDefault: string;
  interleavedQueueMode: boolean;
  interleavedQueueRatio: number;
}

// Algorithm Settings
export interface AlgorithmSettings {
  type: 'fsrs' | 'sm2' | 'supermemo';
  desiredRetention: number;
  maxRetention: number;
  weightsHalfLife: number;
  forgettingCurveHalfLife: number;
  stability: number;
  difficulty: number;
  globalForgettingIndex: number;
  useCategoryForgettingIndex: boolean;
  categoryForgettingIndexes: Record<string, number>;
}

// Automation Settings
export interface AutomationSettings {
  autoSync: boolean;
  desktopNotifications: boolean;
  backgroundProcessing: boolean;
  notificationInterval: number;
}

// Sync Settings
export interface SyncSettings {
  browser: {
    enabled: boolean;
    port: number;
  };
  vps: {
    url: string;
    apiKey: string;
    autoPoll: boolean;
  };
  desktop: {
    enabled: boolean;
    onStartup: boolean;
    intervalMinutes: number;
    lastSync: number;
  };
}

// API Settings
export interface APISettings {
  qa: {
    provider: string;
    apiKey: string;
    endpoint: string;
    model: string;
  };
  localLLM: {
    enabled: boolean;
    model: string;
    endpoint: string;
  };
  transcription: {
    provider: string;
    apiKey: string;
    endpoint: string;
  };
  localWhisper: {
    enabled: boolean;
    model: string;
  };
}

// QA Settings
export interface QASettings {
  autoGeneration: boolean;
  maxQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  systemPrompt: string;
  contextWindow: boolean;
  contextWindowSize: number;
  maxHistory: number;
  fromHighlights: boolean;
  fromSegments: boolean;
}

// Audio Transcription Settings
export interface AudioTranscriptionSettings {
  autoTranscription: boolean;
  language: string;
  timestampGeneration: boolean;
  speakerDiarization: boolean;
  confidenceScores: boolean;
  confidenceThreshold: number;
}

// Integration Settings
export interface IntegrationSettings {
  obsidian: {
    enabled: boolean;
    vaultPath: string;
    template: string;
    dailyNotes: boolean;
    bidirectionalSync: boolean;
  };
  anki: {
    enabled: boolean;
    deckName: string;
    bidirectionalSync: boolean;
    syncEnabled: boolean;
    serverUrl: string;
    username: string;
    password: string;
    apiToken: string;
    useToken: boolean;
  };
}

// MCP Servers Settings
export interface MCPServerSettings {
  server1: {
    name: string;
    endpoint: string;
    transport: 'stdio' | 'sse';
  };
  server2: {
    name: string;
    endpoint: string;
    transport: 'stdio' | 'sse';
  };
  server3: {
    name: string;
    endpoint: string;
    transport: 'stdio' | 'sse';
  };
  autoConnect: boolean;
  connectionTimeout: number;
}

// Obsidian Integration Settings (Advanced)
export interface ObsidianIntegrationSettings {
  apiToken: string;
  databasePath: string;
  realTimeSync: boolean;
  conflictResolution: boolean;
  conflictStrategy: 'local' | 'remote' | 'newer';
}

// RSS Settings
export interface RSSSettings {
  checkFrequency: number;
  appInterval: number;
  defaultPriority: number;
  maxItems: number;
  autoImport: boolean;
  autoCleanup: boolean;
  autoDismissOnScrollEnd: boolean;
  scrollEndAction: 'dismiss' | 'keep' | 'ask';
  keepEntries: number;
}

// SponsorBlock Settings
export interface SponsorBlockSettings {
  enabled: boolean;
  autoSkip: boolean;
  notifications: boolean;
  privacyMode: boolean;
  categories: {
    sponsor: boolean;
    intro: boolean;
    outro: boolean;
    selfPromo: boolean;
    interaction: boolean;
    musicOfftopic: boolean;
    preview: boolean;
    filler: boolean;
  };
  cacheDuration: number;
}

// Smart Queue Settings
export interface SmartQueueSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  mode: 'normal' | 'filtered' | 'intelligent';
  useFsrsScheduling: boolean; // Use FSRS-based scheduling for documents in the queue
}

// Keybindings Settings
export interface KeybindingSettings {
  customBindings: Record<string, string>;
}

// Complete Settings Object
export interface Settings {
  general: GeneralSettings;
  interface: InterfaceSettings;
  documents: DocumentSettings;
  learning: LearningSettings;
  algorithm: AlgorithmSettings;
  automation: AutomationSettings;
  sync: SyncSettings;
  api: APISettings;
  qa: QASettings;
  audioTranscription: AudioTranscriptionSettings;
  integrations: IntegrationSettings;
  mcpServers: MCPServerSettings;
  obsidianIntegration: ObsidianIntegrationSettings;
  rss: RSSSettings;
  sponsorBlock: SponsorBlockSettings;
  smartQueue: SmartQueueSettings;
  keybindings: KeybindingSettings;
}

// Settings category type
export type SettingsCategory = keyof Settings;

// Settings update type
export type SettingsUpdate = Partial<Settings>;

// Settings validation result
export interface SettingsValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
