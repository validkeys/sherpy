# Performance Monitor Integration Example

**Task:** M0-019 - Performance Budgets and Monitoring  
**Status:** Example for future integration

## Integration into App.tsx

When ready to enable performance monitoring, add the hook to the root App component:

```typescript
// src/App.tsx
import { Sidebar } from '@/features/sidebar';
import { Button } from '@/shared/components/ui/button';
import { usePerformanceMonitor, queryClient } from '@/lib'; // Add import

function App() {
  // Add performance monitoring hook (dev-only, zero production overhead)
  usePerformanceMonitor(queryClient, {
    interval: 30000,  // Check cache every 30 seconds
    logStats: false,  // Set to true for detailed logging
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Sherpy Planning Pipeline</h1>
          <p className="text-gray-600 mb-6">
            Navigate through the workflow steps using the sidebar to track your progress.
          </p>
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Main Content Area</h2>
            <p className="text-gray-600 mb-4">
              This is where the content for each workflow step will be displayed. Select a step from
              the sidebar to begin.
            </p>
            <div className="flex gap-2">
              <Button>Default Button</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="outline">Outline</Button>
              <Button isLoading>Loading</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
```

## What This Provides

When the hook is added, it will automatically (in dev mode only):

1. **Monitor React Query Cache:**
   - Checks cache size every 30 seconds
   - Warns if approaching 800 entries
   - Errors if exceeding 1000 entries
   - Logs stats including active, stale, and inactive queries

2. **Zero Production Overhead:**
   - Hook becomes a no-op in production builds
   - No performance impact on end users
   - All monitoring logic stripped in production

3. **Console Output Examples:**

```
[Performance Monitor] Starting cache monitoring...

// Every 30 seconds (only if approaching budgets):
[Performance] Cache entries approaching budget: 825 / 1000
Active: 12, Stale: 234, Inactive: 579

// If logStats: true
[Performance] React Query Cache Stats: {
  total: 450,
  active: 8,
  stale: 123,
  inactive: 319,
  budget: "450/1000",
  utilization: "45%"
}
```

## When to Enable

Consider enabling when:
- You start implementing data fetching features
- You notice performance issues
- You want to understand cache behavior
- You're debugging query invalidation issues

## Alternative: Conditional Enabling

Enable only for specific developers or scenarios:

```typescript
function App() {
  // Enable monitoring only with URL param or env var
  const shouldMonitor = 
    new URLSearchParams(window.location.search).has('monitor') ||
    localStorage.getItem('enableMonitoring') === 'true';

  usePerformanceMonitor(queryClient, {
    interval: 30000,
    logStats: shouldMonitor,
  });

  return (
    // ... app content
  );
}
```

Usage:
```
http://localhost:5173/?monitor=true
```

Or in browser console:
```javascript
localStorage.setItem('enableMonitoring', 'true');
// Refresh page
```

## Complementary Tools

Combine with React Query DevTools for comprehensive monitoring:

```typescript
// src/main.tsx or App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { usePerformanceMonitor, queryClient } from '@/lib';

function App() {
  usePerformanceMonitor(queryClient, { interval: 30000 });

  return (
    <>
      {/* Your app */}
      <YourApp />
      
      {/* React Query DevTools (dev-only) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

## Monitoring Critical Operations

Profile expensive operations in your features:

```typescript
// Example: In a document generation feature
import { performanceMark, performanceMeasure } from '@/lib/performance-monitor';

async function generateDocument(projectId: string) {
  performanceMark('doc-gen-start');

  try {
    const result = await apiClient.post(`/projects/${projectId}/generate`);
    
    const duration = performanceMeasure('doc-generation', 'doc-gen-start');
    
    // Log to analytics if slow
    if (duration && duration > 5000) {
      console.warn('Slow document generation detected:', duration);
    }
    
    return result;
  } catch (error) {
    performanceMeasure('doc-generation-failed', 'doc-gen-start');
    throw error;
  }
}
```

## File Tree Monitoring Example

When implementing file tree rendering:

```typescript
import { checkFileTreeBudget } from '@/lib/performance-monitor';

function FileTree({ nodes }: { nodes: FileNode[] }) {
  const nodeCount = countTotalNodes(nodes);
  
  // Check against budget and get recommendation
  const overBudget = checkFileTreeBudget(nodeCount);
  
  // Use virtualization if over budget
  if (overBudget && nodeCount > 500) {
    return <VirtualizedFileTree nodes={nodes} />;
  }
  
  return <DirectFileTree nodes={nodes} />;
}
```

## WebSocket Queue Monitoring Example

When implementing WebSocket message handling:

```typescript
import { checkWebSocketQueueBudget } from '@/lib/performance-monitor';

class WebSocketManager {
  private messageQueue: Message[] = [];
  
  onMessage(message: Message) {
    this.messageQueue.push(message);
    
    // Check queue depth
    checkWebSocketQueueBudget(this.messageQueue.length);
    
    // Trim queue if needed
    if (this.messageQueue.length > 500) {
      this.messageQueue = this.messageQueue.slice(-400);
    }
    
    this.processQueue();
  }
}
```

---

**Note:** This is an example for future implementation. The monitoring utilities are ready to use but not yet integrated into the App component.

See [performance-monitoring-usage.md](./performance-monitoring-usage.md) for comprehensive usage documentation.
