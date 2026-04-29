/**
 * Performance Monitoring Utilities
 *
 * Dev-only monitoring for React Query cache, bundle sizes, and performance marks.
 * No production overhead - all monitoring functions are no-ops in production builds.
 *
 * Usage:
 * ```typescript
 * import { usePerformanceMonitor, performanceMark, performanceMeasure } from '@/lib/performance-monitor';
 *
 * // In a component
 * usePerformanceMonitor(queryClient);
 *
 * // Mark performance points
 * performanceMark('data-fetch-start');
 * // ... fetch data ...
 * performanceMeasure('data-fetch', 'data-fetch-start');
 * ```
 *
 * NOTE: Console logging is intentional for dev monitoring.
 */

/* eslint-disable no-console */

import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** Performance budget thresholds */
export const PERFORMANCE_BUDGETS = {
  cacheEntries: {
    warn: 800,
    max: 1000,
  },
  bundleSize: {
    main: {
      warn: 200 * 1024, // 200KB gzipped
      max: 250 * 1024, // 250KB gzipped
    },
    chunk: {
      warn: 80 * 1024, // 80KB gzipped
      max: 100 * 1024, // 100KB gzipped
    },
  },
  fileTreeNodes: {
    warn: 400,
    max: 500,
  },
  websocketQueue: {
    warn: 400,
    max: 500,
  },
} as const;

/** Check if we're in development mode */
const isDev = import.meta.env.DEV;

/**
 * Performance mark data structure
 */
interface PerformanceMarkData {
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache monitoring statistics
 */
export interface CacheStats {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  inactiveQueries: number;
  timestamp: number;
}

/**
 * Get current React Query cache statistics
 *
 * @param queryClient - React Query client instance
 * @returns Cache statistics or null in production
 */
export function getCacheStats(queryClient: QueryClient): CacheStats | null {
  if (!isDev) {
    return null;
  }

  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const stats: CacheStats = {
    totalQueries: queries.length,
    activeQueries: 0,
    staleQueries: 0,
    inactiveQueries: 0,
    timestamp: Date.now(),
  };

  queries.forEach((query) => {
    const state = query.state;

    if (state.fetchStatus === "fetching") {
      stats.activeQueries++;
    }

    if (state.isInvalidated || query.isStale()) {
      stats.staleQueries++;
    }

    if (!query.getObserversCount()) {
      stats.inactiveQueries++;
    }
  });

  return stats;
}

/**
 * Check if cache size exceeds budgets and log warnings
 *
 * @param queryClient - React Query client instance
 * @returns True if over budget, false otherwise
 */
export function checkCacheBudget(queryClient: QueryClient): boolean {
  if (!isDev) {
    return false;
  }

  const stats = getCacheStats(queryClient);
  if (!stats) {
    return false;
  }

  const { totalQueries } = stats;
  const { warn, max } = PERFORMANCE_BUDGETS.cacheEntries;

  if (totalQueries >= max) {
    console.error(
      `[Performance] Cache entries exceed maximum budget: ${totalQueries} >= ${max}\n` +
        `Consider increasing gcTime or reducing staleTime for some queries.`,
    );
    return true;
  }

  if (totalQueries >= warn) {
    console.warn(
      `[Performance] Cache entries approaching budget: ${totalQueries} / ${max}\n` +
        `Active: ${stats.activeQueries}, Stale: ${stats.staleQueries}, Inactive: ${stats.inactiveQueries}`,
    );
    return true;
  }

  return false;
}

/**
 * Log cache statistics to console (dev only)
 *
 * @param queryClient - React Query client instance
 */
export function logCacheStats(queryClient: QueryClient): void {
  if (!isDev) {
    return;
  }

  const stats = getCacheStats(queryClient);
  if (!stats) {
    return;
  }

  console.log("[Performance] React Query Cache Stats:", {
    total: stats.totalQueries,
    active: stats.activeQueries,
    stale: stats.staleQueries,
    inactive: stats.inactiveQueries,
    budget: `${stats.totalQueries}/${PERFORMANCE_BUDGETS.cacheEntries.max}`,
    utilization: `${Math.round((stats.totalQueries / PERFORMANCE_BUDGETS.cacheEntries.max) * 100)}%`,
  });
}

/**
 * Create a performance mark (dev only)
 *
 * Uses the browser's Performance API to create named marks that can be
 * measured later for timing analysis.
 *
 * @param name - Unique name for the mark
 * @param metadata - Optional metadata to log with the mark
 */
export function performanceMark(name: string, metadata?: Record<string, unknown>): void {
  if (!isDev) {
    return;
  }

  try {
    performance.mark(name);

    if (metadata) {
      const markData: PerformanceMarkData = {
        name,
        timestamp: performance.now(),
        metadata,
      };
      console.log(`[Performance Mark] ${name}`, markData);
    }
  } catch (error) {
    console.warn("[Performance] Failed to create mark:", error);
  }
}

/**
 * Measure time between two performance marks (dev only)
 *
 * Creates a performance measure and logs the duration. If endMark is not
 * provided, measures from startMark to now.
 *
 * @param measureName - Name for the measurement
 * @param startMark - Name of the start mark
 * @param endMark - Optional name of the end mark
 * @returns Duration in milliseconds, or null if measurement failed
 */
export function performanceMeasure(
  measureName: string,
  startMark: string,
  endMark?: string,
): number | null {
  if (!isDev) {
    return null;
  }

  try {
    if (!endMark) {
      // Measure from mark to now
      const startEntry = performance.getEntriesByName(startMark, "mark")[0];
      if (!startEntry) {
        console.warn(`[Performance] Start mark not found: ${startMark}`);
        return null;
      }

      const duration = performance.now() - startEntry.startTime;
      console.log(`[Performance Measure] ${measureName}: ${duration.toFixed(2)}ms`);
      return duration;
    }

    // Measure between two marks
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName, "measure")[0];

    if (measure) {
      console.log(`[Performance Measure] ${measureName}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    }

    return null;
  } catch (error) {
    console.warn("[Performance] Failed to measure:", error);
    return null;
  }
}

/**
 * Clear all performance marks and measures (dev only)
 *
 * Useful for resetting performance tracking between tests or operations.
 */
export function clearPerformanceMarks(): void {
  if (!isDev) {
    return;
  }

  try {
    performance.clearMarks();
    performance.clearMeasures();
    console.log("[Performance] Cleared all marks and measures");
  } catch (error) {
    console.warn("[Performance] Failed to clear marks:", error);
  }
}

/**
 * Get bundle size information from build (dev only)
 *
 * This is a placeholder that relies on the vite bundle analyzer.
 * In development, bundle sizes are shown during build.
 * Use `pnpm run analyze` to visualize bundle composition.
 *
 * @returns Placeholder message directing to build tools
 */
export function getBundleSizeInfo(): string | null {
  if (!isDev) {
    return null;
  }

  return "Run `pnpm run build` to see bundle sizes. Run `pnpm run analyze` for visualization.";
}

/**
 * React hook for automatic performance monitoring (dev only)
 *
 * Monitors React Query cache size and logs warnings when approaching budgets.
 * Only runs in development mode - zero overhead in production.
 *
 * @param queryClient - React Query client instance
 * @param options - Monitoring options
 * @param options.interval - How often to check (default: 30000ms / 30s)
 * @param options.logStats - Whether to log stats periodically (default: false)
 *
 * @example
 * ```typescript
 * function App() {
 *   usePerformanceMonitor(queryClient, { interval: 60000, logStats: true });
 *   return <YourApp />;
 * }
 * ```
 */
export function usePerformanceMonitor(
  queryClient: QueryClient,
  options: {
    interval?: number;
    logStats?: boolean;
  } = {},
): void {
  const { interval = 30000, logStats = false } = options;

  useEffect(() => {
    if (!isDev) {
      return;
    }

    // Initial check
    console.log("[Performance Monitor] Starting cache monitoring...");
    checkCacheBudget(queryClient);

    // Periodic monitoring
    const intervalId = setInterval(() => {
      checkCacheBudget(queryClient);

      if (logStats) {
        logCacheStats(queryClient);
      }
    }, interval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      console.log("[Performance Monitor] Stopped cache monitoring");
    };
  }, [queryClient, interval, logStats]);
}

/**
 * Monitor file tree rendering performance (dev only)
 *
 * Logs warning when file tree node count exceeds budget.
 * Virtualization should be enabled when exceeding 500 nodes.
 *
 * @param nodeCount - Current number of rendered nodes
 * @returns True if over budget, false otherwise
 */
export function checkFileTreeBudget(nodeCount: number): boolean {
  if (!isDev) {
    return false;
  }

  const { warn, max } = PERFORMANCE_BUDGETS.fileTreeNodes;

  if (nodeCount >= max) {
    console.error(
      `[Performance] File tree nodes exceed maximum: ${nodeCount} >= ${max}\n` +
        `Enable virtualization to improve rendering performance.`,
    );
    return true;
  }

  if (nodeCount >= warn) {
    console.warn(
      `[Performance] File tree nodes approaching limit: ${nodeCount} / ${max}\n` +
        `Consider enabling virtualization soon.`,
    );
    return true;
  }

  return false;
}

/**
 * Monitor WebSocket message queue depth (dev only)
 *
 * Logs warning when message queue exceeds budget.
 * UI should show "catching up" indicator or throttle messages.
 *
 * @param queueDepth - Current message queue depth
 * @returns True if over budget, false otherwise
 */
export function checkWebSocketQueueBudget(queueDepth: number): boolean {
  if (!isDev) {
    return false;
  }

  const { warn, max } = PERFORMANCE_BUDGETS.websocketQueue;

  if (queueDepth >= max) {
    console.error(
      `[Performance] WebSocket queue depth exceeds maximum: ${queueDepth} >= ${max}\n` +
        `Messages may be dropped. Consider throttling or batching.`,
    );
    return true;
  }

  if (queueDepth >= warn) {
    console.warn(
      `[Performance] WebSocket queue depth approaching limit: ${queueDepth} / ${max}\n` +
        `Processing may be falling behind.`,
    );
    return true;
  }

  return false;
}

/**
 * Log a performance timing to console (dev only)
 *
 * Simple utility for logging performance timings without using marks.
 *
 * @param label - Label for the timing
 * @param duration - Duration in milliseconds
 * @param threshold - Optional threshold to highlight slow operations
 */
export function logPerformanceTiming(label: string, duration: number, threshold?: number): void {
  if (!isDev) {
    return;
  }

  const formattedDuration = duration.toFixed(2);

  if (threshold && duration > threshold) {
    console.warn(
      `[Performance] ${label}: ${formattedDuration}ms (exceeds ${threshold}ms threshold)`,
    );
  } else {
    console.log(`[Performance] ${label}: ${formattedDuration}ms`);
  }
}

/**
 * Create a performance timer (dev only)
 *
 * Returns a function that when called, logs the elapsed time since creation.
 *
 * @param label - Label for the timer
 * @returns Function to end timer and log duration, or no-op in production
 *
 * @example
 * ```typescript
 * const endTimer = startPerformanceTimer('data-fetch');
 * await fetchData();
 * endTimer(); // Logs "data-fetch: XXms"
 * ```
 */
export function startPerformanceTimer(label: string): () => number {
  if (!isDev) {
    return () => 0;
  }

  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    logPerformanceTiming(label, duration);
    return duration;
  };
}
