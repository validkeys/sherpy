---
id: react-query-api-layer
name: React Query API Layer Pattern
category: Data Fetching
tags: [react-query, api, hooks, three-part-pattern]
created: 2026-04-28
---

## Overview

Three-part API declaration pattern: (1) fetcher function, (2) queryOptions factory, (3) hook. This provides flexibility for different use cases while maintaining consistency.

## Source Reference

**Pattern**: Bulletproof React API Layer
**Reference**: https://github.com/alan2207/bulletproof-react
**Example**: `/apps/react-vite/src/features/discussions/api/get-discussions.ts`

## Code Example

```typescript
// features/discussions/api/get-discussions.ts

import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { QueryConfig } from '@/lib/react-query';
import { Discussion } from '../types';

// Part 1: Fetcher function - pure data fetching logic
export const getDiscussions = ({ page = 1 }: { page?: number }): Promise<{
  data: Discussion[];
  meta: { page: number; totalPages: number };
}> => {
  return api.get('/discussions', {
    params: { page },
  });
};

// Part 2: Query options factory - reusable configuration
export const getDiscussionsQueryOptions = (page?: number) => {
  return queryOptions({
    queryKey: ['discussions', { page }],
    queryFn: () => getDiscussions({ page }),
  });
};

// Part 3: Hook - convenient usage in components
export const useDiscussions = ({
  page,
  queryConfig,
}: {
  page?: number;
  queryConfig?: QueryConfig<typeof getDiscussionsQueryOptions>;
}) => {
  return useQuery({
    ...getDiscussionsQueryOptions(page),
    ...queryConfig,
  });
};
```

## What This Demonstrates

- **Separation of Concerns**: Fetching logic separate from React
- **Testability**: Each part can be tested independently
- **Flexibility**: Can use fetcher directly, queryOptions in loaders, or hook in components
- **Type Safety**: Full TypeScript inference through the chain
- **Consistency**: Same pattern across all API calls

## When to Use

- When creating any GET endpoint integration
- When you need to fetch data for display in a component
- When implementing list views, detail views, or any read operations
- When you need consistent query key management

## Pattern Requirements

✓ Name fetcher function with action verb (`getDiscussions`, `getProject`, etc.)
✓ Accept parameters as single object argument
✓ Return Promise with properly typed response
✓ Create queryOptions factory that accepts same parameters
✓ Use descriptive queryKey array (e.g., `['discussions', { page }]`)
✓ Export hook that combines queryOptions with optional queryConfig
✓ Allow hook consumers to override with queryConfig parameter

## Common Mistakes to Avoid

❌ Skipping the queryOptions factory (needed for prefetching and loaders)
❌ Using multiple parameters instead of single object (`(page, limit)` → `({ page, limit })`)
❌ Not including parameters in queryKey (causes stale data issues)
❌ Hardcoding query configuration in queryOptions (use queryConfig override instead)
❌ Not typing the return value of fetcher function
❌ Inconsistent naming conventions (stick to get/create/update/delete prefix)

## Related Anchors

- `react-query-mutations` - How to handle POST/PATCH/DELETE operations
- `react-query-infinite` - How to implement infinite scroll
- `feature-module-structure` - Where API files belong in feature structure

## Test Coverage

**Unit Test (Fetcher)**:
```typescript
import { getDiscussions } from './get-discussions';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('getDiscussions', () => {
  it('calls API with correct parameters', async () => {
    const mockData = { data: [], meta: { page: 1, totalPages: 1 } };
    vi.mocked(api.get).mockResolvedValue(mockData);

    const result = await getDiscussions({ page: 2 });

    expect(api.get).toHaveBeenCalledWith('/discussions', {
      params: { page: 2 },
    });
    expect(result).toEqual(mockData);
  });
});
```

**Integration Test (Hook in Component)**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useDiscussions } from './get-discussions';
import { createWrapper } from '@/test/utils';

describe('useDiscussions', () => {
  it('fetches discussions successfully', async () => {
    const { result } = renderHook(() => useDiscussions({ page: 1 }), {
      wrapper: createWrapper(), // Provides QueryClientProvider
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```
