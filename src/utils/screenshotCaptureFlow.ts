import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/window";
import {
  captureAppWindow,
  captureScreenByIndex,
  getScreenInfo,
  saveScreenshotAsDocument,
  ScreenInfo,
} from "./screenshotCapture";

export type ScreenshotSelectionMode = "region" | "screen" | "app";

export interface ScreenshotSelection {
  mode: ScreenshotSelectionMode;
  screenIndex: number;
  rect?: { x: number; y: number; width: number; height: number };
}

const OVERLAY_LABEL = "screenshot-overlay";
const SELECTION_EVENT = "screenshot-selection";
const CANCEL_EVENT = "screenshot-cancel";

export async function captureScreenshotWithOverlay(
  screenIndex?: number
): Promise<string | null> {
  const screen = await resolveScreenInfo(screenIndex);
  if (!screen) {
    return null;
  }

  const selection = await openOverlay(screen);
  if (!selection) {
    return null;
  }

  await delay(150);

  if (selection.mode === "app") {
    return await captureAppWindow();
  }

  const base64Image = await captureScreenByIndex(selection.screenIndex);

  if (selection.mode === "screen") {
    return base64Image;
  }

  if (!selection.rect) {
    return null;
  }

  return await cropBase64Image(base64Image, selection.rect);
}

export async function captureAndSaveScreenshot(screenIndex?: number): Promise<void> {
  const base64Image = await captureScreenshotWithOverlay(screenIndex);
  if (!base64Image) {
    return;
  }

  await saveScreenshotAsDocument(base64Image);
}

async function resolveScreenInfo(screenIndex?: number): Promise<ScreenInfo | null> {
  try {
    const screens = await getScreenInfo();
    if (!screens.length) {
      return null;
    }

    if (screenIndex !== undefined) {
      return screens.find((screen) => screen.index === screenIndex) || screens[0];
    }

    return screens.find((screen) => screen.is_primary) || screens[0];
  } catch (error) {
    console.error("Failed to resolve screen info:", error);
    return null;
  }
}

async function openOverlay(screen: ScreenInfo): Promise<ScreenshotSelection | null> {
  const existing = WebviewWindow.getByLabel(OVERLAY_LABEL);
  if (existing) {
    try {
      await existing.close();
    } catch {
      // Ignore failures closing the stale overlay window.
    }
  }

  const scaleFactor = screen.scale_factor || window.devicePixelRatio || 1;
  const width = Math.round(screen.width / scaleFactor);
  const height = Math.round(screen.height / scaleFactor);
  const x = Math.round((screen.x ?? 0) / scaleFactor);
  const y = Math.round((screen.y ?? 0) / scaleFactor);

  const url = `/#/screenshot-overlay?screen=${screen.index}&scale=${scaleFactor}`;

  const overlay = new WebviewWindow(OVERLAY_LABEL, {
    url,
    x,
    y,
    width,
    height,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focus: true,
  });

  await overlay.show();
  await overlay.setFocus();

  return await new Promise((resolve) => {
    let settled = false;
    let unlistenAll = () => {};

    const finalize = async (value: ScreenshotSelection | null) => {
      if (settled) return;
      settled = true;
      unlistenAll();
      resolve(value);
    };

    void (async () => {
      try {
        const unlistenSelection = await listen<ScreenshotSelection>(SELECTION_EVENT, (event) => {
          finalize(event.payload);
        });
        const unlistenCancel = await listen(CANCEL_EVENT, () => {
          finalize(null);
        });
        unlistenAll = () => {
          unlistenSelection();
          unlistenCancel();
        };
      } catch {
        finalize(null);
      }
    })();
  });
}

async function cropBase64Image(
  base64Image: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await loadBase64Image(base64Image);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to crop screenshot");
  }

  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL("image/png").split(",")[1];
}

function loadBase64Image(base64Image: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load screenshot image"));
    image.src = `data:image/png;base64,${base64Image}`;
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
