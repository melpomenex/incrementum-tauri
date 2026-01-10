/**
 * Type-safe wrapper for Tauri invoke commands
 *
 * This wrapper lazy-loads the Tauri API to allow the app to run in browser
 * environments (for development/demo purposes) even though full functionality
 * requires the Tauri desktop environment.
 */

let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let tauriDialogOpen: ((options: unknown) => Promise<string | string[] | null>) | null = null;
let tauriEventListen: (<T>(event: string, handler: (event: T) => void) => Promise<() => void>) | null = null;

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return "__TAURI__" in window;
}

/**
 * Lazy load the Tauri API only when running in Tauri environment
 */
async function loadTauriAPI(): Promise<void> {
  if (tauriInvoke !== null || !isTauri()) {
    return;
  }

  try {
    const coreModule = await import("@tauri-apps/api/core");
    tauriInvoke = coreModule.invoke;
  } catch (error) {
    console.error("Failed to load Tauri API:", error);
    throw new Error("Tauri API not available");
  }
}

/**
 * Lazy load the Tauri dialog plugin API
 */
async function loadTauriDialogAPI(): Promise<void> {
  if (tauriDialogOpen !== null || !isTauri()) {
    return;
  }

  try {
    const dialogModule = await import("@tauri-apps/plugin-dialog");
    tauriDialogOpen = dialogModule.open;
  } catch (error) {
    console.error("Failed to load Tauri dialog API:", error);
    throw new Error("Tauri dialog API not available");
  }
}

/**
 * Lazy load the Tauri event API
 */
async function loadTauriEventAPI(): Promise<void> {
  if (tauriEventListen !== null || !isTauri()) {
    return;
  }

  try {
    const eventModule = await import("@tauri-apps/api/event");
    tauriEventListen = eventModule.listen;
  } catch (error) {
    console.error("Failed to load Tauri event API:", error);
    throw new Error("Tauri event API not available");
  }
}

/**
 * Mock data for browser environment
 * This allows the app to render in a browser for UI preview
 */
const MOCK_DATA = {
  documents: [],
  extracts: [],
  ai_config: null,
  migration_status: { is_migrated: false, in_progress: false },
};

/**
 * Commands that typically return arrays
 */
const ARRAY_RETURN_COMMANDS = [
  "get_activity_data",
  "get_queue",
  "get_queue_stats",
  "get_extracts",
  "get_learning_items",
  "get_due_items",
  "get_dashboard_stats",
  "get_category_stats",
  "get_memory_stats",
];

/**
 * Mock document for browser testing
 */
const MOCK_DOCUMENT = {
  id: "mock-doc-1",
  title: "Sample Document (Browser Mode)",
  filePath: "/sample.pdf",
  fileType: "pdf",
  dateAdded: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  extractCount: 0,
  learningItemCount: 0,
  pageCount: 10,
  currentPage: 1,
  priorityRating: 3,
  priorityScore: 60,
  isArchived: false,
  isFavorite: false,
  tags: ["demo", "browser-mode"],
  metadata: {
    createdAt: new Date().toISOString(),
  },
};

/**
 * Browser mock implementation for invoke commands
 * Returns mock data or throws with helpful error
 */
function browserMockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  console.warn(`[Browser Mock] Tauri command "${command}" called. Running in browser mode.`);

  // Special handling for import commands - return a mock document for testing UI
  if (command === "import_document" || command === "import_documents") {
    console.log("[Browser Mock] Returning mock document for UI testing");
    return Promise.resolve([MOCK_DOCUMENT] as T);
  }

  // Check if this command has mock data
  const mockKey = command as keyof typeof MOCK_DATA;
  if (mockKey in MOCK_DATA) {
    return Promise.resolve(MOCK_DATA[mockKey] as T);
  }

  // Return empty arrays for commands that typically return arrays
  if (command.startsWith("get_") || ARRAY_RETURN_COMMANDS.includes(command)) {
    return Promise.resolve([] as T);
  }
  if (command.startsWith("set_") || command.startsWith("update_") || command.startsWith("create_")) {
    return Promise.resolve(undefined as T);
  }

  // For commands that modify data, just return undefined
  return Promise.resolve(undefined as T);
}

/**
 * Browser mock implementation for file picker
 */
function browserMockOpenFilePicker(): Promise<string[] | null> {
  console.warn("[Browser Mock] File picker not available in browser. Would open file dialog.");
  return Promise.resolve(null);
}

/**
 * Type-safe wrapper for Tauri invoke commands
 * Falls back to mock implementation in browser environments
 */
export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    await loadTauriAPI();
    if (!tauriInvoke) {
      throw new Error("Failed to load Tauri invoke API");
    }
    try {
      return await tauriInvoke<T>(command, args);
    } catch (error) {
      console.error(`Tauri command "${command}" failed:`, error);
      throw error;
    }
  } else {
    // Browser environment - use mock
    return browserMockInvoke<T>(command, args);
  }
}

/**
 * Open file picker dialog
 * Falls back to mock implementation in browser environments
 */
export async function openFilePicker(options?: {
  title?: string;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string[] | null> {
  if (isTauri()) {
    await loadTauriDialogAPI();
    if (!tauriDialogOpen) {
      throw new Error("Failed to load Tauri dialog API");
    }
    const selected = await tauriDialogOpen({
      title: options?.title ?? "Select Files",
      multiple: options?.multiple ?? false,
      filters: options?.filters,
    });

    if (selected === null) return null;
    return Array.isArray(selected) ? selected : [selected];
  } else {
    return browserMockOpenFilePicker();
  }
}

/**
 * Open folder picker dialog
 * Falls back to mock implementation in browser environments
 */
export async function openFolderPicker(options?: {
  title?: string;
}): Promise<string | null> {
  if (isTauri()) {
    await loadTauriDialogAPI();
    if (!tauriDialogOpen) {
      throw new Error("Failed to load Tauri dialog API");
    }
    return await tauriDialogOpen({
      title: options?.title ?? "Select Folder",
      directory: true,
    }) as Promise<string | null>;
  } else {
    console.warn("[Browser Mock] Folder picker not available in browser.");
    return Promise.resolve(null);
  }
}

/**
 * Open URL in external browser
 * Uses Tauri's open command if available, otherwise falls back to window.open
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await invokeCommand("plugin:shell|open", { path: url });
    } catch (error) {
      console.error("Failed to open URL with Tauri shell, falling back to window.open:", error);
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
}

/**
 * Type alias for unlisten function
 */
export type UnlistenFn = () => void;

/**
 * Listen to Tauri events
 * Falls back to mock implementation in browser environments
 */
export async function listen<T>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<UnlistenFn> {
  if (isTauri()) {
    await loadTauriEventAPI();
    if (!tauriEventListen) {
      throw new Error("Failed to load Tauri event API");
    }
    return await tauriEventListen(event, handler);
  } else {
    // Browser environment - return a no-op unlisten function
    console.warn(`[Browser Mock] Event listener for "${event}" not available in browser.`);
    return () => {};
  }
}
