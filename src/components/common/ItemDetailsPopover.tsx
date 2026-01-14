import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, X } from "lucide-react";
import { getDocument } from "../../api/documents";
import { getExtract } from "../../api/extracts";
import { getLearningItem } from "../../api/learning-items";
import { getAlgorithmParams } from "../../api/algorithm";
import { previewReviewIntervals, formatInterval, type PreviewIntervals } from "../../api/review";
import { cn } from "../../utils";

export type ItemDetailsTarget =
  | {
      type: "document";
      id: string;
      title: string;
      tags?: string[];
      category?: string;
    }
  | {
      type: "extract";
      id: string;
      title: string;
      tags?: string[];
      category?: string;
    }
  | {
      type: "learning-item";
      id: string;
      title: string;
      tags?: string[];
      category?: string;
    }
  | {
      type: "rss";
      title: string;
      source?: string;
      link?: string;
    };

interface ItemDetailsData {
  stability?: number | null;
  difficulty?: number | null;
  retrievability?: number | null;
  nextIntervalDays?: number | null;
  dueDate?: string | null;
  reps?: number | null;
  lapses?: number | null;
  previewIntervals?: PreviewIntervals | null;
  raw?: Record<string, unknown> | null;
}

interface ItemDetailsPopoverProps {
  target: ItemDetailsTarget;
  renderTrigger: (props: { onClick: () => void; isOpen: boolean; }) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

const EMPTY_DETAILS: ItemDetailsData = {
  stability: null,
  difficulty: null,
  retrievability: null,
  nextIntervalDays: null,
  dueDate: null,
  reps: null,
  lapses: null,
  previewIntervals: null,
  raw: null,
};

function formatMaybeNumber(value?: number | null, suffix?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  const formatted = Math.round(value * 100) / 100;
  return suffix ? `${formatted}${suffix}` : `${formatted}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleString();
}

function getIntervalFromDueDate(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.round(diffDays * 10) / 10;
}

async function loadItemDetails(target: ItemDetailsTarget): Promise<ItemDetailsData> {
  if (target.type === "learning-item") {
    const [item, algorithm, previewIntervals] = await Promise.all([
      getLearningItem(target.id),
      getAlgorithmParams(target.id).catch(() => null),
      previewReviewIntervals(target.id).catch(() => null),
    ]);

    const stability = algorithm?.stability ?? item?.memory_state?.stability ?? null;
    const difficulty = algorithm?.difficulty ?? item?.memory_state?.difficulty ?? null;
    const nextIntervalDays = algorithm?.interval ?? null;

    return {
      stability,
      difficulty,
      retrievability: null,
      nextIntervalDays,
      dueDate: item?.due_date ?? null,
      reps: item?.review_count ?? null,
      lapses: item?.lapses ?? null,
      previewIntervals,
      raw: item ? { ...item } : null,
    };
  }

  if (target.type === "extract") {
    const extract = await getExtract(target.id);
    return {
      stability: extract?.memory_state?.stability ?? null,
      difficulty: extract?.memory_state?.difficulty ?? null,
      retrievability: null,
      nextIntervalDays: getIntervalFromDueDate(extract?.next_review_date ?? null),
      dueDate: extract?.next_review_date ?? null,
      reps: extract?.reps ?? null,
      lapses: null,
      previewIntervals: null,
      raw: extract ? { ...extract } : null,
    };
  }

  if (target.type === "document") {
    const document = await getDocument(target.id);
    return {
      stability: document?.stability ?? null,
      difficulty: document?.difficulty ?? null,
      retrievability: null,
      nextIntervalDays: getIntervalFromDueDate(document?.nextReadingDate ?? null),
      dueDate: document?.nextReadingDate ?? null,
      reps: document?.reps ?? document?.readingCount ?? null,
      lapses: null,
      previewIntervals: null,
      raw: document ? { ...document } : null,
    };
  }

  return EMPTY_DETAILS;
}

export function ItemDetailsPopover({
  target,
  renderTrigger,
  align = "right",
  className,
}: ItemDetailsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState<ItemDetailsData>(EMPTY_DETAILS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const targetKey = useMemo(() => {
    if (target.type === "rss") return `rss:${target.title}`;
    return `${target.type}:${target.id}`;
  }, [target]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);
    setError(null);

    loadItemDetails(target)
      .then((data) => {
        if (!active) return;
        setDetails(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load item details", err);
        setError("Failed to load details");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, targetKey, target]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowRaw(false);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const tags = target.type === "rss" ? [] : target.tags ?? [];

  return (
    <div ref={wrapperRef} className={cn("relative inline-flex", className)}>
      {renderTrigger({ onClick: handleToggle, isOpen })}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-96 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              Item details
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="font-semibold text-foreground truncate">{target.title}</div>
              <div className="text-xs text-muted-foreground capitalize">{target.type.replace("-", " ")}</div>
              {target.type === "rss" && target.source && (
                <div className="text-xs text-muted-foreground">Source: {target.source}</div>
              )}
            </div>

            {(tags.length > 0 || target.category) && (
              <div className="space-y-1">
                {target.category && (
                  <div className="text-xs text-foreground/80">Category: {target.category}</div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-muted/60 text-xs text-foreground border border-border/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">Scheduling / FSRS</div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading scheduling data...
                </div>
              ) : error ? (
                <div className="text-xs text-destructive">{error}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Stability</div>
                      <div className="font-semibold text-foreground">{formatMaybeNumber(details.stability)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Difficulty</div>
                      <div className="font-semibold text-foreground">{formatMaybeNumber(details.difficulty)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Retrievability</div>
                      <div className="font-semibold text-foreground">{formatMaybeNumber(details.retrievability)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Next interval</div>
                      <div className="font-semibold text-foreground">
                        {details.nextIntervalDays === null || details.nextIntervalDays === undefined
                          ? "n/a"
                          : `${details.nextIntervalDays} days`}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Due date</div>
                      <div className="font-semibold text-foreground">{formatDate(details.dueDate)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Reps</div>
                      <div className="font-semibold text-foreground">{formatMaybeNumber(details.reps)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Lapses</div>
                      <div className="font-semibold text-foreground">{formatMaybeNumber(details.lapses)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Preview intervals</div>
                    {details.previewIntervals ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {([
                          ["again", "Again"],
                          ["hard", "Hard"],
                          ["good", "Good"],
                          ["easy", "Easy"],
                        ] as const).map(([key, label]) => (
                          <div key={key} className="rounded-md bg-muted/60 p-2">
                            <div className="text-muted-foreground">{label}</div>
                            <div className="font-semibold text-foreground">
                              {formatInterval(details.previewIntervals[key])}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Unavailable</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {details.raw && (
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setShowRaw((prev) => !prev)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showRaw ? "Hide raw data" : "Show raw data"}
                </button>
                {showRaw && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-background p-2 text-[10px] text-foreground">
{JSON.stringify(details.raw, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
