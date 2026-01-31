import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboardStats, type DashboardStats } from "../api/analytics";

export function Index() {
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
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-4">
        Welcome to Incrementum
      </h1>
      <p className="text-muted-foreground mb-6">
        Your incremental reading and spaced repetition companion.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/queue"
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-3xl mb-2">📚</div>
          <h3 className="font-semibold text-foreground mb-1">Queue</h3>
          <p className="text-sm text-muted-foreground">
            Review your reading queue
          </p>
        </Link>

        <Link
          to="/review"
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-3xl mb-2">🎴</div>
          <h3 className="font-semibold text-foreground mb-1">Review</h3>
          <p className="text-sm text-muted-foreground">
            Practice with flashcards
          </p>
        </Link>

        <Link
          to="/documents"
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-3xl mb-2">📄</div>
          <h3 className="font-semibold text-foreground mb-1">Documents</h3>
          <p className="text-sm text-muted-foreground">
            Browse your documents
          </p>
        </Link>

        <Link
          to="/analytics"
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track your progress
          </p>
        </Link>
      </div>

      <div className="mt-8 p-6 bg-muted/50 border border-border rounded-lg">
        <h2 className="text-xl font-semibold text-foreground mb-2">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.total_documents ?? 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.cards_due_today ?? 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">Due Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                stats?.cards_learned ?? 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">Cards Learned</div>
          </div>
        </div>
      </div>
    </div>
  );
}
