/**
 * Breadcrumb Navigation Component
 * Shows current location in the application hierarchy
 */

import { ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
  onNavigate?: (path: string) => void;
}

// Route to breadcrumb mapping
const routeToBreadcrumb: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/documents": [{ label: "Documents" }],
  "/queue": [{ label: "Queue" }],
  "/queue-scroll": [{ label: "Queue" }, { label: "Scroll View" }],
  "/review": [{ label: "Review" }],
  "/analytics": [{ label: "Analytics" }],
  "/settings": [{ label: "Settings" }],
  "/knowledge-graph": [{ label: "Knowledge Graph" }],
  "/continue-reading": [{ label: "Continue Reading" }],
};

export function Breadcrumb({
  items: propItems,
  homeLabel = "Incrementum",
  onNavigate,
}: BreadcrumbProps) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (propItems) {
      setItems(propItems);
      return;
    }

    // Listen for navigation events
    const handleNavigate = (e: CustomEvent<string>) => {
      const path = e.detail;
      const breadcrumbItems = routeToBreadcrumb[path] || [{ label: path }];
      setItems(breadcrumbItems);
    };

    // Set initial breadcrumb based on current path
    const currentPath = window.location.hash.replace("#", "") || "/dashboard";
    const initialItems = routeToBreadcrumb[currentPath] || [{ label: currentPath }];
    setItems(initialItems);

    window.addEventListener("navigate" as any, handleNavigate);
    return () => window.removeEventListener("navigate" as any, handleNavigate);
  }, [propItems]);

  const handleClick = (path?: string) => {
    if (path && onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1 text-xs text-muted-foreground">
        <li className="flex items-center">
          <button
            onClick={() => handleClick("/dashboard")}
            className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1"
            aria-label={`Go to ${homeLabel} home`}
          >
            <Home className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">{homeLabel}</span>
          </button>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              <ChevronRight
                className="w-3 h-3 mx-1 text-muted-foreground/50"
                aria-hidden="true"
              />
              {isLast ? (
                <span
                  className="text-foreground font-medium"
                  aria-current="page"
                >
                  {item.icon && (
                    <span className="inline-flex items-center gap-1">
                      {item.icon}
                      {item.label}
                    </span>
                  )}
                  {!item.icon && item.label}
                </span>
              ) : (
                <button
                  onClick={() => handleClick(item.path)}
                  className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1"
                >
                  {item.icon && (
                    <span className="inline-flex items-center gap-1">
                      {item.icon}
                      {item.label}
                    </span>
                  )}
                  {!item.icon && item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Hook to update breadcrumb from any component
export function useBreadcrumb(items: BreadcrumbItem[]) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("breadcrumb-update", { detail: items })
    );
  }, [items]);
}

export default Breadcrumb;
