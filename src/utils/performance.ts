/**
 * Performance monitoring utilities
 */

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitor class
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Start timing a named operation
   */
  startMark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End timing a named operation and record the metric
   */
  endMark(name: string, metadata?: Record<string, any>): number {
    const startTime = this.marks.get(name);
    if (startTime === undefined) {
      console.warn(`No start mark found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.recordMetric(name, duration, metadata);
    this.marks.delete(name);

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<
      string,
      { count: number; avg: number; min: number; max: number }
    > = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          min: metric.duration,
          max: metric.duration,
        };
      }

      const entry = summary[metric.name];
      entry.count++;
      entry.min = Math.min(entry.min, metric.duration);
      entry.max = Math.max(entry.max, metric.duration);
    }

    // Calculate averages
    for (const name in summary) {
      const metrics = this.getMetricsByName(name);
      const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
      summary[name].avg = sum / metrics.length;
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Enable/disable Performance API observation
   */
  observePaintTiming(): void {
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "paint") {
            this.recordMetric(
              `paint-${entry.name}`,
              entry.startTime,
              {}
            );
          }
        }
      });

      observer.observe({ entryTypes: ["paint"] });
    }
  }

  /**
   * Observe long tasks (tasks that take > 50ms)
   */
  observeLongTasks(): void {
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "longtask") {
            this.recordMetric(
              "longtask",
              entry.duration,
              { startTime: entry.startTime }
            );
          }
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
    }
  }
}

// Global singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformance() {
  const startMark = (name: string) => {
    performanceMonitor.startMark(name);
  };

  const endMark = (name: string, metadata?: Record<string, any>) => {
    return performanceMonitor.endMark(name, metadata);
  };

  const recordMetric = (name: string, duration: number, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(name, duration, metadata);
  };

  const getMetrics = () => {
    return performanceMonitor.getMetrics();
  };

  const getSummary = () => {
    return performanceMonitor.getSummary();
  };

  const clear = () => {
    performanceMonitor.clear();
  };

  return {
    startMark,
    endMark,
    recordMetric,
    getMetrics,
    getSummary,
    clear,
  };
}

/**
 * Measure an async function's execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  performanceMonitor.startMark(name);
  try {
    return await fn();
  } finally {
    performanceMonitor.endMark(name);
  }
}

/**
 * Measure a sync function's execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): T {
  performanceMonitor.startMark(name);
  try {
    return fn();
  } finally {
    performanceMonitor.endMark(name);
  }
}

// Initialize performance observers
if (typeof window !== "undefined") {
  // Start observing paint timing after page load
  if (document.readyState === "complete") {
    performanceMonitor.observePaintTiming();
    performanceMonitor.observeLongTasks();
  } else {
    window.addEventListener("load", () => {
      performanceMonitor.observePaintTiming();
      performanceMonitor.observeLongTasks();
    });
  }
}
