import { useEffect, useState } from "react";
import { NewMainLayout, MainContent } from "./components/layout/NewMainLayout";
import { useAnalyticsStore } from "./stores/analyticsStore";
import { useDocumentStore } from "./stores/documentStore";
import { useQueueStore } from "./stores/queueStore";
import { useReviewStore } from "./stores/reviewStore";
import { invoke } from "@tauri-apps/api/core";

// Page components
import { DocumentsPage } from "./pages/DocumentsPage";
import { QueuePage } from "./pages/QueuePage";
import { ReviewPage } from "./pages/ReviewPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AIWorkflowsPage } from "./pages/AIWorkflowsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { KnowledgeGraphPage } from "./pages/KnowledgeGraphPage";
import { SearchPage } from "./pages/SearchPage";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("review");
  const { dashboardStats, loadAll } = useAnalyticsStore();
  const { documents, loadDocuments } = useDocumentStore();
  const { queue } = useQueueStore();
  const { queue: reviewQueue } = useReviewStore();

  useEffect(() => {
    loadAll();
    loadDocuments();
  }, [loadAll, loadDocuments]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "documents":
        return <DocumentsPage />;
      case "queue":
        return <QueuePage />;
      case "analytics":
        return <AnalyticsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <NewMainLayout activeItem={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </NewMainLayout>
  );
}

// Dashboard Page with real stats
interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { dashboardStats, loadAll } = useAnalyticsStore();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("review");

  useEffect(() => {
    loadAll();
    loadRecentActivity();
  }, [loadAll]);

  const loadRecentActivity = async () => {
    try {
      const activity = await invoke<any[]>("get_activity_data", { days: 7 });
      setRecentActivity(activity.slice(-5).reverse());
    } catch (error) {
      console.error("Failed to load recent activity:", error);
    }
  };

  return (
    <MainContent
      showStatsBar={true}
      stats={{
        total: dashboardStats?.total_cards || 0,
        due: dashboardStats?.cards_due_today || 0,
        new: dashboardStats?.cards_learned || 0,
      }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="max-w-6xl mx-auto">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate("documents")}
              className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow text-left"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm font-medium text-foreground">Import Document</div>
              <div className="text-xs text-foreground-secondary mt-1">
                Add PDF, EPUB, or Markdown
              </div>
            </button>
            <button
              onClick={() => onNavigate("queue")}
              className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow text-left"
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="text-sm font-medium text-foreground">View Queue</div>
              <div className="text-xs text-foreground-secondary mt-1">
                {dashboardStats?.cards_due_today || 0} items due
              </div>
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow text-left"
            >
              <div className="text-2xl mb-2">🎴</div>
              <div className="text-sm font-medium text-foreground">Start Review</div>
              <div className="text-xs text-foreground-secondary mt-1">
                Practice with flashcards
              </div>
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="p-4 bg-card border border-border rounded hover:shadow-md transition-shadow text-left"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-foreground">View Statistics</div>
              <div className="text-xs text-foreground-secondary mt-1">
                Track your progress
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="p-6 bg-card border border-border rounded text-center text-foreground-secondary">
              No recent activity. Start by importing a document!
            </div>
          ) : (
            <div className="bg-card border border-border rounded divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-300" />
                    <div>
                      <div className="text-sm text-foreground">
                        {activity.reviews_count} reviews completed
                      </div>
                      <div className="text-xs text-foreground-secondary">
                        {new Date(activity.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {activity.time_spent_minutes} min
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Welcome Message for New Users */}
        {dashboardStats?.total_cards === 0 && (
          <div className="p-6 bg-card border border-border rounded text-center">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Welcome to Incrementum!
            </h3>
            <p className="text-sm text-foreground-secondary mb-4">
              Your incremental reading and spaced repetition companion.
              Import your first document to get started.
            </p>
            <button
              onClick={() => onNavigate("documents")}
              className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90 transition-opacity"
            >
              Import Your First Document
            </button>
          </div>
        )}
      </div>
    </MainContent>
  );
}

export default App;
