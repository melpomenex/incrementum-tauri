/**
 * Default Settings
 * Based on Incrementum-CPP SettingsDialog.cpp default values
 */

import { Settings } from '../types/settings';

export const defaultSettings: Settings = {
  general: {
    autoSaveMinutes: 5,
    maxRecentDocuments: 10,
    defaultCategory: 'None',
    showStatsOnStartup: true,
    restoreSession: true,
  },

  interface: {
    theme: 'milky-matcha',
    denseMode: false,
    toolbarIconSize: 24,
    showStatistics: true,
    hintMode: false,
    hintModePersistent: false,
  },

  documents: {
    autoSegment: true,
    autoHighlight: true,
    segmentSize: 10000,
    segmentStrategy: 'semantic',
    highlightColor: 0,
    ocr: {
      enabled: false,
      provider: 'google',
      apiKey: '',
      preferLocal: false,
    },
    mathOcr: {
      enabled: false,
      command: 'python3',
      args: 'scripts/math_ocr.py --input {image} --model-dir {model_dir}',
      modelDir: '',
      modelUrl: '',
    },
  },

  learning: {
    minInterval: 1,
    maxInterval: 36500,
    retention: 0.9,
    intervalModifier: 1.0,
    chunkSchedulingDefault: 'normal',
    interleavedQueueMode: false,
    interleavedQueueRatio: 20,
  },

  algorithm: {
    type: 'fsrs',
    desiredRetention: 0.9,
    maxRetention: 0.99,
    weightsHalfLife: 30,
    forgettingCurveHalfLife: 30,
    stability: 0,
    difficulty: 5,
    globalForgettingIndex: 10,
    useCategoryForgettingIndex: false,
    categoryForgettingIndexes: {},
  },

  automation: {
    autoSync: false,
    desktopNotifications: true,
    backgroundProcessing: false,
    notificationInterval: 60,
  },

  sync: {
    browser: {
      enabled: true,
      port: 8765,
    },
    vps: {
      url: '',
      apiKey: '',
      autoPoll: false,
    },
    desktop: {
      enabled: false,
      onStartup: true,
      intervalMinutes: 0,
      lastSync: 0,
    },
  },

  api: {
    qa: {
      provider: '',
      apiKey: '',
      endpoint: '',
      model: '',
    },
    localLLM: {
      enabled: false,
      model: '',
      endpoint: 'http://localhost:11434',
    },
    transcription: {
      provider: '',
      apiKey: '',
      endpoint: '',
    },
    localWhisper: {
      enabled: false,
      model: 'base',
    },
  },

  qa: {
    autoGeneration: false,
    maxQuestions: 10,
    difficulty: 'medium',
    systemPrompt: 'You are a helpful assistant that generates questions from text.',
    contextWindow: false,
    contextWindowSize: 2000,
    maxHistory: 10,
    fromHighlights: true,
    fromSegments: true,
  },

  audioTranscription: {
    autoTranscription: false,
    language: 'en',
    timestampGeneration: true,
    speakerDiarization: false,
    confidenceScores: false,
    confidenceThreshold: 0.5,
  },

  integrations: {
    obsidian: {
      enabled: false,
      vaultPath: '',
      template: `---
title: {{title}}
tags: [incrementum]
---

{{content}}`,
      dailyNotes: false,
      bidirectionalSync: false,
    },
    anki: {
      enabled: false,
      deckName: 'Incrementum',
      bidirectionalSync: false,
      syncEnabled: false,
      serverUrl: 'http://localhost:8765',
      username: '',
      password: '',
      apiToken: '',
      useToken: false,
    },
  },

  mcpServers: {
    server1: {
      name: '',
      endpoint: '',
      transport: 'stdio',
    },
    server2: {
      name: '',
      endpoint: '',
      transport: 'stdio',
    },
    server3: {
      name: '',
      endpoint: '',
      transport: 'stdio',
    },
    autoConnect: false,
    connectionTimeout: 30,
  },

  obsidianIntegration: {
    apiToken: '',
    databasePath: '',
    realTimeSync: false,
    conflictResolution: true,
    conflictStrategy: 'newer',
  },

  rss: {
    checkFrequency: 60,
    appInterval: 10,
    defaultPriority: 3,
    maxItems: 100,
    autoImport: false,
    autoCleanup: false,
    autoDismissOnScrollEnd: false,
    scrollEndAction: 'keep',
    keepEntries: 500,
  },

  sponsorBlock: {
    enabled: false,
    autoSkip: true,
    notifications: true,
    privacyMode: false,
    categories: {
      sponsor: true,
      intro: true,
      outro: true,
      selfPromo: false,
      interaction: false,
      musicOfftopic: false,
      preview: false,
      filler: false,
    },
    cacheDuration: 48,
  },

  smartQueue: {
    autoRefresh: true,
    refreshInterval: 5,
    mode: 'normal',
    useFsrsScheduling: true, // Enable FSRS-based queue scheduling by default
  },

  keybindings: {
    customBindings: {},
  },
};
