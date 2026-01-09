import { Suspense, lazy, ComponentType, useEffect } from "react";
import { Webview } from "@tauri-apps/api/webview";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { useTabsStore, type Tab } from "../../../stores";

interface TabContentProps {
  tabs: Tab[];
  activeTabId: string | null;
}

function TabLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"
          style={{ borderWidth: "3px" }}
        />
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No tabs open
        </h3>
        <p className="text-muted-foreground">
          Open a tab to get started
        </p>
      </div>
    </div>
  );
}

export function TabContent({ tabs, activeTabId }: TabContentProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (activeTab?.type !== "web-browser") {
      void Webview.getAll()
        .then((webviews) =>
          Promise.all(
            webviews
              .filter((webview) => webview.label === "web-browser")
              .map(async (webview) => {
                try {
                  await webview.hide();
                  await webview.setPosition(new LogicalPosition(-10000, -10000));
                  await webview.setSize(new LogicalSize(1, 1));
                } catch {
                  // Ignore hide/move errors; we still attempt close below.
                }
                await webview.close().catch(() => undefined);
              })
          )
        )
        .catch(() => undefined);
    }
  }, [activeTab]);

  if (!activeTab) {
    return <EmptyState />;
  }

  const ContentComponent = activeTab.content;

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <Suspense fallback={<TabLoader />}>
        {/* Pass any tab-specific data as props */}
        <ContentComponent {...(activeTab.data || {})} />
      </Suspense>
    </div>
  );
}
