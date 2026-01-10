/**
 * External integrations API
 * Supports: Obsidian, Anki, Browser Extension
 */

import { invoke } from "@tauri-apps/api/core";

// ============================================================================
// OBSIDIAN INTEGRATION
// ============================================================================

/**
 * Obsidian vault configuration
 */
export interface ObsidianConfig {
  vaultPath: string;
  notesFolder: string;
  attachmentsFolder: string;
  dataviewFolder?: string;
}

/**
 * Export document to Obsidian markdown
 */
export async function exportToObsidian(
  documentId: string,
  config: ObsidianConfig
): Promise<string> {
  return await invoke<string>("export_to_obsidian", { documentId, config });
}

/**
 * Export extract to Obsidian markdown
 */
export async function exportExtractToObsidian(
  extractId: string,
  config: ObsidianConfig
): Promise<string> {
  return await invoke<string>("export_extract_to_obsidian", { extractId, config });
}

/**
 * Export flashcards to Obsidian (with flashcard plugin format)
 */
export async function exportFlashcardsToObsidian(
  cardIds: string[],
  config: ObsidianConfig,
  format: "basic" | "flashcard" | "dataview" = "flashcard"
): Promise<string> {
  return await invoke<string>("export_flashcards_to_obsidian", { cardIds, config, format });
}

/**
 * Import markdown from Obsidian
 */
export async function importFromObsidian(
  filePath: string
): Promise<{ documentId: string; extractIds: string[] }> {
  return await invoke("import_from_obsidian", { filePath });
}

/**
 * Sync all data to Obsidian vault
 */
export async function syncToObsidian(
  config: ObsidianConfig
): Promise<{ documents: number; extracts: number; flashcards: number }> {
  return await invoke("sync_to_obsidian", { config });
}

// ============================================================================
// ANKI INTEGRATION
// ============================================================================

/**
 * AnkiConnect configuration
 */
export interface AnkiConfig {
  url: string;
  deckName: string;
  modelName: string;
  basicModelName?: string;
  clozeModelName?: string;
}

/**
 * Anki note
 */
export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
}

/**
 * Test AnkiConnect connection
 */
export async function testAnkiConnection(url: string = "http://localhost:8765"): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "version",
        version: 6,
      }),
    });
    const data = await response.json();
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Get all Anki decks
 */
export async function getAnkiDecks(url: string = "http://localhost:8765"): Promise<string[]> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "deckNames",
      version: 6,
    }),
  });
  const data = await response.json();
  return data || [];
}

/**
 * Get all Anki models
 */
export async function getAnkiModels(url: string = "http://localhost:8765"): Promise<string[]> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "modelNames",
      version: 6,
    }),
  });
  const data = await response.json();
  return data || [];
}

/**
 * Create Anki note
 */
export async function createAnkiNote(
  note: AnkiNote,
  url: string = "http://localhost:8765"
): Promise<number> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addNote",
      version: 6,
      params: {
        note: {
          deckName: note.deckName,
          modelName: note.modelName,
          fields: note.fields,
          tags: note.tags,
          options: {
            allowDuplicate: false,
          },
        },
      },
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data || 0;
}

/**
 * Create multiple Anki notes
 */
export async function createAnkiNotes(
  notes: AnkiNote[],
  url: string = "http://localhost:8765"
): Promise<number[]> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addNotes",
      version: 6,
      params: {
        notes: notes.map((note) => ({
          deckName: note.deckName,
          modelName: note.modelName,
          fields: note.fields,
          tags: note.tags,
        })),
      },
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data || [];
}

/**
 * Sync flashcard to Anki
 */
export async function syncFlashcardToAnki(
  flashcardId: string,
  config: AnkiConfig
): Promise<number> {
  return await invoke<number>("sync_flashcard_to_anki", { flashcardId, config });
}

/**
 * Sync multiple flashcards to Anki
 */
export async function syncFlashcardsToAnki(
  flashcardIds: string[],
  config: AnkiConfig
): Promise<{ added: number; failed: number }> {
  return await invoke("sync_flashcards_to_anki", { flashcardIds, config });
}

/**
 * Get Anki sync status
 */
export async function getAnkiSyncStatus(
  url: string = "http://localhost:8765"
): Promise<{ required: bool; message: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "syncStatus",
        version: 6,
      }),
    });
    return await response.json();
  } catch {
    return { required: false, message: "Unable to check status" };
  }
}

/**
 * Trigger Anki sync
 */
export async function triggerAnkiSync(url: string = "http://localhost:8765"): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync",
        version: 6,
      }),
    });
    const data = await response.json();
    return !data.error;
  } catch {
    return false;
  }
}

// ============================================================================
// BROWSER EXTENSION INTEGRATION
// ============================================================================

/**
 * Browser extension server status
 */
export interface BrowserSyncServerStatus {
  running: boolean;
  port: number;
  connections: number;
}

/**
 * Browser sync server configuration
 */
export interface BrowserSyncConfig {
  host: string;
  port: number;
  autoStart: boolean;
}

/**
 * Start browser extension HTTP server
 */
export async function startBrowserSyncServer(port: number = 8766): Promise<BrowserSyncServerStatus> {
  return await invoke<BrowserSyncServerStatus>("start_browser_sync_server", { port });
}

/**
 * Stop browser extension server
 */
export async function stopBrowserSyncServer(): Promise<BrowserSyncServerStatus> {
  return await invoke<BrowserSyncServerStatus>("stop_browser_sync_server");
}

/**
 * Get browser sync server status
 */
export async function getBrowserSyncServerStatus(port: number = 8766): Promise<BrowserSyncServerStatus> {
  return await invoke<BrowserSyncServerStatus>("get_browser_sync_server_status", { port });
}

/**
 * Get browser sync server configuration
 */
export async function getBrowserSyncConfig(): Promise<BrowserSyncConfig> {
  return await invoke<BrowserSyncConfig>("get_browser_sync_config");
}

/**
 * Set browser sync server configuration
 */
export async function setBrowserSyncConfig(config: BrowserSyncConfig): Promise<void> {
  await invoke("set_browser_sync_config", { config });
}

/**
 * Browser extension message types
 */
export enum ExtensionMessageType {
  Ping = "ping",
  SavePage = "save_page",
  SaveSelection = "save_selection",
  GetQueue = "get_queue",
  CreateExtract = "create_extract",
  CreateFlashcard = "create_flashcard",
  Sync = "sync",
}

/**
 * Browser extension message
 */
export interface ExtensionMessage {
  type: ExtensionMessageType;
  data?: any;
  id: string;
}

/**
 * Browser extension message response
 */
export interface ExtensionMessageResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * @deprecated Use startBrowserSyncServer instead (HTTP-based, not WebSocket)
 * Start browser extension WebSocket server
 */
export async function startExtensionServer(port: number = 8766): Promise<boolean> {
  try {
    const status = await startBrowserSyncServer(port);
    return status.running;
  } catch {
    return false;
  }
}

/**
 * @deprecated Use stopBrowserSyncServer instead
 * Stop browser extension server
 */
export async function stopExtensionServer(): Promise<boolean> {
  try {
    const status = await stopBrowserSyncServer();
    return !status.running;
  } catch {
    return false;
  }
}

/**
 * @deprecated Use getBrowserSyncServerStatus instead
 * Get extension server status
 */
export async function getExtensionServerStatus(): Promise<{
  running: boolean;
  port: number;
  connections: number;
}> {
  return await invoke("get_extension_server_status");
}

/**
 * Send message to browser extension
 */
export async function sendToExtension(
  message: ExtensionMessage
): Promise<ExtensionMessageResponse> {
  return await invoke("send_to_extension", { message });
}

/**
 * Saved page data from browser extension
 */
export interface SavedPage {
  url: string;
  title: string;
  content: string;
  selection?: string;
  timestamp: string;
  tags?: string[];
}

/**
 * Process saved page from extension
 */
export async function processExtensionPage(page: SavedPage): Promise<{
  documentId: string;
  extractIds: string[];
}> {
  return await invoke("process_extension_page", { page });
}

// ============================================================================
// CONFIG STORAGE
// ============================================================================

/**
 * Integration settings
 */
export interface IntegrationSettings {
  obsidian: ObsidianConfig | null;
  anki: AnkiConfig | null;
  extensionPort: number;
}

/**
 * Get integration settings
 */
export function getIntegrationSettings(): IntegrationSettings {
  const data = localStorage.getItem("integration_settings");
  const defaults: IntegrationSettings = {
    obsidian: null,
    anki: null,
    extensionPort: 8766,
  };
  return data ? { ...defaults, ...JSON.parse(data) } : defaults;
}

/**
 * Save integration settings
 */
export function saveIntegrationSettings(settings: IntegrationSettings): void {
  localStorage.setItem("integration_settings", JSON.stringify(settings));
}

/**
 * Update Obsidian config
 */
export function updateObsidianConfig(config: ObsidianConfig): void {
  const settings = getIntegrationSettings();
  settings.obsidian = config;
  saveIntegrationSettings(settings);
}

/**
 * Update Anki config
 */
export function updateAnkiConfig(config: AnkiConfig): void {
  const settings = getIntegrationSettings();
  settings.anki = config;
  saveIntegrationSettings(settings);
}

/**
 * Clear all integration settings
 */
export function clearIntegrationSettings(): void {
  localStorage.removeItem("integration_settings");
}
