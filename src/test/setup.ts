/**
 * Vitest setup file
 * Runs before each test file
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn(),
  listen: vi.fn(() => Promise.resolve({ unregister: vi.fn() })),
}));

// Mock PDF.js for test environment to avoid DOMMatrix dependency.
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 0,
      getPage: vi.fn(),
    }),
  })),
}));

// Mock window.__TAURI__ for Tauri 2.0
Object.defineProperty(window, "__TAURI__", {
  value: {
    core: {
      invoke: vi.fn(),
    },
    event: {
      emit: vi.fn(),
      listen: vi.fn(() => Promise.resolve({ unregister: vi.fn() })),
    },
  },
  writable: true,
});

// Mock matchMedia for components relying on PWA/media queries.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Suppress console errors in tests (optional, for cleaner output)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
