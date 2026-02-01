import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../documentStore", () => ({
  useDocumentStore: {
    getState: () => ({
      documents: [{ id: "doc-1", isArchived: true }],
    }),
  },
}));

vi.mock("../collectionStore", () => ({
  useCollectionStore: {
    getState: () => ({
      activeCollectionId: null,
      documentAssignments: {},
    }),
  },
}));

import { useQueueStore } from "../queueStore";

const baseItem = {
  documentTitle: "Title",
  itemType: "document" as const,
  priority: 1,
  estimatedTime: 5,
  tags: [] as string[],
  progress: 0,
};

describe("queueStore archived filtering", () => {
  beforeEach(() => {
    useQueueStore.setState({
      items: [],
      filteredItems: [],
      selectedIds: new Set<string>(),
      searchQuery: "",
      filters: {},
      sortOptions: { field: "priority", direction: "desc" },
    });
  });

  it("excludes archived documents from filtered items", () => {
    const items = [
      { ...baseItem, id: "doc-1", documentId: "doc-1" },
      { ...baseItem, id: "doc-2", documentId: "doc-2" },
    ];

    useQueueStore.setState({ items, filteredItems: items });
    useQueueStore.getState().applyFilters();

    const filtered = useQueueStore.getState().filteredItems;
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.documentId).toBe("doc-2");
  });
});
