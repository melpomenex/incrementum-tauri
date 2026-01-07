import { invoke } from "@tauri-apps/api/core";

/**
 * Type-safe wrapper for Tauri invoke commands
 */
export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Tauri command "${command}" failed:`, error);
    throw error;
  }
}

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return "__TAURI__" in window;
}

/**
 * Open URL in external browser
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    // Tauri 2.0 API - will implement later
    console.log("Opening URL:", url);
  } else {
    window.open(url, "_blank");
  }
}
