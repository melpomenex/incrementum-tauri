import { useState, useEffect } from "react";
import { Activity, Clock, Zap, Trash2 } from "lucide-react";
import { performanceMonitor, usePerformance } from "../../utils/performance";

interface MetricRowProps {
  name: string;
  count: number;
  avg: number;
  min: number;
  max: number;
}

function MetricRow({ name, count, avg, min, max }: MetricRowProps) {
  const getDurationColor = (ms: number) => {
    if (ms < 50) return "text-green-500";
    if (ms < 200) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="grid grid-cols-6 gap-2 px-3 py-2 text-sm hover:bg-muted/50 rounded">
      <div className="col-span-2 font-medium truncate" title={name}>
        {name}
      </div>
      <div className="text-muted-foreground">{count}</div>
      <div className={getDurationColor(avg)}>
        {avg.toFixed(2)}ms
      </div>
      <div className={getDurationColor(min)}>
        {min.toFixed(2)}ms
      </div>
      <div className={getDurationColor(max)}>
        {max.toFixed(2)}ms
      </div>
    </div>
  );
}

export function PerformanceMonitorPanel() {
  const { getSummary, clear } = usePerformance();
  const [summary, setSummary] = useState<ReturnType<typeof getSummary>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isVisible || isPaused) return;

    const interval = setInterval(() => {
      setSummary(getSummary());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isPaused, getSummary]);

  const handleClear = () => {
    clear();
    setSummary({});
  };

  const metrics = Object.entries(summary);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
        title="Show Performance Monitor"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[600px] max-h-[80vh] bg-background border border-border rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Performance Monitor</h3>
          <span className="text-xs text-muted-foreground">
            ({metrics.length} metrics)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded transition-colors ${
              isPaused
                ? "bg-yellow-500/20 text-yellow-500"
                : "hover:bg-muted text-muted-foreground"
            }`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Clock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
            title="Clear metrics"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
        <div className="col-span-2">Operation</div>
        <div>Count</div>
        <div>Avg</div>
        <div>Min</div>
        <div>Max</div>
      </div>

      {/* Metrics List */}
      <div className="flex-1 overflow-y-auto">
        {metrics.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No performance metrics recorded yet.
          </div>
        ) : (
          metrics
            .sort(([, a], [, b]) => b.avg - a.avg)
            .map(([name, data]) => (
              <MetricRow
                key={name}
                name={name}
                count={data.count}
                avg={data.avg}
                min={data.min}
                max={data.max}
              />
            ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Legend:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              &lt; 50ms
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              &lt; 200ms
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              &gt;= 200ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Development-only performance monitor
 */
export function DevPerformanceMonitor() {
  // Only show in development
  if (import.meta.env.DEV) {
    return <PerformanceMonitorPanel />;
  }
  return null;
}
