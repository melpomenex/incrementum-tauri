import { useEffect, useRef } from "react";
import { useSettingsStore, useTabsStore } from "../../stores";
import { useGlobalShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Toolbar } from "../Toolbar";
import { Tabs } from "../common/Tabs";
import { DashboardTab, QueueTab } from "../tabs/TabRegistry";

export function MainLayout() {
  const { settings } = useSettingsStore();
  const { tabs, addTab, loadTabs } = useTabsStore();
  const initializedRef = useRef(false);

  // Setup keyboard shortcuts
  useGlobalShortcuts();

  // Initialize default tabs on first mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // If no tabs exist, create default tabs
    if (tabs.length === 0) {
      // Add Dashboard tab (non-closable)
      addTab({
        title: "Dashboard",
        icon: "📊",
        type: "dashboard",
        content: DashboardTab,
        closable: false,
      });

      // Add Queue tab (closable)
      addTab({
        title: "Queue",
        icon: "📚",
        type: "queue",
        content: QueueTab,
        closable: true,
      });
    } else {
      // Load saved tabs from localStorage if any
      loadTabs();
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === "dark" ||
      (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  // Listen for system theme changes when theme is set to "system"
  useEffect(() => {
    if (settings.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Toolbar - Fixed at top */}
      <Toolbar />

      {/* Tabbed Interface - Below toolbar */}
      <Tabs />
    </div>
  );
}
