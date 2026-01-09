/**
 * Screenshot capture utilities
 */

import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";

export interface ScreenInfo {
  index: number;
  width: number;
  height: number;
  scale_factor: number;
  is_primary: boolean;
}

/**
 * Get information about all available screens
 */
export async function getScreenInfo(): Promise<ScreenInfo[]> {
  try {
    const screens = await invoke<ScreenInfo[]>("get_screen_info");
    return screens;
  } catch (error) {
    console.error("Failed to get screen info:", error);
    throw new Error("Failed to retrieve screen information");
  }
}

/**
 * Capture a screenshot of the primary screen
 */
export async function captureScreenshot(): Promise<string> {
  try {
    const base64Image = await invoke<string>("capture_screenshot");
    return base64Image;
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    throw new Error("Failed to capture screenshot");
  }
}

/**
 * Capture a screenshot of a specific screen by index
 */
export async function captureScreenByIndex(index: number): Promise<string> {
  try {
    const base64Image = await invoke<string>("capture_screen_by_index", { index });
    return base64Image;
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    throw new Error(`Failed to capture screen ${index}`);
  }
}

/**
 * Save a screenshot as a document
 */
export async function saveScreenshotAsDocument(
  base64Image: string,
  title?: string
): Promise<any> {
  try {
    const timestamp = new Date().toISOString();
    const fileName = `screenshot-${timestamp}.png`;
    const docTitle = title || `Screenshot - ${new Date().toLocaleString()}`;

    const documentData = {
      title: docTitle,
      filePath: fileName,
      fileType: "image",
      content: base64Image,
      contentHash: await generateHash(base64Image),
      category: "Screenshots",
      tags: ["screenshot", "image-capture"],
      dateAdded: timestamp,
      dateModified: timestamp,
      priorityRating: 0,
      prioritySlider: 0,
      priorityScore: 3,
      isArchived: false,
      isFavorite: false,
      metadata: {
        imageFormat: "png",
        capturedAt: timestamp,
      },
    };

    const savedDoc = await invoke("save_document", { document: documentData });
    return savedDoc;
  } catch (error) {
    console.error("Failed to save screenshot as document:", error);
    throw error;
  }
}

/**
 * Generate a simple hash from a string
 */
async function generateHash(content: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Convert base64 image to Blob
 */
export function base64ToBlob(base64: string, type: string = "image/png"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

/**
 * Download a screenshot to the user's computer
 */
export function downloadScreenshot(base64Image: string, filename?: string): void {
  const blob = base64ToBlob(base64Image, "image/png");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `screenshot-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
