import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getViewStateKey,
  parseViewState,
  setViewState,
  serializeViewState,
} from "../readerPosition";
import type { ViewState } from "../../types/readerPosition";

const baseState = (overrides: Partial<ViewState> = {}): ViewState => ({
  docId: "doc-1",
  pageNumber: 5,
  scale: 1.25,
  zoomMode: "fit-width",
  rotation: 0,
  viewMode: "document",
  dest: { kind: "XYZ", left: 12.3456, top: 789.1234, zoom: 1.25 },
  scrollTop: 200,
  scrollPercent: 33.3333,
  updatedAt: Date.now(),
  version: 1,
  ...overrides,
});

describe("readerPosition", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("prefers documentId for view state keys", () => {
    const key = getViewStateKey({
      documentId: "doc-123",
      contentHash: "hash-abc",
      pdfFingerprint: "fp-1",
    });
    expect(key).toBe("document-view-state:doc-123");
  });

  it("falls back to content hash then fingerprint for view state keys", () => {
    expect(getViewStateKey({ documentId: null, contentHash: "hash-abc" }))
      .toBe("document-view-state:hash:hash-abc");
    expect(getViewStateKey({ documentId: null, contentHash: null, pdfFingerprint: "fp-1" }))
      .toBe("document-view-state:fingerprint:fp-1");
  });

  it("parses valid view state and rejects invalid payloads", () => {
    const valid = JSON.stringify(baseState({ updatedAt: 123 }));
    expect(parseViewState(valid)?.docId).toBe("doc-1");
    expect(parseViewState("not-json")).toBeNull();
    expect(parseViewState(JSON.stringify({ docId: "x" }))).toBeNull();
  });

  it("debounces writes and avoids duplicate persistence", () => {
    const key = "document-view-state:test";
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const state = baseState({ updatedAt: 1000 });

    setViewState(key, state, { debounceMs: 200 });
    setViewState(key, { ...state, updatedAt: 2000 }, { debounceMs: 200 });

    vi.advanceTimersByTime(200);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const saved = localStorage.getItem(key);
    expect(saved).toBeTruthy();

    // Same normalized state should not trigger another write
    setViewState(key, { ...state, updatedAt: 3000 }, { debounceMs: 200 });
    vi.advanceTimersByTime(200);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it("serializes view state payloads", () => {
    const state = baseState({ updatedAt: 500 });
    const serialized = serializeViewState(state);
    expect(serialized).toBe(JSON.stringify(state));
    expect(serializeViewState(serialized)).toBe(serialized);
    expect(serializeViewState(null)).toBeNull();
  });
});
