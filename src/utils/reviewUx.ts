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

export type QueueStatus = "new" | "learning" | "review" | "drifted" | "due" | "due-overdue" | "scheduled";

export type SessionBlock = {
  id: string;
  title: string;
  timeBudgetMinutes: number;
  items: QueueItem[];
  safeStopCount: number;
};

export type SessionBlockTimeBudgets = {
  overdue: number;
  maintenance: number;
  explore: number;
  empty: number;
};

export type SessionFilters = {
  tags: string[];
  categories: string[];
  priorityRange: { min: number; max: number };
  excludeSuspended: boolean;
};

export type SessionItemTypes = {
  documents: boolean;
  extracts: boolean;
  learningItems: boolean;
};

export type SessionCustomizationOptions = {
  maxItems?: number;
  blockTimeBudgets?: SessionBlockTimeBudgets;
  filters?: SessionFilters;
  itemTypes?: SessionItemTypes;
  priorityPreset?: PriorityPreset;
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
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (item.itemType === "learning-item") return "review";
  if (item.itemType === "extract") return "learning";

  // FSRS-based document status
  if (item.itemType === "document") {
    if (!due) {
      // New document - never been scheduled/read
      return "new";
    }
    if (due < now - oneDayMs) {
      // Overdue by more than a day
      return "drifted";
    }
    if (due <= now) {
      // Due today or within the last day
      return "due";
    }
    // Scheduled for future
    return "scheduled";
  }

  return "new";
}

// Get detailed FSRS scheduling info for display
export function getFsrsSchedulingInfo(item: QueueItem): {
  status: string;
  statusLabel: string;
  isDue: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
  nextReviewDate: Date | null;
} {
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const now = new Date();
  const isDue = due ? due <= now : false;
  const isOverdue = due ? due < now : false;
  const daysUntilDue = due ? Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

  let status = "unknown";
  let statusLabel = "Unknown";

  if (item.itemType === "learning-item") {
    status = "review";
    statusLabel = "Review";
  } else if (item.itemType === "extract") {
    status = "learning";
    statusLabel = "Learning";
  } else if (item.itemType === "document") {
    if (!due) {
      status = "new";
      statusLabel = "New";
    } else if (isOverdue) {
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      if (daysOverdue >= 7) {
        status = "drifted";
        statusLabel = `Overdue (${daysOverdue}d)`;
      } else {
        status = "due-overdue";
        statusLabel = "Overdue";
      }
    } else if (isDue) {
      status = "due";
      statusLabel = "Due Today";
    } else {
      status = "scheduled";
      if (daysUntilDue !== null) {
        if (daysUntilDue <= 1) {
          statusLabel = "Tomorrow";
        } else if (daysUntilDue <= 7) {
          statusLabel = `In ${daysUntilDue}d`;
        } else {
          statusLabel = `${daysUntilDue}d`;
        }
      } else {
        statusLabel = "Scheduled";
      }
    }
  }

  return {
    status,
    statusLabel,
    isDue,
    isOverdue,
    daysUntilDue,
    nextReviewDate: due,
  };
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

export function buildSessionBlocks(items: QueueItem[], options?: SessionCustomizationOptions): SessionBlock[] {
  const filteredItems = applyFilters(items, options);
  const prioritizedItems = applyMaxItems(filteredItems, options?.maxItems);
  const timeBudgets = options?.blockTimeBudgets || { overdue: 10, maintenance: 15, explore: 20, empty: 15 };

  const overdue = prioritizedItems.filter((item) => getQueueStatus(item) === "drifted");
  const learning = prioritizedItems.filter((item) => item.itemType === "learning-item");
  const reading = prioritizedItems.filter((item) => item.itemType !== "learning-item");

  const blocks: SessionBlock[] = [];
  if (overdue.length > 0) {
    blocks.push(buildBlock("overdue", "Overdue Rescue", overdue, timeBudgets.overdue));
  }
  if (learning.length > 0) {
    blocks.push(buildBlock("maintenance", "High-Retention Maintenance", learning, timeBudgets.maintenance));
  }
  if (reading.length > 0) {
    blocks.push(buildBlock("explore", "New Material Exploration", reading, timeBudgets.explore));
  }
  if (blocks.length === 0) {
    blocks.push(buildBlock("empty", "Focus Block", prioritizedItems, timeBudgets.empty));
  }
  return blocks;
}

function applyFilters(items: QueueItem[], options?: SessionCustomizationOptions): QueueItem[] {
  let filtered = [...items];

  // Apply item type filter
  if (options?.itemTypes) {
    filtered = filtered.filter((item) => {
      if (item.itemType === "document") return options.itemTypes!.documents;
      if (item.itemType === "extract") return options.itemTypes!.extracts;
      if (item.itemType === "learning-item") return options.itemTypes!.learningItems;
      return true;
    });
  }

  // Apply tags filter
  if (options?.filters?.tags && options.filters.tags.length > 0) {
    filtered = filtered.filter((item) =>
      options.filters!.tags.some((tag) => item.tags?.includes(tag))
    );
  }

  // Apply category filter
  if (options?.filters?.categories && options.filters.categories.length > 0) {
    filtered = filtered.filter((item) =>
      options.filters!.categories.includes(item.category || "")
    );
  }

  // Apply priority range filter
  if (options?.filters?.priorityRange) {
    const { min, max } = options.filters.priorityRange;
    const preset = options.priorityPreset || "maximize-retention";
    filtered = filtered.filter(
      (item) => getPriorityScore(item, preset) >= min && getPriorityScore(item, preset) <= max
    );
  }

  // Apply exclude suspended filter
  if (options?.filters?.excludeSuspended) {
    filtered = filtered.filter((item) => item.status !== "suspended");
  }

  return filtered;
}

function applyMaxItems(items: QueueItem[], maxItems?: number): QueueItem[] {
  if (maxItems && maxItems > 0) {
    return items.slice(0, maxItems);
  }
  return items;
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
    case "due-overdue":
      return "Overdue";
    case "due":
      return "Due Today";
    case "scheduled":
      return "Scheduled";
    case "review":
      return "Review";
    case "learning":
      return "Learning";
    case "new":
      return "New";
    default:
      return "Unknown";
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
