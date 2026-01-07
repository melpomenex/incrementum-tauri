/**
 * Application constants
 */

export const APP_NAME = "Incrementum";
export const APP_VERSION = "2.0.0";

export const KEYBOARD_SHORTCUTS = {
  COMMAND_PALETTE: "Cmd+Shift+P",
  SEARCH: "Cmd+K",
  NEW_DOCUMENT: "Cmd+N",
  NEW_EXTRACT: "Cmd+Shift+E",
  START_REVIEW: "Cmd+R",
  TOGGLE_SIDEBAR: "Cmd+B",
  GO_TO_QUEUE: "Cmd+1",
  GO_TO_REVIEW: "Cmd+2",
  GO_TO_DOCUMENTS: "Cmd+3",
  GO_TO_ANALYTICS: "Cmd+4",
  GO_TO_SETTINGS: "Cmd+,",
} as const;

export const ALGORITHM_NAMES = {
  fsrs: "FSRS-5",
  sm2: "SuperMemo 2",
} as const;

export const FILE_TYPE_ICONS = {
  pdf: "file-text",
  epub: "book-open",
  markdown: "file-code",
  html: "globe",
  youtube: "youtube",
  audio: "headphones",
  video: "video",
  other: "file",
} as const;

export const RATING_LABELS = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
} as const;

export const RATING_COLORS = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-blue-500",
  4: "text-green-500",
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".epub",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".txt",
] as const;
