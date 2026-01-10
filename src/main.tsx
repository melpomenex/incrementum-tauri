import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";

// Layout
import { MainLayout } from "./components/layout/MainLayout";
import { DevPerformanceMonitor } from "./components/common/PerformanceMonitor";

// Auth callback route
import AuthCallback from "./routes/auth-callback";
import ScreenshotOverlay from "./routes/screenshot-overlay";

// Loading fallback component
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <p style={{ marginTop: 16, fontSize: 14 }}>Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Cache keys for consistent query invalidation
 */
export const queryKeys = {
  queue: ["queue"] as const,
  queueStats: ["queue", "stats"] as const,
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
  extracts: (documentId: string) => ["extracts", documentId] as const,
  learningItems: (documentId: string) => ["learning-items", documentId] as const,
  review: ["review"] as const,
  analytics: (timeRange?: string) => ["analytics", timeRange] as const,
  categories: ["categories"] as const,
  settings: ["settings"] as const,
};

// Create query client for API calls with enhanced caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Error boundary for catching React errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#fff', flexDirection: 'column' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: '#f00' }}>{this.state.error?.message}</p>
          <pre style={{ background: '#111', padding: 16, borderRadius: 8, marginTop: 16, fontSize: 12 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('Starting Incrementum app...');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* OAuth callback route - must be before catch-all */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/screenshot-overlay" element={<ScreenshotOverlay />} />
              {/* Catch-all route - MainLayout handles tab-based navigation internally */}
              <Route path="*" element={<MainLayout />} />
            </Routes>
          </Suspense>
          <DevPerformanceMonitor />
        </HashRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
