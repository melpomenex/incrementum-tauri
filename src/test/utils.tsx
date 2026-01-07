/**
 * Test utilities and helpers
 */

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  // Create a fresh QueryClient for each test to avoid state leakage
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Re-export testing library utilities
 */
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

/**
 * Mock data generators
 */
export const mockQueueItem = (overrides = {}) => ({
  id: "test-id-1",
  documentId: "doc-1",
  documentTitle: "Test Document",
  itemType: "extract" as const,
  priority: 5.0,
  dueDate: new Date().toISOString(),
  estimatedTime: 10,
  tags: ["test"],
  progress: 50,
  ...overrides,
});

export const mockDocument = (overrides = {}) => ({
  id: "doc-1",
  title: "Test Document",
  fileType: "pdf",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockExtract = (overrides = {}) => ({
  id: "extract-1",
  documentId: "doc-1",
  content: "Test extract content",
  highlightedText: "Test highlight",
  pageNumber: 1,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockLearningItem = (overrides = {}) => ({
  id: "item-1",
  documentId: "doc-1",
  question: "Test question?",
  answer: "Test answer",
  itemType: "Flashcard" as const,
  state: "New" as const,
  difficulty: 5,
  interval: 1,
  dueDate: new Date().toISOString(),
  ...overrides,
});

export const mockCategory = (overrides = {}) => ({
  id: "cat-1",
  name: "Test Category",
  color: "#ff0000",
  ...overrides,
});

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock Tauri invoke function
 */
export function createMockInvoke<T>(returnValue: T) {
  return vi.fn().mockResolvedValue(returnValue);
}

/**
 * Mock Tauri command responses
 */
export const mockTauriCommands = {
  getQueue: (items: any[] = []) => createMockInvoke(items),
  getQueueStats: (stats: any = {}) => createMockInvoke(stats),
  getDocuments: (docs: any[] = []) => createMockInvoke(docs),
  getExtracts: (extracts: any[] = []) => createMockInvoke(extracts),
  getLearningItems: (items: any[] = []) => createMockInvoke(items),
  getCategories: (categories: any[] = []) => createMockInvoke(categories),
  getReviewQueue: (items: any[] = []) => createMockInvoke(items),
};
