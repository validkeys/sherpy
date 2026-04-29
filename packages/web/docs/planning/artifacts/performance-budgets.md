# Performance Budgets and Monitoring Strategy (M0-019)

**Version:** 1.0  
**Date:** 2026-04-29  
**Status:** Active

## Overview

This document defines performance budgets and monitoring strategy for the Sherpy PM web frontend. These budgets are designed to ensure fast, responsive user experience across all network conditions while maintaining reasonable development velocity.

## Bundle Size Budgets

### Main Application Bundle
- **Target:** 200KB gzipped
- **Maximum:** 250KB gzipped
- **Rationale:** Main bundle contains core application code. Keeping it under 250KB ensures fast initial load even on slower connections.

### Vendor Chunks (per chunk)
- **Target:** 80KB gzipped
- **Maximum:** 100KB gzipped
- **Rationale:** Vendor code is split by library for optimal caching. Individual chunks should be small enough to load quickly but large enough to minimize HTTP requests.

### Total Initial Load
- **Target:** 450KB gzipped
- **Maximum:** 500KB gzipped
- **Rationale:** Combined size of all initial bundles (main + critical vendors). Based on 3G network speeds (750KB/s), this allows ~1.5s download time.

### Lazy-Loaded Chunks
- **Target:** 50KB gzipped
- **Maximum:** 100KB gzipped
- **Rationale:** Feature chunks loaded on-demand should be small to minimize UX disruption.

### Monitoring Strategy
- Build-time warnings at 80% of budget (warn threshold)
- Build-time errors at 100% of budget (error threshold)
- Bundle visualization via `pnpm run analyze`
- Automated checks in CI/CD pipeline

## React Query Cache Budgets

### Cache Entry Limits
- **Maximum Entries:** 1000 queries
- **Warning Threshold:** 800 queries
- **Rationale:** React Query stores query results in memory. Exceeding 1000 entries can cause memory pressure on lower-end devices.

### Auto-Eviction Strategy
- **Garbage Collection Time (gcTime):** 10 minutes
- **Stale Time:** 5 minutes (default for most queries)
- **Rationale:** 
  - Data becomes stale after 5 minutes, prompting refetch on next access
  - Unused data is evicted after 10 minutes to prevent unbounded growth
  - Balance between cache hits and memory usage

### Per-Query Overrides
```typescript
// Long-lived data (user profile, project metadata)
staleTime: 15 * 60 * 1000,  // 15 minutes
gcTime: 30 * 60 * 1000,      // 30 minutes

// Frequently updated data (project status, file tree)
staleTime: 1 * 60 * 1000,    // 1 minute
gcTime: 5 * 60 * 1000,       // 5 minutes

// Real-time data (chat messages - defer to WebSocket)
staleTime: 0,                // Always stale
gcTime: 2 * 60 * 1000,       // 2 minutes
```

### Monitoring Strategy
- Dev-mode monitoring hook to track cache size
- Console warnings when approaching 800 entries
- Periodic cache analysis to identify memory leaks
- Manual cache inspection via React Query DevTools

## WebSocket Message Budgets

### Message Batch Size
- **Maximum Batch Size:** 100 messages
- **Warning Threshold:** 75 messages
- **Rationale:** Processing large message batches can block the main thread. Batches over 100 should be chunked or virtualized.

### Message Throttling
- **Maximum Message Rate:** 100 messages/second
- **Throttle Strategy:** Drop oldest messages in queue
- **Rationale:** Prevents overwhelming the UI during high-frequency updates (e.g., rapid file changes).

### Message Queue Depth
- **Maximum Queue Depth:** 500 messages
- **Warning Threshold:** 400 messages
- **Rationale:** Deep queues indicate processing backlog. UI should show "catching up" indicator.

### Monitoring Strategy
- Dev-mode message rate tracking
- Console warnings for queue depth > 400
- Dropped message counter (logged to console)
- WebSocket health metrics (latency, reconnections)

## File Tree Rendering Budgets

### Direct Rendering Threshold
- **Maximum Nodes:** 500 nodes
- **Rationale:** Direct rendering performs well up to ~500 DOM nodes. Beyond this, virtualization is required.

### Virtualization Requirements
- **Trigger:** > 500 nodes in tree
- **Window Size:** Render 50 nodes above/below viewport
- **Rationale:** Virtualization adds complexity. Only use when necessary for performance.

### Expansion State
- **Maximum Expanded Folders:** 50 folders
- **Auto-Collapse:** Collapse folders beyond 50
- **Rationale:** Deep folder expansion can create huge DOM trees. Limit expansion depth.

### Monitoring Strategy
- Dev-mode node count tracking
- Warning when approaching 500 nodes without virtualization
- Render time profiling (React DevTools Profiler)
- User-reported performance issues

## Loading Performance Budgets

### Initial Load Time (3G Network)
- **Target:** 1.5 seconds
- **Maximum:** 2 seconds
- **Measurement:** From navigation start to first byte of HTML
- **Rationale:** Based on research showing 53% of users abandon after 3s. Conservative budget accounts for backend processing.

### Time to Interactive (TTI)
- **Target:** 2.5 seconds
- **Maximum:** 3 seconds
- **Measurement:** When page is fully interactive (main thread idle, event handlers registered)
- **Rationale:** Users should be able to interact quickly. TTI > 3s feels sluggish.

### First Contentful Paint (FCP)
- **Target:** 0.8 seconds
- **Maximum:** 1 second
- **Measurement:** When first content pixel is rendered
- **Rationale:** Fast FCP reduces perceived load time and bounce rate.

### Largest Contentful Paint (LCP)
- **Target:** 2 seconds
- **Maximum:** 2.5 seconds
- **Measurement:** When largest content element is rendered
- **Rationale:** Core Web Vital. LCP < 2.5s is "good" per Google standards.

### Cumulative Layout Shift (CLS)
- **Target:** 0.05
- **Maximum:** 0.1
- **Measurement:** Sum of all unexpected layout shifts
- **Rationale:** Core Web Vital. CLS < 0.1 is "good". Minimize layout shifts for better UX.

### Monitoring Strategy (M0 - Dev Only)
- **Browser Performance API:** Manual measurements during development
- **Chrome DevTools:** Performance profiling on 3G throttled connection
- **Lighthouse:** Regular audits (target score > 90)
- **No Production Monitoring:** M0 phase focuses on establishing baselines

## Production Monitoring Strategy (Future - Post-M0)

### Metrics to Track
1. **Real User Monitoring (RUM)**
   - FCP, LCP, TTI, CLS for actual users
   - Network conditions (4G, 3G, WiFi)
   - Device types (mobile, tablet, desktop)
   - Geographic distribution

2. **Bundle Size Tracking**
   - Historical bundle size trends
   - Detect unexpected size increases
   - Alert on budget violations in CI/CD

3. **Cache Performance**
   - Cache hit/miss ratios
   - Memory usage patterns
   - Query execution times

4. **WebSocket Health**
   - Connection stability (reconnection rate)
   - Message latency (round-trip time)
   - Dropped message count

5. **Error Tracking**
   - JavaScript errors
   - Network failures
   - React error boundaries

### Alert Thresholds

#### Critical (Page On-Call)
- LCP p95 > 4 seconds
- TTI p95 > 5 seconds
- Error rate > 5%
- WebSocket disconnection rate > 10%

#### Warning (Investigate Next Business Day)
- LCP p95 > 3 seconds
- TTI p95 > 4 seconds
- Error rate > 2%
- Bundle size > budget
- Cache size > 800 entries

#### Info (Monitor Trend)
- LCP p95 > 2.5 seconds
- TTI p95 > 3 seconds
- Error rate > 1%
- Cache hit rate < 80%

### Monitoring Tools (Post-M0 Recommendations)

#### Recommended Options
1. **Sentry** - Error tracking + performance monitoring
2. **Vercel Analytics** - If hosting on Vercel
3. **LogRocket** - Session replay + performance
4. **DataDog RUM** - Enterprise-grade monitoring
5. **Custom Solution** - Performance API + analytics endpoint

#### M0 Tooling (Dev Only)
- Browser DevTools Performance tab
- React Query DevTools
- Vite bundle analyzer (rollup-plugin-visualizer)
- Manual Lighthouse audits
- Custom dev-mode monitoring utilities

## Budget Validation Process

### During Development
1. Run `pnpm run analyze` to check bundle sizes
2. Use React Query DevTools to monitor cache
3. Profile components with React DevTools
4. Test on throttled network (Chrome DevTools)
5. Run Lighthouse audit before merging

### CI/CD Integration (Post-M0)
1. Automated bundle size checks (fail build on violation)
2. Lighthouse CI for performance regression detection
3. Bundle size reporting in PR comments
4. Historical tracking of performance metrics

### Regular Audits
- Weekly: Check bundle sizes and trends
- Bi-weekly: Manual performance testing on various devices
- Monthly: Comprehensive Lighthouse audit
- Quarterly: Review and adjust budgets based on data

## Rationale and Trade-offs

### Why These Numbers?

**Bundle Sizes:** Based on industry research showing that 250KB gzipped (~1MB uncompressed) is a reasonable target for modern SPAs. Larger bundles significantly impact load time on 3G.

**Cache Limits:** 1000 entries is conservative but prevents unbounded growth. React Query's intelligent eviction ensures most-used data stays cached.

**WebSocket Rates:** 100 msg/s is well within browser capabilities but requires thoughtful UI updates. Higher rates risk UI thread blocking.

**File Tree Nodes:** 500 nodes is the sweet spot where virtualization overhead exceeds direct rendering benefits. Most projects won't exceed this.

**Load Times:** Based on Google's research on user engagement. 3G is chosen as baseline because it represents ~40% of global mobile users.

### Trade-offs Accepted

1. **Strict Budgets vs. Feature Velocity:** We accept longer development time to maintain performance standards.

2. **Bundle Size vs. Developer Experience:** We use code splitting and lazy loading even though it adds complexity.

3. **Cache Size vs. Network Requests:** We limit cache size even though it means more network requests for edge cases.

4. **Dev-Only Monitoring:** We defer production monitoring to keep M0 scope manageable, but establish patterns for future implementation.

## Review and Updates

This document should be reviewed and updated:
- When adopting new major dependencies
- After performance audits reveal issues
- When user feedback indicates performance problems
- Quarterly as part of technical debt review

**Next Review Date:** 2026-07-29

## References

- [Web.dev Performance Budgets](https://web.dev/performance-budgets-101/)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report)
- [bulletproof-react Performance](https://github.com/alan2207/bulletproof-react/blob/master/docs/performance.md)

---

**Document Status:** Active  
**Owner:** Frontend Team  
**Approved By:** Technical Lead  
**Last Updated:** 2026-04-29
