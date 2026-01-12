import { lazy } from "react";

// Central registry of all lazy-loaded tab components
// These must be defined at module level for React.lazy() to work correctly
// Components use named exports, so we need to convert them to default exports

export const DashboardTab = lazy(() => import("./DashboardTab").then(m => ({ default: m.DashboardTab })));
export const QueueTab = lazy(() => import("./QueueTab").then(m => ({ default: m.QueueTab })));
export const ReviewTab = lazy(() => import("./ReviewTab").then(m => ({ default: m.ReviewTab })));
export const DocumentsTab = lazy(() => import("./DocumentsTab").then(m => ({ default: m.DocumentsTab })));
export const AnalyticsTab = lazy(() => import("./AnalyticsTab").then(m => ({ default: m.AnalyticsTab })));
export const SettingsTab = lazy(() => import("../settings/SettingsPage").then(m => ({ default: m.SettingsPage })));

export const DocumentViewer = lazy(() => import("../viewer/DocumentViewerWrapper").then(m => ({ default: m.DocumentViewer })));
export const KnowledgeNetworkTab = lazy(() => import("./knowledge/KnowledgeNetworkTab").then(m => ({ default: m.KnowledgeNetworkTab })));
export const KnowledgeSphereTab = lazy(() => import("./knowledge/KnowledgeSphereTab").then(m => ({ default: m.KnowledgeSphereTab })));
export const WebBrowserTab = lazy(() => import("../viewer/DocumentViewerWrapper").then(m => ({ default: m.WebBrowserTab })));
export const RssTab = lazy(() => import("./RssTab").then(m => ({ default: m.RssTab })));
export const RSSReader = lazy(() => import("../media/RSSReader").then(m => ({ default: m.RSSReader })));
export const ScreenshotTab = lazy(() => import("./ScreenshotTab").then(m => ({ default: m.ScreenshotTab })));
export const DocumentQATab = lazy(() => import("./DocumentQATab").then(m => ({ default: m.DocumentQATab })));
