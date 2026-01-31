import { describe, it, expect } from "vitest";
import type { QueueItem } from "../../types/queue";
import {
  buildSessionBlocks,
  getPriorityScore,
  getPriorityVector,
  getQueueStatus,
  getTimeEstimateRange,
  isScheduledItem,
} from "../reviewUx";

const baseItem = (overrides: Partial<QueueItem>): QueueItem => ({
  id: "1",
  documentId: "doc",
  documentTitle: "Doc",
  itemType: "learning-item",
  priority: 7,
  estimatedTime: 3,
  tags: ["History"],
  progress: 20,
  ...overrides,
});

describe("reviewUx helpers", () => {
  it("computes priority vector ranges", () => {
    const vector = getPriorityVector(baseItem({}));
    expect(vector.retentionRisk).toBeGreaterThan(0);
    expect(vector.cognitiveLoad).toBeGreaterThan(0);
  });

  it("scores items using presets", () => {
    const score = getPriorityScore(baseItem({ priority: 9 }), "maximize-retention");
    expect(score).toBeGreaterThan(0);
  });

  it("builds session blocks", () => {
    const blocks = buildSessionBlocks([baseItem({ itemType: "document" })]);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].items.length).toBe(1);
  });

  it("returns drifted status for overdue items", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(getQueueStatus(baseItem({ itemType: "document", dueDate: twoDaysAgo }))).toBe("drifted");
  });

  it("creates time estimate ranges", () => {
    const range = getTimeEstimateRange(baseItem({ estimatedTime: 4 }));
    expect(range.min).toBeLessThanOrEqual(range.max);
  });

  it("treats items with due dates as scheduled", () => {
    expect(isScheduledItem(baseItem({ dueDate: new Date().toISOString() }))).toBe(true);
  });
});
