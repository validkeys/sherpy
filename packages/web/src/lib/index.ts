/**
 * Library Configuration
 *
 * Re-export configured library instances
 */

export { api } from "./api-client";
export { queryClient } from "./query-client";
export { ErrorBoundary } from "./error-boundary";
export type { ErrorBoundaryProps } from "./error-boundary";
export {
  usePerformanceMonitor,
  getCacheStats,
  checkCacheBudget,
  logCacheStats,
  performanceMark,
  performanceMeasure,
  clearPerformanceMarks,
  checkFileTreeBudget,
  checkWebSocketQueueBudget,
  logPerformanceTiming,
  startPerformanceTimer,
  PERFORMANCE_BUDGETS,
} from "./performance-monitor";
export type { CacheStats } from "./performance-monitor";
