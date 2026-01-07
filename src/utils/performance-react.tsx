/**
 * React-specific performance monitoring utilities
 */

import React from "react";
import { performanceMonitor } from "./performance";

/**
 * Higher-order component to measure render performance
 */
export function withPerformanceMonitoring<P extends object>(
  componentName: string,
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      const startTime = performance.now();

      return () => {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric(
          `render-${componentName}`,
          duration
        );
      };
    });

    return <Component {...props} />;
  };
}
