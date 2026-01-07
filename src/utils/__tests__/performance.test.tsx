/**
 * Tests for performance monitoring utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  performanceMonitor,
  usePerformance,
  measureSync,
} from "../performance";

// Mock performance.now()
const mockNow = vi.fn();
globalThis.performance.now = mockNow;

describe("performanceMonitor", () => {
  beforeEach(() => {
    performanceMonitor.clear();
    mockNow.mockReset();
  });

  describe("startMark and endMark", () => {
    it("should record a metric when startMark and endMark are called", () => {
      mockNow.mockReturnValue(0).mockReturnValueOnce(0).mockReturnValueOnce(100);

      performanceMonitor.startMark("test-operation");
      const duration = performanceMonitor.endMark("test-operation");

      expect(duration).toBe(100);
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("test-operation");
      expect(metrics[0].duration).toBe(100);
    });

    it("should return 0 if endMark is called without startMark", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const duration = performanceMonitor.endMark("non-existent");

      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("recordMetric", () => {
    it("should record a metric directly", () => {
      performanceMonitor.recordMetric("direct-metric", 250, { key: "value" });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("direct-metric");
      expect(metrics[0].duration).toBe(250);
      expect(metrics[0].metadata).toEqual({ key: "value" });
    });
  });

  describe("getMetricsByName", () => {
    it("should return metrics filtered by name", () => {
      performanceMonitor.recordMetric("operation-a", 100);
      performanceMonitor.recordMetric("operation-b", 200);
      performanceMonitor.recordMetric("operation-a", 150);

      const metricsA = performanceMonitor.getMetricsByName("operation-a");
      expect(metricsA).toHaveLength(2);

      const metricsB = performanceMonitor.getMetricsByName("operation-b");
      expect(metricsB).toHaveLength(1);
    });
  });

  describe("getAverageDuration", () => {
    it("should calculate average duration for a metric name", () => {
      performanceMonitor.recordMetric("test", 100);
      performanceMonitor.recordMetric("test", 200);
      performanceMonitor.recordMetric("test", 300);

      const avg = performanceMonitor.getAverageDuration("test");
      expect(avg).toBe(200);
    });

    it("should return 0 for non-existent metric", () => {
      const avg = performanceMonitor.getAverageDuration("non-existent");
      expect(avg).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("should return summary of all metrics", () => {
      performanceMonitor.recordMetric("operation-a", 100);
      performanceMonitor.recordMetric("operation-a", 200);
      performanceMonitor.recordMetric("operation-b", 50);

      const summary = performanceMonitor.getSummary();

      expect(summary["operation-a"]).toEqual({
        count: 2,
        avg: 150,
        min: 100,
        max: 200,
      });
      expect(summary["operation-b"]).toEqual({
        count: 1,
        avg: 50,
        min: 50,
        max: 50,
      });
    });
  });

  describe("clear", () => {
    it("should clear all metrics and marks", () => {
      performanceMonitor.recordMetric("test", 100);
      performanceMonitor.startMark("active-mark");

      performanceMonitor.clear();

      expect(performanceMonitor.getMetrics()).toHaveLength(0);
    });
  });

  describe("maxMetrics limit", () => {
    it("should keep only the last N metrics", () => {
      // Record more than the default limit of 100
      for (let i = 0; i < 150; i++) {
        performanceMonitor.recordMetric(`metric-${i}`, i);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.length).toBe(100);
      expect(metrics[0].name).toBe("metric-50");
      expect(metrics[99].name).toBe("metric-149");
    });
  });
});

describe("measureSync", () => {
  beforeEach(() => {
    performanceMonitor.clear();
    mockNow.mockReturnValue(0).mockReturnValueOnce(0).mockReturnValueOnce(50);
  });

  it("should measure sync function execution time", () => {
    const result = measureSync("sync-operation", () => {
      return 42;
    });

    expect(result).toBe(42);
    const metrics = performanceMonitor.getMetrics();
    expect(metrics[0].name).toBe("sync-operation");
    expect(metrics[0].duration).toBe(50);
  });
});

describe("usePerformance hook", () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it("should return performance utility functions", () => {
    const utils = usePerformance();

    expect(utils.startMark).toBeInstanceOf(Function);
    expect(utils.endMark).toBeInstanceOf(Function);
    expect(utils.recordMetric).toBeInstanceOf(Function);
    expect(utils.getMetrics).toBeInstanceOf(Function);
    expect(utils.getSummary).toBeInstanceOf(Function);
    expect(utils.clear).toBeInstanceOf(Function);
  });

  it("should record metrics through the hook", () => {
    const { startMark, endMark, getMetrics } = usePerformance();

    mockNow.mockReturnValue(0).mockReturnValueOnce(0).mockReturnValueOnce(100);

    startMark("hook-test");
    endMark("hook-test");

    const metrics = getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe("hook-test");
    expect(metrics[0].duration).toBe(100);
  });
});
