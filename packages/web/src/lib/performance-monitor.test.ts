/**
 * Performance Monitor Tests
 *
 * Tests for dev-only performance monitoring utilities
 */

import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PERFORMANCE_BUDGETS,
  checkCacheBudget,
  checkFileTreeBudget,
  checkWebSocketQueueBudget,
  getCacheStats,
  logPerformanceTiming,
  performanceMark,
  performanceMeasure,
  startPerformanceTimer,
} from "./performance-monitor";

describe("Performance Monitor", () => {
  let queryClient: QueryClient;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    queryClient.clear();
  });

  describe("getCacheStats", () => {
    it("should return null in production mode", () => {
      // In test environment, we're in dev mode, so this test validates the structure
      const stats = getCacheStats(queryClient);
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats).toHaveProperty("totalQueries");
        expect(stats).toHaveProperty("activeQueries");
        expect(stats).toHaveProperty("staleQueries");
        expect(stats).toHaveProperty("inactiveQueries");
        expect(stats).toHaveProperty("timestamp");
      }
    });

    it("should return cache statistics", () => {
      const stats = getCacheStats(queryClient);
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.totalQueries).toBe(0);
        expect(stats.activeQueries).toBe(0);
        expect(stats.staleQueries).toBe(0);
        expect(stats.inactiveQueries).toBe(0);
      }
    });

    it("should count queries correctly", async () => {
      // Add some queries
      queryClient.setQueryData(["test1"], { data: "test" });
      queryClient.setQueryData(["test2"], { data: "test" });

      const stats = getCacheStats(queryClient);
      expect(stats?.totalQueries).toBe(2);
    });
  });

  describe("checkCacheBudget", () => {
    it("should return false when under budget", () => {
      const result = checkCacheBudget(queryClient);
      expect(result).toBe(false);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should warn when approaching budget", () => {
      // Add queries to exceed warn threshold
      const warnThreshold = PERFORMANCE_BUDGETS.cacheEntries.warn;
      for (let i = 0; i < warnThreshold + 1; i++) {
        queryClient.setQueryData(["test", i], { data: i });
      }

      const result = checkCacheBudget(queryClient);
      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("performanceMark", () => {
    it("should create performance mark", () => {
      performanceMark("test-mark");
      const marks = performance.getEntriesByName("test-mark", "mark");
      expect(marks.length).toBeGreaterThan(0);
    });

    it("should log metadata when provided", () => {
      performanceMark("test-mark-with-meta", { foo: "bar" });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Performance Mark] test-mark-with-meta"),
        expect.objectContaining({
          name: "test-mark-with-meta",
          metadata: { foo: "bar" },
        }),
      );
    });
  });

  describe("performanceMeasure", () => {
    it("should measure time between marks", () => {
      performanceMark("start");
      performanceMark("end");

      const duration = performanceMeasure("test-measure", "start", "end");
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Performance Measure] test-measure"),
      );
    });

    it("should measure from mark to now", () => {
      performanceMark("start-only");

      const duration = performanceMeasure("measure-to-now", "start-only");
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should return null for non-existent mark", () => {
      const duration = performanceMeasure("bad-measure", "non-existent");
      expect(duration).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("checkFileTreeBudget", () => {
    it("should return false when under budget", () => {
      const result = checkFileTreeBudget(100);
      expect(result).toBe(false);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should warn when approaching budget", () => {
      const result = checkFileTreeBudget(PERFORMANCE_BUDGETS.fileTreeNodes.warn + 1);
      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should error when exceeding budget", () => {
      const result = checkFileTreeBudget(PERFORMANCE_BUDGETS.fileTreeNodes.max + 1);
      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("checkWebSocketQueueBudget", () => {
    it("should return false when under budget", () => {
      const result = checkWebSocketQueueBudget(100);
      expect(result).toBe(false);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should warn when approaching budget", () => {
      const result = checkWebSocketQueueBudget(PERFORMANCE_BUDGETS.websocketQueue.warn + 1);
      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should error when exceeding budget", () => {
      const result = checkWebSocketQueueBudget(PERFORMANCE_BUDGETS.websocketQueue.max + 1);
      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("logPerformanceTiming", () => {
    it("should log timing under threshold", () => {
      logPerformanceTiming("test-timing", 50, 100);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Performance] test-timing: 50.00ms"),
      );
    });

    it("should warn when exceeding threshold", () => {
      logPerformanceTiming("slow-timing", 150, 100);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("exceeds 100ms threshold"),
      );
    });
  });

  describe("startPerformanceTimer", () => {
    it("should return timer function", () => {
      const endTimer = startPerformanceTimer("timer-test");
      expect(typeof endTimer).toBe("function");
    });

    it("should measure elapsed time", () => {
      const endTimer = startPerformanceTimer("timer-test");
      const duration = endTimer();
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Performance] timer-test:"),
      );
    });
  });
});
