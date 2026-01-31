import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewQueueView } from "../ReviewQueueView";
import type { QueueItem } from "../../../types/queue";

const mockStore = vi.hoisted(() => ({
  items: [
    {
      id: "item-1",
      documentId: "doc-1",
      documentTitle: "Reading Item",
      itemType: "document",
      priority: 7,
      estimatedTime: 5,
      tags: ["History"],
      progress: 20,
    },
    {
      id: "item-2",
      documentId: "doc-2",
      documentTitle: "Review Item",
      itemType: "learning-item",
      priority: 9,
      estimatedTime: 2,
      tags: ["Science"],
      progress: 40,
    },
  ] as QueueItem[],
  isLoading: false,
  error: null,
  searchQuery: "",
  setSearchQuery: vi.fn(),
  loadQueue: vi.fn(),
  loadStats: vi.fn(),
  selectedIds: new Set<string>(),
  setSelected: vi.fn(),
  selectAll: vi.fn(),
  clearSelection: vi.fn(),
  bulkSuspend: vi.fn(),
  bulkUnsuspend: vi.fn(),
  bulkDelete: vi.fn(),
  bulkOperationLoading: false,
  bulkOperationResult: null,
  clearBulkResult: vi.fn(),
}));

vi.mock("../../../stores/queueStore", () => ({
  useQueueStore: () => mockStore,
}));

beforeEach(() => {
  mockStore.loadQueue.mockClear();
  mockStore.loadStats.mockClear();
});

describe("ReviewQueueView", () => {
  it("renders session actions and queue toggle", () => {
    render(<ReviewQueueView />);
    expect(screen.getByText("Start Optimal Session")).toBeInTheDocument();
    expect(screen.getAllByText("Reading Queue").length).toBeGreaterThan(0);
  });

  it("shows inspector for selected item", () => {
    render(<ReviewQueueView />);
    fireEvent.click(screen.getAllByText("Reading Item")[0]);
    expect(screen.getByText("Inspector")).toBeInTheDocument();
    expect(screen.getAllByText("Reading Item").length).toBeGreaterThan(0);
  });

  it("routes optimal session to scroll mode when available", () => {
    const onOpenScrollMode = vi.fn();
    render(<ReviewQueueView onOpenScrollMode={onOpenScrollMode} />);
    fireEvent.click(screen.getByText("Start Optimal Session"));
    expect(onOpenScrollMode).toHaveBeenCalledTimes(1);
  });
});
