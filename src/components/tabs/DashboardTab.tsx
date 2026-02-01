import { useEffect, useState } from "react";
import { useTabsStore } from "../../stores";
import {
  QueueTab,
  ReviewTab,
  DocumentsTab,
  AnalyticsTab,
  SettingsTab,
} from "./TabRegistry";
import { getDashboardStats, type DashboardStats } from "../../api/analytics";

export function DashboardTab() {
  const { addTab } = useTabsStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4">
        Welcome to Incrementum
      </h1>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
        Your incremental reading and spaced repetition companion.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() =>
            addTab({
              title: "Queue",
              icon: "📚",
              type: "queue",
              content: QueueTab,
              closable: true,
            })
          }
          className="p-4 md:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left min-h-[120px] md:min-h-[140px] active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-2">📚</div>
          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1">Queue</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Review your reading queue
          </p>
        </button>

        <button
          onClick={() =>
            addTab({
              title: "Review",
              icon: "🎴",
              type: "review",
              content: ReviewTab,
              closable: true,
            })
          }
          className="p-4 md:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left min-h-[120px] md:min-h-[140px] active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-2">🎴</div>
          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1">Review</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Practice with flashcards
          </p>
        </button>

        <button
          onClick={() =>
            addTab({
              title: "Documents",
              icon: "📄",
              type: "documents",
              content: DocumentsTab,
              closable: true,
            })
          }
          className="p-4 md:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left min-h-[120px] md:min-h-[140px] active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-2">📄</div>
          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1">Documents</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Browse your documents
          </p>
        </button>

        <button
          onClick={() =>
            addTab({
              title: "Analytics",
              icon: "📊",
              type: "analytics",
              content: AnalyticsTab,
              closable: true,
            })
          }
          className="p-4 md:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left min-h-[120px] md:min-h-[140px] active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-2">📊</div>
          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1">Analytics</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Track your progress
          </p>
        </button>

        <button
          onClick={() => {
            localStorage.setItem("incrementum_settings_initial_tab", "sync");
            addTab({
              title: "Settings",
              icon: "⚙️",
              type: "settings",
              content: SettingsTab,
              closable: true,
            });
          }}
          className="p-4 md:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left min-h-[120px] md:min-h-[140px] active:scale-[0.98] transition-transform"
        >
          <div className="text-2xl md:text-3xl mb-2">🔗</div>
          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1">Device Sync</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Pair your phone and desktop
          </p>
        </button>
      </div>

      <div className="mt-6 md:mt-8 p-4 md:p-6 bg-muted/50 border border-border rounded-lg">
        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.total_documents ?? 0
              )}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Documents</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.cards_due_today ?? 0
              )}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Due Today</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.cards_learned ?? 0
              )}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Cards Learned</div>
          </div>
        </div>
      </div>
    </div>
  );
}
