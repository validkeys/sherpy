# Development Tools

This document describes the development and debugging tools available in the JARVIS AI Assistant frontend application.

## React Query DevTools

### Overview

React Query DevTools is integrated into the application to help debug server state management, cache behavior, and query/mutation performance.

### Accessing DevTools

The DevTools panel is automatically available in **development mode only** (`import.meta.env.DEV`). It will not appear in production builds.

**Location**: Bottom-right corner of the screen (floating icon)

**How to Open**:
1. Look for the React Query DevTools icon (🌀) in the bottom-right corner
2. Click the icon to open the DevTools panel
3. The panel will slide up from the bottom

**Initial State**: Closed by default (`initialIsOpen={false}`)

### Features

#### 1. Query Explorer
- View all active queries in the application
- See query keys, data, and fetch status
- Inspect stale/fresh status of cached data
- Filter queries by key or status

#### 2. Mutation Tracker
- Monitor all mutations (POST, PATCH, DELETE operations)
- View mutation status (idle, loading, success, error)
- Inspect mutation variables and results
- Debug cache invalidation timing

#### 3. Query Timeline
- Visual timeline of query executions
- See fetch durations and retry attempts
- Identify slow or frequently refetching queries
- Debug race conditions

#### 4. Cache Inspector
- Browse the entire React Query cache
- View cached data structures
- Manually invalidate cache entries for testing
- Force refetch queries

### Common Use Cases

#### Debugging Cache Invalidation
```typescript
// After a mutation, verify cache invalidation in DevTools
const { mutate } = useCreateProject();

mutate(projectData, {
  onSuccess: () => {
    // Check DevTools: ['projects'] query should show as 'stale'
    // and automatically refetch
  }
});
```

#### Identifying Performance Issues
- Open DevTools Query Timeline
- Look for queries that fetch too frequently
- Check if staleTime is configured correctly
- Verify cache keys include all parameters

#### Testing Error States
- Manually trigger errors in DevTools
- Verify error handling displays correctly
- Test retry logic by forcing failures

### Configuration

DevTools are configured in `src/providers/app-provider.tsx`:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

### Best Practices

1. **Keep DevTools Closed During Development**: Only open when actively debugging to avoid performance overhead
2. **Use Query Keys to Navigate**: Filter by query key prefix (e.g., `['projects']`) to find related queries
3. **Check Cache State Before Debugging**: Many issues are caused by stale cache entries
4. **Use Timeline for Performance Tuning**: Identify queries that could benefit from longer staleTime
5. **Verify Invalidation After Mutations**: Always check that related queries refetch after mutations

## API Request Logging

### Overview

All API requests and responses are logged to the browser console in **development mode only**. This helps debug API integration issues, inspect request/response payloads, and monitor performance.

### Log Format

#### Request Logs
```
[API] GET http://localhost:3000/api/projects { body }
```

**Format**: `[API] {METHOD} {URL} {body}`
- `METHOD`: HTTP method (GET, POST, PATCH, DELETE)
- `URL`: Full URL including query parameters
- `body`: Request body (for POST/PATCH/PUT), empty for GET

#### Response Logs
```
[API] GET http://localhost:3000/api/projects - 200 (145ms)
```

**Format**: `[API] {METHOD} {URL} - {STATUS} ({DURATION}ms)`
- `STATUS`: HTTP status code (200, 404, 500, etc.)
- `DURATION`: Request duration in milliseconds

#### Error Logs
```
[API] POST http://localhost:3000/api/projects - Error: { error details }
```

**Format**: `[API] {METHOD} {URL} - Error: {error}`
- Includes full error object with stack trace
- Shows whether error is ApiError or NetworkError

### Configuration

API logging is configured in `src/lib/api-client.ts`:

```typescript
async function request<T>(
  method: HttpMethod,
  path: string,
  config?: RequestConfig,
  body?: unknown,
  retryCount = 0
): Promise<T> {
  const url = buildUrl(env.apiUrl, path, config?.params);
  
  // Log request in development mode
  if (env.devMode) {
    console.log(`[API] ${method} ${url}`, body ? { body } : '');
  }
  
  const startTime = performance.now();
  const response = await fetch(url, { /* ... */ });
  const duration = performance.now() - startTime;
  
  // Log response in development mode
  if (env.devMode) {
    console.log(
      `[API] ${method} ${url} - ${response.status} (${Math.round(duration)}ms)`
    );
  }
  
  // ... error handling with logging
}
```

### Environment Control

Logging is controlled by the `devMode` flag in `src/config/env.ts`:

```typescript
const devMode = parseBoolean(
  getOptionalEnv('VITE_DEV_MODE', String(import.meta.env.DEV))
);
```

**Default Behavior**:
- `devMode = true` in development builds (`npm run dev`)
- `devMode = false` in production builds (`npm run build`)

**Override** (optional):
```bash
# .env.local
VITE_DEV_MODE=true  # Enable logging even in production build (not recommended)
```

### Log Analysis

#### Finding Slow Requests
1. Open browser console
2. Filter by `[API]`
3. Sort by duration (look for times > 1000ms)
4. Investigate slow endpoints with backend team

#### Debugging Failed Requests
1. Look for `[API] ... - Error:` entries
2. Check error type (ApiError vs NetworkError)
3. Verify request URL and body are correct
4. Check HTTP status code for server errors (5xx)

#### Verifying Request Payloads
1. Find the request log with body
2. Expand the `{ body }` object in console
3. Verify all required fields are present
4. Check for Zod validation errors

#### Monitoring API Usage
1. Count requests to each endpoint over time
2. Identify redundant or unnecessary fetches
3. Optimize with React Query caching strategies
4. Reduce request frequency with proper staleTime

### Common Patterns

#### Successful Request Flow
```
[API] GET http://localhost:3000/api/projects
[API] GET http://localhost:3000/api/projects - 200 (145ms)
```

#### Request with Body
```
[API] POST http://localhost:3000/api/projects { body: { name: "New Project", priority: "high" } }
[API] POST http://localhost:3000/api/projects - 201 (234ms)
```

#### Failed Request with Retry
```
[API] GET http://localhost:3000/api/projects
[API] GET http://localhost:3000/api/projects - Error: NetworkError: Network request failed
[API] GET http://localhost:3000/api/projects
[API] GET http://localhost:3000/api/projects - 200 (187ms)
```

#### Unauthorized Request
```
[API] GET http://localhost:3000/api/projects
[API] GET http://localhost:3000/api/projects - 401 (67ms)
[API] GET http://localhost:3000/api/projects - Error: ApiError: Unauthorized
```

### Best Practices

1. **Filter Console by [API]**: Use browser console filter to focus on API logs
2. **Monitor During Integration**: Watch logs when integrating new endpoints
3. **Verify Cache Behavior**: Confirm requests aren't made when data is cached
4. **Check Query Parameters**: Ensure URL includes all filter parameters
5. **Report Performance Issues**: Log screenshots for backend team when investigating slow queries
6. **Disable in Production**: Never enable `VITE_DEV_MODE` in production deployments

## Additional Development Tools

### Browser DevTools Extensions

**Recommended Extensions**:
- **React Developer Tools**: Inspect component tree and props
- **Redux DevTools**: (if Redux added in future)
- **React Query DevTools**: Already integrated (see above)

### Performance Profiling

Use Chrome DevTools Performance tab to:
- Record component render times
- Identify unnecessary re-renders
- Profile API request timing
- Analyze memory usage

### Network Tab

Complement API logging with Network tab:
- View raw request/response headers
- Inspect response payloads
- Check for CORS issues
- Monitor WebSocket connections

## Troubleshooting

### DevTools Not Appearing

**Problem**: React Query DevTools icon not visible

**Solutions**:
1. Verify you're running in development mode: `npm run dev`
2. Check console for errors loading DevTools
3. Clear browser cache and reload
4. Verify `@tanstack/react-query-devtools` is installed: `pnpm list | grep devtools`

### API Logs Not Showing

**Problem**: No `[API]` logs in console

**Solutions**:
1. Check `VITE_DEV_MODE` in `.env.local` (should be `true` or empty for dev)
2. Verify console is not filtered (remove any active filters)
3. Check that `env.devMode` is `true` in debugger
4. Restart dev server after changing env variables

### Too Many Logs

**Problem**: Console flooded with API logs

**Solutions**:
1. Use console filter: Type `[API]` in console filter box
2. Temporarily disable specific queries in React Query DevTools
3. Add more specific log levels (if needed, create feature request)
4. Use browser console grouping to organize logs

## Future Enhancements

Potential improvements for development experience:

1. **Structured Logging**: Implement log levels (debug, info, warn, error)
2. **Request Interceptors**: Add custom request/response transformers
3. **Mock Service Worker**: Integrate MSW for API mocking in development
4. **Performance Metrics**: Track and display API performance statistics
5. **Error Reporting**: Integrate with Sentry or similar for production error tracking

## Related Documentation

- [React Query DevTools Official Docs](https://tanstack.com/query/latest/docs/react/devtools)
- [API Client Documentation](../src/lib/api-client.ts)
- [Environment Configuration](../src/config/env.ts)
- [WebSocket Testing Strategy](../../docs/planning/artifacts/websocket-testing-strategy.md)

## Support

For issues or feature requests related to development tools:
1. Check this documentation first
2. Review React Query DevTools documentation
3. Ask in team chat
4. Create a GitHub issue with `[dev-tools]` label
