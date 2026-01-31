/**
 * External integrations API
 * Supports: Obsidian, Anki, Browser Extension
 */

import { invokeCommand } from "../lib/tauri";

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
 * Conversation message for export
 */
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

/**
 * Export conversation to Obsidian markdown
 * Exports all messages in a conversation
 */
export async function exportConversationToObsidian(
  messages: ConversationMessage[],
  title: string,
  config: ObsidianConfig,
  contextInfo?: string
): Promise<string> {
  return await invokeCommand<string>("export_conversation_to_obsidian", {
    messages,
    title,
    config,
    contextInfo,
  });
}

/**
 * Export a single assistant message to Obsidian
 * Useful for saving individual AI responses
 */
export async function exportAssistantMessageToObsidian(
  message: ConversationMessage,
  title: string,
  config: ObsidianConfig,
  contextInfo?: string
): Promise<string> {
  return await invokeCommand<string>("export_assistant_message_to_obsidian", {
    message,
    title,
    config,
    contextInfo,
  });
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Generate a shareable markdown representation of a conversation
 * For copying to clipboard or previewing
 */
export function generateConversationMarkdown(
  messages: ConversationMessage[],
  title: string,
  contextInfo?: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  
  let markdown = `# ${title}\n\n`;
  
  if (contextInfo) {
    markdown += `**Context:** ${contextInfo}\n\n`;
  }
  
  markdown += `*Exported on ${dateStr} at ${timeStr}*\n\n---\n\n`;
  
  for (const message of messages) {
    const roleLabel = message.role === "user" 
      ? "## You"
      : message.role === "assistant"
      ? "## Assistant"
      : "## System";
    
    markdown += `${roleLabel}\n\n${message.content}\n\n---\n\n`;
  }
  
  return markdown;
}

/**
 * Generate markdown for a single message
 */
export function generateSingleMessageMarkdown(
  message: ConversationMessage,
  title: string,
  contextInfo?: string
): string {
  const now = new Date();
  
  let markdown = `# ${title}\n\n`;
  
  if (contextInfo) {
    markdown += `**Context:** ${contextInfo}\n\n`;
  }
  
  markdown += `*Exported on ${now.toLocaleDateString()}*\n\n`;
  markdown += `## ${message.role === "assistant" ? "AI Response" : message.role === "user" ? "Your Message" : "System Message"}\n\n`;
  markdown += message.content;
  
  return markdown;
}

/**
 * Export document to Obsidian markdown
 */
export async function exportToObsidian(
  documentId: string,
  config: ObsidianConfig
): Promise<string> {
  return await invokeCommand<string>("export_to_obsidian", { documentId, config });
}

/**
 * Export extract to Obsidian markdown
 */
export async function exportExtractToObsidian(
  extractId: string,
  config: ObsidianConfig
): Promise<string> {
  return await invokeCommand<string>("export_extract_to_obsidian", { extractId, config });
}

/**
 * Export flashcards to Obsidian (with flashcard plugin format)
 */
export async function exportFlashcardsToObsidian(
  cardIds: string[],
  config: ObsidianConfig,
  format: "basic" | "flashcard" | "dataview" = "flashcard"
): Promise<string> {
  return await invokeCommand<string>("export_flashcards_to_obsidian", { cardIds, config, format });
}

/**
 * Import markdown from Obsidian
 */
export async function importFromObsidian(
  filePath: string
): Promise<{ documentId: string; extractIds: string[] }> {
  return await invokeCommand("import_from_obsidian", { filePath });
}

/**
 * Sync all data to Obsidian vault
 */
export async function syncToObsidian(
  config: ObsidianConfig
): Promise<{ documents: number; extracts: number; flashcards: number }> {
  return await invokeCommand("sync_to_obsidian", { config });
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
  return await invokeCommand<number>("sync_flashcard_to_anki", { flashcardId, config });
}

/**
 * Sync multiple flashcards to Anki
 */
export async function syncFlashcardsToAnki(
  flashcardIds: string[],
  config: AnkiConfig
): Promise<{ added: number; failed: number }> {
  return await invokeCommand("sync_flashcards_to_anki", { flashcardIds, config });
}

/**
 * Get Anki sync status
 */
export async function getAnkiSyncStatus(
  url: string = "http://localhost:8765"
): Promise<{ required: boolean; message: string }> {
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
  return await invokeCommand<BrowserSyncServerStatus>("start_browser_sync_server", { port });
}

/**
 * Stop browser extension server
 */
export async function stopBrowserSyncServer(): Promise<BrowserSyncServerStatus> {
  return await invokeCommand<BrowserSyncServerStatus>("stop_browser_sync_server");
}

/**
 * Get browser sync server status
 */
export async function getBrowserSyncServerStatus(port: number = 8766): Promise<BrowserSyncServerStatus> {
  return await invokeCommand<BrowserSyncServerStatus>("get_browser_sync_server_status", { port });
}

/**
 * Get browser sync server configuration
 */
export async function getBrowserSyncConfig(): Promise<BrowserSyncConfig> {
  return await invokeCommand<BrowserSyncConfig>("get_browser_sync_config");
}

/**
 * Set browser sync server configuration
 */
export async function setBrowserSyncConfig(config: BrowserSyncConfig): Promise<void> {
  await invokeCommand("set_browser_sync_config", { config });
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
  return await invokeCommand("get_extension_server_status");
}

/**
 * Send message to browser extension
 */
export async function sendToExtension(
  message: ExtensionMessage
): Promise<ExtensionMessageResponse> {
  return await invokeCommand("send_to_extension", { message });
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
  return await invokeCommand("process_extension_page", { page });
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
