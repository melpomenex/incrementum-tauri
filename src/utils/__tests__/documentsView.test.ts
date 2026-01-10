import { describe, it, expect } from "vitest";
import type { Document } from "../../types/document";
import { parseDocumentSearch, matchesDocumentSearch, sortDocuments } from "../documentsView";

const baseDoc = (overrides: Partial<Document>): Document => ({
  id: "1",
  title: "Test Document",
  filePath: "/tmp/test.pdf",
  fileType: "pdf",
  tags: ["History"],
  dateAdded: "2024-01-01T00:00:00.000Z",
  dateModified: "2024-01-02T00:00:00.000Z",
  extractCount: 0,
  learningItemCount: 0,
  priorityRating: 1,
  prioritySlider: 0,
  priorityScore: 10,
  isArchived: false,
  isFavorite: false,
  ...overrides,
});

describe("parseDocumentSearch", () => {
  it("parses tag, source, queue, and extracts tokens", () => {
    const tokens = parseDocumentSearch("tag:History source:pdf queue:in extracts=0 other");
    expect(tokens.tags).toEqual(["History"]);
    expect(tokens.sources).toEqual(["pdf"]);
    expect(tokens.queue).toBe("in");
    expect(tokens.extracts).toEqual({ op: "=", value: 0 });
    expect(tokens.text).toBe("other");
  });

  it("treats unknown tokens as text", () => {
    const tokens = parseDocumentSearch("foo:bar title");
    expect(tokens.text).toBe("foo:bar title");
  });
});

describe("matchesDocumentSearch", () => {
  it("matches tag and extracts filters", () => {
    const doc = baseDoc({ extractCount: 0, tags: ["History", "World"] });
    const tokens = parseDocumentSearch("tag:History extracts=0");
    expect(matchesDocumentSearch(doc, tokens)).toBe(true);
  });

  it("filters by source type", () => {
    const doc = baseDoc({ fileType: "epub" });
    const tokens = parseDocumentSearch("source:pdf");
    expect(matchesDocumentSearch(doc, tokens)).toBe(false);
  });
});

describe("sortDocuments", () => {
  it("keeps stable order when values tie", () => {
    const docs: Document[] = [
      baseDoc({ id: "a", title: "Alpha", priorityScore: 10 }),
      baseDoc({ id: "b", title: "Bravo", priorityScore: 10 }),
    ];
    const sorted = sortDocuments(docs, "priority", "desc");
    expect(sorted.map((doc) => doc.id)).toEqual(["a", "b"]);
  });

  it("sorts by item type", () => {
    const docs: Document[] = [
      baseDoc({ id: "a", fileType: "pdf" }),
      baseDoc({ id: "b", fileType: "epub" }),
    ];
    const sorted = sortDocuments(docs, "type", "asc");
    expect(sorted.map((doc) => doc.id)).toEqual(["b", "a"]);
  });
});
