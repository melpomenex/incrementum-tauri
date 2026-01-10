import { useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import type { LearningItem, PreviewIntervals } from "../../api/review";
import { formatInterval } from "../../api/review";

interface ReviewTransparencyPanelProps {
  card: LearningItem;
  previewIntervals: PreviewIntervals | null;
}

export function ReviewTransparencyPanel({ card, previewIntervals }: ReviewTransparencyPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [showSuspendNote, setShowSuspendNote] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="w-4 h-4" />
          FSRS Transparency
        </div>
        <button
          onClick={() => setShowRaw((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showRaw ? "Hide raw" : "Show raw"}
        </button>
      </div>

      <div className="text-xs text-muted-foreground">
        Stability {card.memory_state?.stability?.toFixed(2) ?? "n/a"} • Difficulty{" "}
        {card.memory_state?.difficulty?.toFixed(2) ?? "n/a"}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-3 h-3" />
          Simulated next intervals
        </div>
        {previewIntervals ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {([
              ["again", "Again"],
              ["hard", "Hard"],
              ["good", "Good"],
              ["easy", "Easy"],
            ] as const).map(([key, label]) => (
              <div key={key} className="bg-muted/50 rounded-md p-2">
                <div className="text-muted-foreground">{label}</div>
                <div className="text-foreground font-semibold">
                  {formatInterval(previewIntervals[key])}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No preview available.</div>
        )}
        <button
          onClick={() => setShowSuspendNote((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showSuspendNote ? "Hide suspend simulation" : "Simulate suspension"}
        </button>
        {showSuspendNote && (
          <div className="text-[11px] text-muted-foreground">
            Suspension pauses scheduling; the next review is deferred until you unsuspend the card.
          </div>
        )}
      </div>

      {showRaw && (
        <pre className="text-[10px] whitespace-pre-wrap bg-background border border-border rounded p-2">
{JSON.stringify(card, null, 2)}
        </pre>
      )}
    </div>
  );
}
