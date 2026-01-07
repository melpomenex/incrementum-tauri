import { useEffect } from "react";
import { useTabsStore } from "../../stores";
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { ReviewTab, DocumentsTab } from "./TabRegistry";
import { StatCard } from "../../components/analytics/StatCard";
import { StudyStreak } from "../../components/analytics/StudyStreak";
import { ActivityChart } from "../../components/analytics/ActivityChart";
import { CategoryBreakdown } from "../../components/analytics/CategoryBreakdown";
import {
  BookOpen,
  Clock,
  Brain,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader2,
  TrendingUp,
} from "lucide-react";

export function AnalyticsTab() {
  const { addTab } = useTabsStore();
  const {
    dashboardStats,
    memoryStats,
    activityData,
    categoryStats,
    isLoading,
    error,
    loadAll,
  } = useAnalyticsStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (isLoading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
        Failed to load analytics: {error}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track your learning progress and performance
        </p>
      </div>

      {/* Study Streak */}
      {dashboardStats && (
        <StudyStreak streak={dashboardStats.study_streak} />
      )}

      {/* Stats Grid */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Cards Due Today"
            value={dashboardStats.cards_due_today}
            icon={Clock}
            color="orange"
            description="Ready to review"
          />
          <StatCard
            title="Total Cards"
            value={dashboardStats.total_cards}
            icon={Brain}
            color="blue"
            description={
              memoryStats
                ? `${memoryStats.new_cards} new, ${memoryStats.young_cards} learning`
                : undefined
            }
          />
          <StatCard
            title="Cards Learned"
            value={dashboardStats.cards_learned}
            icon={CheckCircle2}
            color="green"
            description="Reviewed at least once"
          />
          <StatCard
            title="Retention Rate"
            value={`${dashboardStats.retention_rate.toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
            description="Average across all cards"
          />
        </div>
      )}

      {/* Documents and Extracts */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Documents"
            value={dashboardStats.total_documents}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="Extracts"
            value={dashboardStats.total_extracts}
            icon={FileText}
            color="green"
          />
        </div>
      )}

      {/* Memory Stats */}
      {memoryStats && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Memory Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">
                {memoryStats.mature_cards}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Mature Cards</p>
              <p className="text-xs text-muted-foreground">
                Interval ≥ 21 days
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">
                {memoryStats.young_cards}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Young Cards</p>
              <p className="text-xs text-muted-foreground">
                Learning but not mature
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">
                {memoryStats.new_cards}
              </p>
              <p className="text-sm text-muted-foreground mt-1">New Cards</p>
              <p className="text-xs text-muted-foreground">Never reviewed</p>
            </div>
          </div>

          {/* FSRS metrics */}
          {memoryStats.average_stability > 0 && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {memoryStats.average_stability.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Stability (days)
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {memoryStats.average_difficulty.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Difficulty (1-10)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Chart */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <ActivityChart data={activityData} />
      </div>

      {/* Category Breakdown */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <CategoryBreakdown categories={categoryStats} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => addTab({
              title: "Review",
              icon: "🎴",
              type: "review",
              content: ReviewTab,
              closable: true,
            })}
            className="flex items-center gap-3 p-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors text-left"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Start Review</p>
              <p className="text-sm text-muted-foreground">
                {dashboardStats?.cards_due_today || 0} cards due
              </p>
            </div>
          </button>
          <button
            onClick={() => addTab({
              title: "Documents",
              icon: "📄",
              type: "documents",
              content: DocumentsTab,
              closable: true,
            })}
            className="flex items-center gap-3 p-3 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors text-left"
          >
            <BookOpen className="w-5 h-5 text-foreground" />
            <div>
              <p className="font-medium text-foreground">Browse Documents</p>
              <p className="text-sm text-muted-foreground">
                {dashboardStats?.total_documents || 0} documents
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

import { lazy } from "react";
