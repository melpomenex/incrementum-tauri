/**
 * Settings Validation Schemas
 * Using Zod for runtime validation
 */

import { z } from 'zod';

// General Settings Schema
export const GeneralSettingsSchema = z.object({
  autoSaveMinutes: z.number().min(1).max(120),
  maxRecentDocuments: z.number().min(1).max(100),
  defaultCategory: z.string().default('None'),
  showStatsOnStartup: z.boolean().default(true),
  restoreSession: z.boolean().default(true),
});

// Interface Settings Schema
export const InterfaceSettingsSchema = z.object({
  theme: z.string().default('modern-dark'),
  denseMode: z.boolean().default(false),
  toolbarIconSize: z.number().min(16).max(64).default(24),
  showStatistics: z.boolean().default(true),
  hintMode: z.boolean().default(false),
  hintModePersistent: z.boolean().default(false),
});

// Document Settings Schema
export const DocumentSettingsSchema = z.object({
  autoSegment: z.boolean().default(true),
  autoHighlight: z.boolean().default(true),
  segmentSize: z.number().min(1000).max(50000).default(10000),
  segmentStrategy: z.enum(['semantic', 'paragraph', 'fixed', 'smart']).default('semantic'),
  highlightColor: z.number().int().min(0).max(4).default(0),
  ocr: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['google', 'aws', 'mistral', 'mathpix', 'gpt4o', 'claude', 'local']),
    apiKey: z.string().default(''),
    preferLocal: z.boolean().default(false),
  }),
  mathOcr: z.object({
    enabled: z.boolean().default(false),
    command: z.string().default('python3'),
    args: z.string().default('scripts/math_ocr.py --input {image} --model-dir {model_dir}'),
    modelDir: z.string().default(''),
    modelUrl: z.string().default(''),
  }),
});

// Learning Settings Schema
export const LearningSettingsSchema = z.object({
  minInterval: z.number().min(1).max(365).default(1),
  maxInterval: z.number().min(1).max(36500).default(36500),
  retention: z.number().min(0.5).max(0.99).default(0.9),
  intervalModifier: z.number().min(0.5).max(2.0).default(1.0),
  chunkSchedulingDefault: z.string().default('normal'),
  interleavedQueueMode: z.boolean().default(false),
  interleavedQueueRatio: z.number().min(0).max(100).default(20),
});

// Algorithm Settings Schema
export const AlgorithmSettingsSchema = z.object({
  type: z.enum(['fsrs', 'sm2', 'supermemo']).default('fsrs'),
  desiredRetention: z.number().min(0.7).max(0.99).default(0.9),
  maxRetention: z.number().min(0.7).max(0.99).default(0.99),
  weightsHalfLife: z.number().min(1).max(365).default(30),
  forgettingCurveHalfLife: z.number().min(1).max(365).default(30),
  stability: z.number().min(0).max(10).default(0),
  difficulty: z.number().min(0).max(10).default(5),
  globalForgettingIndex: z.number().min(1).max(50).default(10),
  useCategoryForgettingIndex: z.boolean().default(false),
  categoryForgettingIndexes: z.record(z.string(), z.number().min(1).max(50)).default({}),
});

// Automation Settings Schema
export const AutomationSettingsSchema = z.object({
  autoSync: z.boolean().default(false),
  desktopNotifications: z.boolean().default(true),
  backgroundProcessing: z.boolean().default(false),
  notificationInterval: z.number().min(1).max(1440).default(60),
});

// Sync Settings Schema
export const SyncSettingsSchema = z.object({
  browser: z.object({
    enabled: z.boolean().default(true),
    port: z.number().min(1024).max(65535).default(8765),
  }),
  vps: z.object({
    url: z.string().url().or(z.literal('')),
    apiKey: z.string().default(''),
    autoPoll: z.boolean().default(false),
  }),
  desktop: z.object({
    enabled: z.boolean().default(false),
    onStartup: z.boolean().default(true),
    intervalMinutes: z.number().min(0).max(1440).default(0),
    lastSync: z.number().default(0),
  }),
});

// API Settings Schema
export const APISettingsSchema = z.object({
  qa: z.object({
    provider: z.string().default(''),
    apiKey: z.string().default(''),
    endpoint: z.string().default(''),
    model: z.string().default(''),
  }),
  localLLM: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default(''),
    endpoint: z.string().default('http://localhost:11434'),
  }),
  transcription: z.object({
    provider: z.string().default(''),
    apiKey: z.string().default(''),
    endpoint: z.string().default(''),
  }),
  localWhisper: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default('base'),
  }),
});

// QA Settings Schema
export const QASettingsSchema = z.object({
  autoGeneration: z.boolean().default(false),
  maxQuestions: z.number().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']).default('medium'),
  systemPrompt: z.string().default('You are a helpful assistant that generates questions from text.'),
  contextWindow: z.boolean().default(false),
  contextWindowSize: z.number().min(100).max(10000).default(2000),
  maxHistory: z.number().min(0).max(100).default(10),
  fromHighlights: z.boolean().default(true),
  fromSegments: z.boolean().default(true),
});

// Audio Transcription Settings Schema
export const AudioTranscriptionSettingsSchema = z.object({
  autoTranscription: z.boolean().default(false),
  language: z.string().default('en'),
  timestampGeneration: z.boolean().default(true),
  speakerDiarization: z.boolean().default(false),
  confidenceScores: z.boolean().default(false),
  confidenceThreshold: z.number().min(0).max(1).default(0.5),
});

// Integration Settings Schema
export const IntegrationSettingsSchema = z.object({
  obsidian: z.object({
    enabled: z.boolean().default(false),
    vaultPath: z.string().default(''),
    template: z.string().default('---\ntitle: {{title}}\ntags: [incrementum]\n---\n\n{{content}}'),
    dailyNotes: z.boolean().default(false),
    bidirectionalSync: z.boolean().default(false),
  }),
  anki: z.object({
    enabled: z.boolean().default(false),
    deckName: z.string().default('Incrementum'),
    bidirectionalSync: z.boolean().default(false),
    syncEnabled: z.boolean().default(false),
    serverUrl: z.string().default('http://localhost:8765'),
    username: z.string().default(''),
    password: z.string().default(''),
    apiToken: z.string().default(''),
    useToken: z.boolean().default(false),
  }),
});

// MCP Servers Settings Schema
export const MCPServerSettingsSchema = z.object({
  server1: z.object({
    name: z.string().default(''),
    endpoint: z.string().default(''),
    transport: z.enum(['stdio', 'sse']).default('stdio'),
  }),
  server2: z.object({
    name: z.string().default(''),
    endpoint: z.string().default(''),
    transport: z.enum(['stdio', 'sse']).default('stdio'),
  }),
  server3: z.object({
    name: z.string().default(''),
    endpoint: z.string().default(''),
    transport: z.enum(['stdio', 'sse']).default('stdio'),
  }),
  autoConnect: z.boolean().default(false),
  connectionTimeout: z.number().min(1).max(120).default(30),
});

// Obsidian Integration Settings Schema
export const ObsidianIntegrationSettingsSchema = z.object({
  apiToken: z.string().default(''),
  databasePath: z.string().default(''),
  realTimeSync: z.boolean().default(false),
  conflictResolution: z.boolean().default(true),
  conflictStrategy: z.enum(['local', 'remote', 'newer']).default('newer'),
});

// RSS Settings Schema
export const RSSSettingsSchema = z.object({
  checkFrequency: z.number().min(5).max(1440).default(60),
  appInterval: z.number().min(1).max(1000).default(10),
  defaultPriority: z.number().min(1).max(5).default(3),
  maxItems: z.number().min(1).max(1000).default(100),
  autoImport: z.boolean().default(false),
  autoCleanup: z.boolean().default(false),
  autoDismissOnScrollEnd: z.boolean().default(false),
  scrollEndAction: z.enum(['dismiss', 'keep', 'ask']).default('keep'),
  keepEntries: z.number().min(1).max(10000).default(500),
});

// SponsorBlock Settings Schema
export const SponsorBlockSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  autoSkip: z.boolean().default(true),
  notifications: z.boolean().default(true),
  privacyMode: z.boolean().default(false),
  categories: z.object({
    sponsor: z.boolean().default(true),
    intro: z.boolean().default(true),
    outro: z.boolean().default(true),
    selfPromo: z.boolean().default(false),
    interaction: z.boolean().default(false),
    musicOfftopic: z.boolean().default(false),
    preview: z.boolean().default(false),
    filler: z.boolean().default(false),
  }),
  cacheDuration: z.number().min(1).max(168).default(48),
});

// Smart Queue Settings Schema
export const SmartQueueSettingsSchema = z.object({
  autoRefresh: z.boolean().default(true),
  refreshInterval: z.number().min(1).max(60).default(5),
  mode: z.enum(['normal', 'filtered', 'intelligent']).default('normal'),
});

// Keybindings Settings Schema
export const KeybindingSettingsSchema = z.object({
  customBindings: z.record(z.string(), z.string()).default({}),
});

// Complete Settings Schema
export const SettingsSchema = z.object({
  general: GeneralSettingsSchema,
  interface: InterfaceSettingsSchema,
  documents: DocumentSettingsSchema,
  learning: LearningSettingsSchema,
  algorithm: AlgorithmSettingsSchema,
  automation: AutomationSettingsSchema,
  sync: SyncSettingsSchema,
  api: APISettingsSchema,
  qa: QASettingsSchema,
  audioTranscription: AudioTranscriptionSettingsSchema,
  integrations: IntegrationSettingsSchema,
  mcpServers: MCPServerSettingsSchema,
  obsidianIntegration: ObsidianIntegrationSettingsSchema,
  rss: RSSSettingsSchema,
  sponsorBlock: SponsorBlockSettingsSchema,
  smartQueue: SmartQueueSettingsSchema,
  keybindings: KeybindingSettingsSchema,
});

// Export type
export type SettingsInput = z.infer<typeof SettingsSchema>;

// Validation function
export function validateSettings(data: unknown): {
  success: boolean;
  data?: SettingsInput;
  errors?: z.ZodError;
} {
  try {
    const validated = SettingsSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}
