import { useEffect, useState } from "react";
import { BarChart } from "lucide-react";
import { getReviewStatistics } from "../../api/algorithm";

interface ReviewStatistics {
  total_items: number;
  total_reviews: number;
  total_lapses: number;
  avg_interval: number;
  retention_estimate: number;
  due_today: number;
  due_week: number;
  due_month: number;
}

export function ScheduleVisualization() {
  const [stats, setStats] = useState<ReviewStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true);
        const data = await getReviewStatistics();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load statistics");
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Schedule Overview</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Schedule Overview</h3>
        </div>
        <p className="text-muted-foreground">
          {error || "Unable to load schedule statistics"}
        </p>
      </div>
    );
  }

  // Calculate bar widths (percentage of max value)
  const maxDue = Math.max(stats.due_today, stats.due_week, stats.due_month, 1);
  const todayWidth = (stats.due_today / maxDue) * 100;
  const weekWidth = (stats.due_week / maxDue) * 100;
  const monthWidth = (stats.due_month / maxDue) * 100;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Schedule Overview</h3>
      </div>

      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total_items}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">
              {Math.round(stats.retention_estimate * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Retention Rate</div>
          </div>
        </div>

        {/* Due Items Bar Chart */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Items Due</h4>
          <div className="space-y-2">
            {/* Today */}
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">Today</div>
              <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${todayWidth}%` }}
                >
                  {todayWidth > 15 && (
                    <span className="text-xs font-medium text-primary-foreground">
                      {stats.due_today}
                    </span>
                  )}
                </div>
              </div>
              {todayWidth <= 15 && (
                <span className="w-8 text-sm text-foreground text-right">{stats.due_today}</span>
              )}
            </div>

            {/* This Week */}
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">This Week</div>
              <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${weekWidth}%` }}
                >
                  {weekWidth > 15 && (
                    <span className="text-xs font-medium text-primary-foreground">
                      {stats.due_week}
                    </span>
                  )}
                </div>
              </div>
              {weekWidth <= 15 && (
                <span className="w-8 text-sm text-foreground text-right">{stats.due_week}</span>
              )}
            </div>

            {/* This Month */}
            <div className="flex items-center gap-3">
              <div className="w-20 text-sm text-muted-foreground">This Month</div>
              <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${monthWidth}%` }}
                >
                  {monthWidth > 15 && (
                    <span className="text-xs font-medium text-primary-foreground">
                      {stats.due_month}
                    </span>
                  )}
                </div>
              </div>
              {monthWidth <= 15 && (
                <span className="w-8 text-sm text-foreground text-right">{stats.due_month}</span>
              )}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {stats.total_reviews}
            </div>
            <div className="text-xs text-muted-foreground">Total Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {stats.total_lapses}
            </div>
            <div className="text-xs text-muted-foreground">Total Lapses</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {Math.round(stats.avg_interval)}d
            </div>
            <div className="text-xs text-muted-foreground">Avg Interval</div>
          </div>
        </div>
      </div>
    </div>
  );
}
