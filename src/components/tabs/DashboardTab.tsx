import { useTabsStore } from "../../stores";
import {
  QueueTab,
  ReviewTab,
  DocumentsTab,
  AnalyticsTab,
} from "./TabRegistry";

export function DashboardTab() {
  const { addTab } = useTabsStore();

  return (
    <div className="h-full overflow-auto p-8">
      <h1 className="text-3xl font-bold text-foreground mb-4">
        Welcome to Incrementum
      </h1>
      <p className="text-muted-foreground mb-6">
        Your incremental reading and spaced repetition companion.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="text-3xl mb-2">📚</div>
          <h3 className="font-semibold text-foreground mb-1">Queue</h3>
          <p className="text-sm text-muted-foreground">
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
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="text-3xl mb-2">🎴</div>
          <h3 className="font-semibold text-foreground mb-1">Review</h3>
          <p className="text-sm text-muted-foreground">
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
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="text-3xl mb-2">📄</div>
          <h3 className="font-semibold text-foreground mb-1">Documents</h3>
          <p className="text-sm text-muted-foreground">
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
          className="p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track your progress
          </p>
        </button>
      </div>

      <div className="mt-8 p-6 bg-muted/50 border border-border rounded-lg">
        <h2 className="text-xl font-semibold text-foreground mb-2">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-sm text-muted-foreground">Due Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-sm text-muted-foreground">Cards Learned</div>
          </div>
        </div>
      </div>
    </div>
  );
}
