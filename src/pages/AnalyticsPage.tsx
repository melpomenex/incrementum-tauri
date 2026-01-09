import { useEffect, useState } from "react";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { invoke } from "@tauri-apps/api/core";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Download,
} from "lucide-react";

export function AnalyticsPage() {
  const { dashboardStats, memoryStats, activityData, categoryStats, loadAll } =
    useAnalyticsStore();
  const [timeRange, setTimeRange] = useState<string>("7d");

  useEffect(() => {
    loadAll(timeRange);
  }, [loadAll, timeRange]);

  const exportStats = async () => {
    try {
      await invoke("export_analytics", { timeRange });
      alert("Statistics exported successfully!");
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Statistics</h1>
            <p className="text-sm text-foreground-secondary">
              Track your learning progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last year</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={exportStats}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm hover:bg-muted flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Cards"
              value={dashboardStats?.total_cards || 0}
              icon={<BarChart3 className="w-5 h-5" />}
              trend={
                activityData && activityData.length > 1
                  ? ((activityData[activityData.length - 1]?.total_cards || 0) -
                      (activityData[activityData.length - 2]?.total_cards || 0))
                  : 0
              }
            />
            <StatCard
              label="Cards Learned"
              value={dashboardStats?.cards_learned || 0}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              label="Due Today"
              value={dashboardStats?.cards_due_today || 0}
              icon={<Calendar className="w-5 h-5" />}
            />
            <StatCard
              label="Retention Rate"
              value={`${Math.round(
                ((dashboardStats?.cards_retained || 0) /
                  Math.max(1, dashboardStats?.total_cards || 0)) *
                  100
              )}%`}
              icon={<Activity className="w-5 h-5" />}
            />
          </div>

          {/* Memory States */}
          <div className="bg-card border border-border rounded p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Memory States
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {memoryStates.map((state) => (
                <div key={state.name} className="text-center">
                  <div
                    className="h-24 rounded flex items-end justify-center pb-2"
                    style={{ backgroundColor: state.color + "20" }}
                  >
                    <div
                      className="w-full rounded-t"
                      style={{
                        backgroundColor: state.color,
                        height: `${(state.count /
                          Math.max(1, dashboardStats?.total_cards || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {state.name}
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {state.count} cards
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-card border border-border rounded p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Review Activity
            </h3>
            <div className="h-48 flex items-end gap-1">
              {activityData?.map((day: any, index: number) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary-300 rounded-t hover:opacity-80 transition-opacity cursor-pointer"
                    style={{
                      height: `${Math.max(
                        5,
                        (day.reviews_count /
                          Math.max(...activityData.map((d: any) => d.reviews_count))) *
                          100
                      )}%`,
                    }}
                    title={`${day.reviews_count} reviews`}
                  />
                  <span className="text-xs text-foreground-secondary">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          {categoryStats && categoryStats.length > 0 && (
            <div className="bg-card border border-border rounded p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Category Breakdown
              </h3>
              <div className="space-y-3">
                {categoryStats.map((cat: any) => (
                  <div
                    key={cat.category}
                    className="flex items-center gap-3"
                  >
                    <div className="w-32 text-sm text-foreground truncate">
                      {cat.category}
                    </div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-300 transition-all"
                        style={{
                          width: `${(cat.count /
                            Math.max(...categoryStats.map((c: any) => c.count))) *
                            100}%`,
                        }}
                      />
                    </div>
                    <div className="w-12 text-sm text-foreground text-right">
                      {cat.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
}) {
  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-foreground-secondary">{label}</span>
        <div className="text-primary-300">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {trend >= 0 ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span
            className={
              trend >= 0 ? "text-green-500" : "text-red-500"
            }
          >
            {Math.abs(trend)}
          </span>
          <span className="text-foreground-secondary">vs last period</span>
        </div>
      )}
    </div>
  );
}

const memoryStates = [
  { name: "New", count: 0, color: "#3b82f6" },
  { name: "Learning", count: 0, color: "#f59e0b" },
  { name: "Young", count: 0, color: "#10b981" },
  { name: "Mature", count: 0, color: "#8b5cf6" },
  { name: "Relearning", count: 0, color: "#ef4444" },
];
