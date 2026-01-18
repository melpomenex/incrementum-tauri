import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { SyncStatusIndicator } from "../sync/SyncStatusIndicator";
import {
  Home,
  BookOpen,
  Layers,
  BarChart3,
  Settings,
  Bell,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "documents", label: "Documents", icon: BookOpen },
  { id: "queue", label: "Queue", icon: Layers },
  { id: "analytics", label: "Statistics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function NewMainLayout({
  children,
  activeItem,
  onPageChange,
  isAuthenticated,
  user,
  onLoginClick,
  onLogout,
}: {
  children: React.ReactNode;
  activeItem: string;
  onPageChange: (page: string) => void;
  isAuthenticated?: boolean;
  user?: { id: string; email: string } | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
}) {
  const { settings } = useSettingsStore();
  const { dashboardStats, loadAll } = useAnalyticsStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  return (
    <div className="flex flex-col h-screen w-full bg-cream">
      {/* Top Header Bar */}
      <TopHeaderBar
        isAuthenticated={isAuthenticated}
        user={user}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          activeItem={activeItem}
          setActiveItem={onPageChange}
          stats={dashboardStats}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function TopHeaderBar({
  isAuthenticated,
  user,
  onLoginClick,
  onLogout,
}: {
  isAuthenticated?: boolean;
  user?: { id: string; email: string } | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
}) {
  return (
    <header className="h-10 bg-card border-b border-border flex items-center justify-between px-3 flex-shrink-0">
      {/* Left side - navigation icons */}
      <div className="flex items-center gap-2">
        <button className="p-1 hover:bg-muted rounded transition-colors" title="Back">
          <ChevronLeft className="w-4 h-4 text-foreground-secondary" />
        </button>
        <button className="p-1 hover:bg-muted rounded transition-colors" title="Forward">
          <ChevronRight className="w-4 h-4 text-foreground-secondary" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button className="p-1 hover:bg-muted rounded transition-colors" title="Home">
          <Home className="w-4 h-4 text-foreground-secondary" />
        </button>
        <span className="text-xs text-foreground-secondary ml-2">
          Incrementum / Dashboard
        </span>
      </div>

      {/* Right side - actions */}
      <div className="flex items-center gap-2">
        <SyncStatusIndicator />
        <button className="p-1 hover:bg-muted rounded transition-colors" title="Search">
          <Search className="w-4 h-4 text-foreground-secondary" />
        </button>
        <button className="p-1 hover:bg-muted rounded transition-colors" title="Notifications">
          <Bell className="w-4 h-4 text-foreground-secondary" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        {isAuthenticated && user ? (
          <div className="relative group">
            <button className="p-1 hover:bg-muted rounded transition-colors" title="User profile">
              <div className="w-5 h-5 rounded-full bg-primary-300 flex items-center justify-center text-white text-xs font-medium">
                {user.email[0].toUpperCase()}
              </div>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-card border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="px-3 py-2 text-sm text-foreground-secondary border-b border-border truncate">
                {user.email}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-muted"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        ) : (
          onLoginClick && (
            <button
              onClick={onLoginClick}
              className="px-3 py-1 text-sm bg-primary-300 text-white rounded hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )
        )}
      </div>
    </header>
  );
}

interface LeftSidebarProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  stats: any;
}

function LeftSidebar({ activeItem, setActiveItem, stats }: LeftSidebarProps) {
  return (
    <aside className="w-64 flex flex-col sidebar-section flex-shrink-0">
      {/* Sidebar Items */}
      <div className="flex-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
              activeItem === item.id ? "sidebar-item-active" : "sidebar-item hover:bg-sidebar-hover"
            }`}
          >
            <item.icon className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground flex-1 text-left">
              {item.label}
            </span>
            {item.count !== undefined && (
              <span className="text-xs text-foreground-muted">{item.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Stats Panel */}
      <div className="bg-card border-t border-border p-3 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">
              {stats?.total_cards || 0}
            </div>
            <div className="text-[10px] text-foreground-secondary uppercase">
              Total
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {stats?.cards_learned || 0}
            </div>
            <div className="text-[10px] text-foreground-secondary uppercase">
              Learned
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {stats?.cards_due_today || 0}
            </div>
            <div className="text-[10px] text-foreground-secondary uppercase">
              Due
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">0</div>
            <div className="text-[10px] text-foreground-secondary uppercase">
              New
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Export content wrapper for main content area with stats bar and tabs
interface MainContentProps {
  children: React.ReactNode;
  showStatsBar?: boolean;
  stats?: {
    total: number;
    due: number;
    new: number;
  };
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function MainContent({
  children,
  showStatsBar = true,
  stats,
  activeTab,
  onTabChange,
}: MainContentProps) {
  const tabs = [
    { id: "import", label: "Import" },
    { id: "review", label: "Start Review Process" },
    { id: "queue", label: "View Queue" },
    { id: "reports", label: "Reports" },
    { id: "statistics", label: "Statistics" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      {showStatsBar && stats && (
        <div className="h-16 bg-card border-b border-border flex items-center px-6 flex-shrink-0">
          <div className="flex gap-8">
            <div>
              <div className="stats-number">{stats.total}</div>
              <div className="text-xs text-foreground-secondary">Total Items</div>
            </div>
            <div>
              <div className="stats-number">{stats.due}</div>
              <div className="text-xs text-foreground-secondary">Due Today</div>
            </div>
            <div>
              <div className="stats-number">{stats.new}</div>
              <div className="text-xs text-foreground-secondary">New Items</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {activeTab && onTabChange && (
        <div className="px-6 pt-4 pb-3 flex-shrink-0">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id ? "tab-button-active" : ""
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>

      {/* Bottom Bar */}
      <div className="h-8 bg-card border-t border-border flex items-center justify-between px-3 flex-shrink-0">
        <div className="text-xs text-foreground-secondary">
          {stats?.total || 0} items total
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-muted rounded text-foreground-secondary">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-xs text-foreground-secondary">1</span>
          <button className="p-1 hover:bg-muted rounded text-foreground-secondary">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
