import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentsView } from "../DocumentsView";
import type { Document } from "../../../types/document";

const mockStore = vi.hoisted(() => ({
  documents: [
    {
      id: "doc-1",
      title: "Priority Doc",
      filePath: "/tmp/priority.pdf",
      fileType: "pdf",
      tags: ["History", "Archive", "Reading", "Extra"],
      dateAdded: "2024-01-01T00:00:00.000Z",
      dateModified: "2024-01-02T00:00:00.000Z",
      extractCount: 0,
      learningItemCount: 0,
      priorityRating: 4,
      prioritySlider: 0,
      priorityScore: 85,
      isArchived: false,
      isFavorite: false,
    },
    {
      id: "doc-2",
      title: "Secondary Doc",
      filePath: "/tmp/secondary.epub",
      fileType: "epub",
      tags: ["Science"],
      dateAdded: "2024-01-03T00:00:00.000Z",
      dateModified: "2024-01-03T00:00:00.000Z",
      extractCount: 2,
      learningItemCount: 5,
      priorityRating: 2,
      prioritySlider: 0,
      priorityScore: 40,
      isArchived: false,
      isFavorite: false,
    },
  ] as Document[],
  isLoading: false,
  isImporting: false,
  importProgress: { current: 0, total: 0 },
  error: null,
  loadDocuments: vi.fn(),
  openFilePickerAndImport: vi.fn(),
  importFromFiles: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock("../../../stores/documentStore", () => ({
  useDocumentStore: () => mockStore,
}));

vi.mock("../../../lib/pwa", () => ({
  getDeviceInfo: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPWA: false,
    isOnline: true,
    pixelRatio: 1,
    screenWidth: 1200,
    screenHeight: 800,
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  mockStore.loadDocuments.mockClear();
  mockStore.updateDocument.mockClear();
});

describe("DocumentsView", () => {
  it("restores list mode from storage", () => {
    window.localStorage.setItem("documentsViewMode", "list");
    render(<DocumentsView enableYouTubeImport={false} />);
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.queryByText("In Priority Queue")).toBeNull();
  });

  it("updates inspector on selection", () => {
    render(<DocumentsView enableYouTubeImport={false} />);
    fireEvent.click(screen.getAllByText("Priority Doc")[0]);
    expect(screen.getAllByText("Priority Doc").length).toBeGreaterThan(0);
    expect(screen.getByText("Inspector")).toBeInTheDocument();
  });

  it("shows tag overflow indicator", () => {
    render(<DocumentsView enableYouTubeImport={false} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
