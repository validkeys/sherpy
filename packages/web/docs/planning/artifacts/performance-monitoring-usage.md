# Performance Monitoring Usage Guide

**Related:** [performance-budgets.md](./performance-budgets.md)  
**Implementation:** M0-019

This guide demonstrates how to use the performance monitoring utilities in development.

## Quick Start

```typescript
import { usePerformanceMonitor, performanceMark, performanceMeasure } from '@/lib/performance-monitor';
import { queryClient } from '@/lib/query-client';

// In your root App component
function App() {
  // Monitor React Query cache automatically
  usePerformanceMonitor(queryClient, {
    interval: 30000, // Check every 30 seconds
    logStats: true,  // Log cache stats periodically
  });

  return <YourApp />;
}
```

## React Query Cache Monitoring

### Automatic Monitoring Hook

The `usePerformanceMonitor` hook automatically tracks cache size and warns when approaching budgets:

```typescript
import { usePerformanceMonitor } from '@/lib/performance-monitor';

function App() {
  // Default: checks every 30s, no periodic logging
  usePerformanceMonitor(queryClient);

  // Custom: check every 60s and log stats
  usePerformanceMonitor(queryClient, {
    interval: 60000,
    logStats: true,
  });

  return <Router />;
}
```

### Manual Cache Inspection

Check cache stats on-demand:

```typescript
import { getCacheStats, logCacheStats, checkCacheBudget } from '@/lib/performance-monitor';

// Get cache statistics
const stats = getCacheStats(queryClient);
console.log('Cache entries:', stats?.totalQueries);
console.log('Active queries:', stats?.activeQueries);
console.log('Stale queries:', stats?.staleQueries);

// Log formatted stats to console
logCacheStats(queryClient);
// Output: [Performance] React Query Cache Stats: { total: 45, active: 3, stale: 12, ... }

// Check if cache exceeds budgets
const overBudget = checkCacheBudget(queryClient);
if (overBudget) {
  console.warn('Cache needs attention');
}
```

## Performance Marks and Measures

Use browser Performance API through convenience wrappers:

### Basic Timing

```typescript
import { performanceMark, performanceMeasure } from '@/lib/performance-monitor';

// Mark start of operation
performanceMark('data-fetch-start');

// ... perform operation ...
await fetchData();

// Measure duration from mark to now
const duration = performanceMeasure('data-fetch', 'data-fetch-start');
// Output: [Performance Measure] data-fetch: 245.32ms
```

### Timing Between Two Points

```typescript
performanceMark('operation-start');

// ... some work ...

performanceMark('operation-end');

// Measure between two marks
performanceMeasure('full-operation', 'operation-start', 'operation-end');
// Output: [Performance Measure] full-operation: 523.67ms
```

### With Metadata

```typescript
performanceMark('api-request', {
  endpoint: '/api/projects',
  method: 'GET',
});
// Output: [Performance Mark] api-request { name: "api-request", timestamp: 1234.56, metadata: { ... } }
```

## Simple Timer Pattern

For quick timing without managing marks:

```typescript
import { startPerformanceTimer } from '@/lib/performance-monitor';

const endTimer = startPerformanceTimer('component-render');

// ... rendering work ...

const duration = endTimer();
// Output: [Performance] component-render: 12.45ms
// Returns: 12.45
```

## File Tree Rendering Monitoring

Track file tree node counts to know when virtualization is needed:

```typescript
import { checkFileTreeBudget } from '@/lib/performance-monitor';

function FileTree({ nodes }) {
  const nodeCount = nodes.length;

  // Check against budget (warns at 400, errors at 500)
  const overBudget = checkFileTreeBudget(nodeCount);

  if (overBudget && nodeCount >= 500) {
    // Enable virtualization
    return <VirtualizedFileTree nodes={nodes} />;
  }

  return <DirectFileTree nodes={nodes} />;
}
```

Budget thresholds:
- **Warning:** 400 nodes
- **Maximum:** 500 nodes

## WebSocket Message Queue Monitoring

Track message queue depth to prevent UI blocking:

```typescript
import { checkWebSocketQueueBudget } from '@/lib/performance-monitor';

class WebSocketManager {
  private messageQueue: Message[] = [];

  processMessage(message: Message) {
    this.messageQueue.push(message);

    // Check queue depth against budget
    const overBudget = checkWebSocketQueueBudget(this.messageQueue.length);

    if (overBudget && this.messageQueue.length >= 500) {
      // Drop oldest messages or throttle
      this.messageQueue = this.messageQueue.slice(-400);
      console.warn('Message queue trimmed due to backlog');
    }

    this.processQueue();
  }
}
```

Budget thresholds:
- **Warning:** 400 messages
- **Maximum:** 500 messages

## Custom Timing with Threshold Alerts

Log timings and automatically warn if they exceed a threshold:

```typescript
import { logPerformanceTiming } from '@/lib/performance-monitor';

async function fetchProjects() {
  const start = performance.now();
  const projects = await apiClient.get('/projects');
  const duration = performance.now() - start;

  // Warn if exceeds 1000ms
  logPerformanceTiming('fetch-projects', duration, 1000);
  // Normal: [Performance] fetch-projects: 234.56ms
  // Slow:   [Performance] fetch-projects: 1523.45ms (exceeds 1000ms threshold)

  return projects;
}
```

## Bundle Size Analysis

Bundle sizes are monitored automatically during builds:

```bash
# Build with bundle size checks
pnpm run build

# Output includes:
# ✅ All performance budgets met!
#    Total: 105.63KB / 500.00KB (21% utilized)

# Visualize bundle composition
pnpm run analyze

# Opens stats.html with interactive treemap
```

### Build Output Examples

**Success:**
```
✅ All performance budgets met!
   Total: 450.23KB / 500.00KB (90% utilized)
```

**Warning:**
```
⚠️  Performance Budget Warnings:
  - Main bundle approaching budget: 215.67KB (warn at 200.00KB)
  - Total bundle size approaching budget: 475.12KB (warn at 450.00KB)
```

**Error:**
```
❌ Performance Budget Errors:
  - Chunk "vendor-react" exceeds budget: 112.34KB > 100.00KB
  - Total bundle size exceeds budget: 523.45KB > 500.00KB

Actions:
  1. Run `pnpm run analyze` to visualize bundle composition
  2. Review docs/planning/artifacts/performance-budgets.md
  3. Consider lazy loading features or splitting large vendors
```

## Performance Budgets Reference

Quick reference of configured budgets:

```typescript
import { PERFORMANCE_BUDGETS } from '@/lib/performance-monitor';

// Bundle sizes (in bytes, gzipped)
PERFORMANCE_BUDGETS.bundleSize.main.max    // 250KB
PERFORMANCE_BUDGETS.bundleSize.chunk.max   // 100KB

// React Query cache
PERFORMANCE_BUDGETS.cacheEntries.warn      // 800 entries
PERFORMANCE_BUDGETS.cacheEntries.max       // 1000 entries

// File tree rendering
PERFORMANCE_BUDGETS.fileTreeNodes.warn     // 400 nodes
PERFORMANCE_BUDGETS.fileTreeNodes.max      // 500 nodes

// WebSocket message queue
PERFORMANCE_BUDGETS.websocketQueue.warn    // 400 messages
PERFORMANCE_BUDGETS.websocketQueue.max     // 500 messages
```

## Best Practices

### 1. Use Monitoring Hook in Root Component

```typescript
// src/App.tsx
function App() {
  usePerformanceMonitor(queryClient, {
    interval: 30000,
    logStats: process.env.NODE_ENV === 'development',
  });

  return <Router />;
}
```

### 2. Profile Expensive Operations

```typescript
async function generateDocument(projectId: string) {
  const endTimer = startPerformanceTimer('document-generation');

  try {
    const result = await apiClient.post(`/projects/${projectId}/generate`);
    return result;
  } finally {
    const duration = endTimer();

    // Log to analytics if too slow
    if (duration > 5000) {
      analytics.track('slow-document-generation', { duration, projectId });
    }
  }
}
```

### 3. Monitor Critical User Paths

```typescript
function ProjectCreationWizard() {
  useEffect(() => {
    performanceMark('wizard-mount');
    return () => {
      performanceMeasure('wizard-lifetime', 'wizard-mount');
    };
  }, []);

  const handleSubmit = async (data: ProjectData) => {
    performanceMark('project-create-start');

    try {
      await createProject(data);
      performanceMeasure('project-creation', 'project-create-start');
    } catch (error) {
      console.error('Project creation failed', error);
    }
  };

  return <WizardForm onSubmit={handleSubmit} />;
}
```

### 4. Check Budgets Before Expensive Rendering

```typescript
function LargeDataTable({ data }) {
  const rowCount = data.length;

  // Check if we need virtualization
  const shouldVirtualize = rowCount > 500;

  if (shouldVirtualize) {
    checkFileTreeBudget(rowCount); // Logs warning
    return <VirtualizedTable data={data} />;
  }

  return <SimpleTable data={data} />;
}
```

## DevTools Integration

All monitoring utilities integrate with browser DevTools:

### Chrome Performance Panel
1. Open DevTools → Performance tab
2. Record profile
3. Look for User Timing marks/measures
4. All `performanceMark()` and `performanceMeasure()` calls appear here

### React Query DevTools
1. Add `@tanstack/react-query-devtools` to your app
2. View cache entries, active queries, stale queries
3. Manually invalidate or refetch queries
4. Inspect query details and timings

### Console Monitoring
All performance logs are prefixed with `[Performance]` for easy filtering:
- `[Performance Monitor]` - Cache monitoring events
- `[Performance Mark]` - Performance marks
- `[Performance Measure]` - Duration measurements
- `[Performance]` - General timing logs

Filter in console:
```
/\[Performance.*\]/
```

## Production Considerations

**Important:** All monitoring utilities are dev-only and have zero overhead in production.

```typescript
// In production, these are no-ops:
performanceMark('test');        // Does nothing
getCacheStats(queryClient);      // Returns null
usePerformanceMonitor(client);   // No-op
```

Production monitoring should use:
- Real User Monitoring (RUM) tools
- APM platforms (DataDog, Sentry, etc.)
- Custom analytics events
- Server-side logging

See [performance-budgets.md](./performance-budgets.md) for production monitoring strategy.

## Troubleshooting

### Cache Growing Too Large

If you see cache warnings:

1. **Review stale/gc times:**
   ```typescript
   // Reduce cache retention for frequently updated data
   useQuery({
     queryKey: ['projects'],
     queryFn: fetchProjects,
     staleTime: 1 * 60 * 1000,  // 1 minute instead of 5
     gcTime: 2 * 60 * 1000,      // 2 minutes instead of 10
   });
   ```

2. **Remove unused queries:**
   ```typescript
   queryClient.removeQueries({ queryKey: ['old-feature'] });
   ```

3. **Check for query key mistakes:**
   ```typescript
   // Bad: Creates new cache entry on every render
   useQuery({ queryKey: ['projects', new Date()] });

   // Good: Stable query key
   useQuery({ queryKey: ['projects'] });
   ```

### Performance Marks Not Appearing

If marks don't show in DevTools:

1. Ensure you're in development mode
2. Check browser console for warnings
3. Verify Performance API is available:
   ```typescript
   console.log('Performance API:', !!window.performance);
   ```

### Bundle Size Exceeding Budget

If build fails due to bundle size:

1. Run `pnpm run analyze` to visualize
2. Look for unexpectedly large chunks
3. Consider lazy loading:
   ```typescript
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```
4. Check for duplicate dependencies
5. Review tree-shaking configuration

---

**Last Updated:** 2026-04-29  
**Related Docs:**
- [performance-budgets.md](./performance-budgets.md) - Budget definitions and rationale
- [/packages/web/src/lib/performance-monitor.ts](../../../src/lib/performance-monitor.ts) - Implementation
- [/packages/web/vite.config.ts](../../../vite.config.ts) - Build configuration
