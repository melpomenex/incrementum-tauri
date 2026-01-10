import type { QueueItem } from "../types/queue";

export type PriorityPreset =
  | "maximize-retention"
  | "minimize-time"
  | "aggressive-catchup"
  | "exploratory"
  | "project-focused";

export type PriorityVector = {
  retentionRisk: number;
  cognitiveLoad: number;
  timeEfficiency: number;
  userIntent: number;
  overduePenalty: number;
};

export type QueueStatus = "new" | "learning" | "review" | "drifted";

export type SessionBlock = {
  id: string;
  title: string;
  timeBudgetMinutes: number;
  items: QueueItem[];
  safeStopCount: number;
};

const DEFAULT_TIME_PER_ITEM = 2;

const priorityPresets: Record<PriorityPreset, PriorityVector> = {
  "maximize-retention": {
    retentionRisk: 0.35,
    cognitiveLoad: 0.15,
    timeEfficiency: 0.15,
    userIntent: 0.15,
    overduePenalty: 0.2,
  },
  "minimize-time": {
    retentionRisk: 0.2,
    cognitiveLoad: 0.2,
    timeEfficiency: 0.3,
    userIntent: 0.15,
    overduePenalty: 0.15,
  },
  "aggressive-catchup": {
    retentionRisk: 0.25,
    cognitiveLoad: 0.1,
    timeEfficiency: 0.15,
    userIntent: 0.1,
    overduePenalty: 0.4,
  },
  exploratory: {
    retentionRisk: 0.2,
    cognitiveLoad: 0.25,
    timeEfficiency: 0.15,
    userIntent: 0.3,
    overduePenalty: 0.1,
  },
  "project-focused": {
    retentionRisk: 0.2,
    cognitiveLoad: 0.2,
    timeEfficiency: 0.15,
    userIntent: 0.35,
    overduePenalty: 0.1,
  },
};

export function getPriorityVector(item: QueueItem): PriorityVector {
  const now = Date.now();
  const due = item.dueDate ? new Date(item.dueDate).getTime() : null;
  const overdueDays = due ? Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24))) : 0;
  const typeLoad = item.itemType === "document" ? 75 : item.itemType === "extract" ? 55 : 35;
  const timeEfficiency = Math.max(20, 100 - Math.min(90, item.estimatedTime * 10));
  const userIntent = item.tags?.length ? Math.min(90, 40 + item.tags.length * 8) : 35;

  return {
    retentionRisk: clamp(item.priority * 10, 20, 95),
    cognitiveLoad: clamp(typeLoad + (item.progress < 30 ? 10 : 0), 15, 90),
    timeEfficiency,
    userIntent,
    overduePenalty: clamp(overdueDays * 12, 0, 90),
  };
}

export function getPriorityScore(item: QueueItem, preset: PriorityPreset): number {
  const vector = getPriorityVector(item);
  const weights = priorityPresets[preset];
  return Math.round(
    vector.retentionRisk * weights.retentionRisk +
      vector.cognitiveLoad * weights.cognitiveLoad +
      vector.timeEfficiency * weights.timeEfficiency +
      vector.userIntent * weights.userIntent +
      vector.overduePenalty * weights.overduePenalty
  );
}

export function getQueueStatus(item: QueueItem): QueueStatus {
  const due = item.dueDate ? new Date(item.dueDate).getTime() : null;
  if (due && due < Date.now()) return "drifted";
  if (item.itemType === "learning-item") return "review";
  if (item.itemType === "extract") return "learning";
  return "new";
}

export function isScheduledItem(item: QueueItem): boolean {
  return Boolean(item.dueDate);
}

export function getTimeEstimateRange(item: QueueItem): { min: number; max: number } {
  const base = item.estimatedTime || DEFAULT_TIME_PER_ITEM;
  const variance = item.itemType === "document" ? 0.5 : item.itemType === "extract" ? 0.35 : 0.2;
  return {
    min: Math.max(1, Math.round(base * (1 - variance))),
    max: Math.max(1, Math.round(base * (1 + variance))),
  };
}

export function formatMinutesRange(range: { min: number; max: number }): string {
  if (range.min === range.max) return `${range.min} min`;
  return `${range.min}-${range.max} min`;
}

export function buildSessionBlocks(items: QueueItem[]): SessionBlock[] {
  const overdue = items.filter((item) => getQueueStatus(item) === "drifted");
  const learning = items.filter((item) => item.itemType === "learning-item");
  const reading = items.filter((item) => item.itemType !== "learning-item");

  const blocks: SessionBlock[] = [];
  if (overdue.length > 0) {
    blocks.push(buildBlock("overdue", "Overdue Rescue", overdue, 10));
  }
  if (learning.length > 0) {
    blocks.push(buildBlock("maintenance", "High-Retention Maintenance", learning, 15));
  }
  if (reading.length > 0) {
    blocks.push(buildBlock("explore", "New Material Exploration", reading, 20));
  }
  if (blocks.length === 0) {
    blocks.push(buildBlock("empty", "Focus Block", items, 15));
  }
  return blocks;
}

function buildBlock(id: string, title: string, items: QueueItem[], timeBudgetMinutes: number): SessionBlock {
  const safeStopCount = computeSafeStop(items, timeBudgetMinutes);
  return { id, title, timeBudgetMinutes, items, safeStopCount };
}

function computeSafeStop(items: QueueItem[], timeBudgetMinutes: number): number {
  let total = 0;
  let count = 0;
  for (const item of items) {
    const estimate = item.estimatedTime || DEFAULT_TIME_PER_ITEM;
    if (total + estimate > timeBudgetMinutes) {
      return Math.max(1, count);
    }
    total += estimate;
    count += 1;
  }
  return Math.max(1, count);
}

export function getStatusLabel(status: QueueStatus): string {
  switch (status) {
    case "drifted":
      return "Drifted";
    case "review":
      return "Review";
    case "learning":
      return "Learning";
    default:
      return "New";
  }
}

export function getFsrsMetrics(item: QueueItem): {
  stability: number;
  difficulty: number;
  retrievability: number;
  nextIntervalDays: number;
} {
  const stability = Math.max(1, Math.round(30 - item.priority));
  const difficulty = Math.min(10, Math.max(1, Math.round(item.priority / 2)));
  const retrievability = Math.max(0.2, Math.min(0.95, 1 - item.priority / 100));
  const nextIntervalDays = item.dueDate
    ? Math.max(1, Math.round((new Date(item.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : Math.max(1, Math.round(item.estimatedTime));
  return { stability, difficulty, retrievability, nextIntervalDays };
}

export function getReadingImpact(item: QueueItem): string {
  if (item.itemType === "document") return "Est. 4 cards (~3 min/day)";
  if (item.itemType === "extract") return "Est. 2 cards (~1 min/day)";
  return "Est. 1 card (~30s/day)";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
