# API Integration Layer

This directory contains the API integration layer for the JARVIS AI Assistant frontend. All server state management uses React Query with standardized patterns for consistency and maintainability.

## Architecture Overview

### Directory Structure

```
src/shared/api/
├── projects/           # Projects CRUD operations
│   ├── __tests__/     # Integration tests
│   ├── create-project.ts
│   ├── get-project.ts
│   ├── get-projects.ts
│   ├── update-project.ts
│   ├── index.ts       # Barrel export
│   ├── schemas.ts     # Zod validation schemas
│   └── types.ts       # TypeScript types
├── documents/         # Documents API (generate, list, get)
│   ├── __tests__/
│   ├── generate-document.ts
│   ├── get-document.ts
│   ├── get-documents.ts
│   ├── index.ts
│   ├── schemas.ts
│   └── types.ts
└── chat/             # Chat messages API
    ├── __tests__/
    ├── get-messages.ts
    ├── send-message.ts
    ├── index.ts
    ├── schemas.ts
    └── types.ts
```

### Design Principles

1. **Feature-Based Organization**: APIs grouped by domain (projects, documents, chat)
2. **Separation of Concerns**: Types, schemas, and endpoints in separate files
3. **Co-located Tests**: Tests live in `__tests__` directories next to source
4. **Barrel Exports**: Each module exports via `index.ts` for clean imports
5. **Single Source of Truth**: Types imported from `@sherpy/shared` when possible

## Patterns

### Three-Part Query Pattern (GET Requests)

All GET endpoints follow this standardized pattern:

```typescript
// Part 1: Fetcher function
// Pure async function that calls the API
export async function getProjects(params?: ListProjectsParams): Promise<ProjectListResponse> {
  return api.get<ProjectListResponse>('/api/projects', { params });
}

// Part 2: Query options factory
// Creates standardized query options with queryKey and queryFn
export function getProjectsQueryOptions(params?: ListProjectsParams) {
  return queryOptions({
    queryKey: ['projects', params ?? {}] as const,
    queryFn: () => getProjects(params),
  });
}

// Part 3: React Query hook
// Combines query options with consumer overrides
export function useProjects({
  params,
  queryConfig,
}: {
  params?: ListProjectsParams;
  queryConfig?: QueryConfig<typeof getProjectsQueryOptions>;
} = {}) {
  return useQuery({
    ...getProjectsQueryOptions(params),
    ...queryConfig,
  });
}
```

**Why this pattern?**
- Part 1 can be called directly (e.g., in Server Actions, getServerSideProps)
- Part 2 enables prefetching: `await queryClient.prefetchQuery(getProjectsQueryOptions())`
- Part 3 provides the standard hook interface with override capability

### Mutation Pattern (POST/PATCH/DELETE Requests)

All mutations follow this standardized pattern:

```typescript
// 1. Define Zod schema for validation
export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// 2. Fetcher function with validation
export async function createProject(data: CreateProjectInput): Promise<ProjectResponse> {
  // Validate input with Zod
  const validatedData = createProjectInputSchema.parse(data);
  
  // Make API request
  return api.post<ProjectResponse>('/api/projects', validatedData);
}

// 3. Mutation hook with cache invalidation
export function useCreateProject(mutationConfig?: MutationConfig<typeof createProject>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Call consumer's onSuccess if provided
      mutationConfig?.onSuccess?.(data, variables, context);
    },
    ...mutationConfig, // Allow consumer to override defaults
  });
}
```

**Why this pattern?**
- Runtime validation with Zod catches errors early
- Type inference from Zod schema (`z.infer`) keeps types in sync
- Automatic cache invalidation keeps UI up-to-date
- Consumer can override onSuccess, onError, etc.

## Cache Management Strategy

### Query Keys

Query keys follow a hierarchical structure:

```typescript
// Projects
['projects']                          // All projects list
['projects', { status: 'intake' }]   // Filtered projects list
['projects', projectId]               // Single project detail

// Documents
['documents', projectId]              // All documents for a project
['documents', projectId, docType]     // Specific document

// Chat
['chat', projectId, 'messages']                    // All messages
['chat', projectId, 'messages', { cursor: '...' }] // Paginated messages
```

**Rules:**
1. Most general to most specific (left to right)
2. Include all parameters that affect the data
3. Use objects for optional/multiple params: `{ page, limit }`
4. Keep keys consistent across related queries

### Cache Invalidation

**Principle:** Invalidate queries, don't update cache manually

```typescript
// ❌ WRONG: Manual cache update
queryClient.setQueryData(['projects'], (old) => [...old, newProject]);

// ✅ CORRECT: Invalidate and let React Query refetch
queryClient.invalidateQueries({ queryKey: ['projects'] });
```

**When to invalidate:**
- After mutations that create/update/delete data
- Invalidate both list and detail caches if needed
- Use query key prefixes to invalidate related queries

**Examples:**
```typescript
// Create project: Invalidate list only
queryClient.invalidateQueries({ queryKey: ['projects'] });

// Update project: Invalidate list + detail
queryClient.invalidateQueries({ queryKey: ['projects'] });
queryClient.invalidateQueries({ queryKey: ['projects', projectId] });

// Generate document: Invalidate project's documents
queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
```

## Adding a New Endpoint

### Step 1: Define Types

Create or update `types.ts`:

```typescript
// Response type
export interface TaskResponse {
  task: Task;
}

// Input type
export interface CreateTaskInput {
  title: string;
  projectId: string;
  assignedTo?: string;
}
```

### Step 2: Create Zod Schema (for mutations)

In `schemas.ts`:

```typescript
export const createTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  projectId: z.string().uuid('Invalid project ID'),
  assignedTo: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
```

### Step 3: Implement Endpoint

For a **query** (GET):

```typescript
// get-task.ts
export async function getTask(taskId: string): Promise<TaskResponse> {
  return api.get<TaskResponse>(`/api/tasks/${taskId}`);
}

export function getTaskQueryOptions(taskId: string) {
  return queryOptions({
    queryKey: ['tasks', taskId] as const,
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
  });
}

export function useTask({
  taskId,
  queryConfig,
}: {
  taskId: string;
  queryConfig?: QueryConfig<typeof getTaskQueryOptions>;
}) {
  return useQuery({
    ...getTaskQueryOptions(taskId),
    ...queryConfig,
  });
}
```

For a **mutation** (POST/PATCH/DELETE):

```typescript
// create-task.ts
export async function createTask(data: CreateTaskInput): Promise<TaskResponse> {
  const validatedData = createTaskInputSchema.parse(data);
  return api.post<TaskResponse>('/api/tasks', validatedData);
}

export function useCreateTask(mutationConfig?: MutationConfig<typeof createTask>) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onSuccess: (data, variables, context) => {
      // Invalidate tasks list for the project
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      mutationConfig?.onSuccess?.(data, variables, context);
    },
    ...mutationConfig,
  });
}
```

### Step 4: Export from index.ts

```typescript
// index.ts
export * from './get-task';
export * from './create-task';
export * from './types';
export * from './schemas';
```

### Step 5: Write Tests

Create `__tests__/tasks-api.test.ts` following the existing test patterns:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useTask, useCreateTask } from '../';

describe('Tasks API Integration Tests', () => {
  // ... tests for each endpoint
});
```

### Step 6: Usage in Components

```typescript
import { useTask, useCreateTask } from '@/shared/api/tasks';

function TaskDetail({ taskId }: { taskId: string }) {
  // Fetch task
  const { data, isLoading, error } = useTask({ taskId });
  
  // Create task mutation
  const { mutate: createTask, isPending } = useCreateTask({
    onSuccess: () => {
      toast.success('Task created!');
    },
  });
  
  // ... render UI
}
```

## Best Practices

### DO ✅

1. **Follow the patterns exactly** - Consistency is key
2. **Include all parameters in query keys** - For proper cache busting
3. **Validate all mutation inputs with Zod** - Runtime safety
4. **Invalidate caches, don't update manually** - Let React Query refetch
5. **Add JSDoc comments** - Especially for public APIs
6. **Write integration tests** - Test both success and error paths
7. **Use TypeScript strict mode** - No `any` types
8. **Enable queries conditionally** - Use `enabled: !!param` when needed
9. **Provide query config overrides** - Let consumers customize behavior
10. **Document complex patterns** - Add usage examples in JSDoc

### DON'T ❌

1. **Don't skip Zod validation** - Always validate mutation inputs
2. **Don't hardcode API URLs** - Use `api` client with env vars
3. **Don't use `any` types** - Be explicit with types
4. **Don't manually update cache** - Use `invalidateQueries` instead
5. **Don't skip error handling** - Always handle loading/error states
6. **Don't mix concerns** - Keep API logic separate from UI logic
7. **Don't forget to test** - Write tests for new endpoints
8. **Don't duplicate patterns** - Reuse the established patterns
9. **Don't skip Part 2 (query options)** - Enables prefetching
10. **Don't forget cache invalidation** - Mutations must invalidate related queries

## Common Issues and Solutions

### Issue: Query refetches unnecessarily

**Problem:** Query refetches every time component re-renders

**Solution:** Check staleTime configuration

```typescript
// Global default (lib/query-client.ts)
staleTime: 5 * 60 * 1000, // 5 minutes

// Or override per query
useProjects({
  queryConfig: { staleTime: 10 * 60 * 1000 } // 10 minutes
});
```

### Issue: Cache not updating after mutation

**Problem:** UI doesn't reflect changes after mutation

**Solution:** Verify cache invalidation in mutation's onSuccess

```typescript
onSuccess: (data, variables, context) => {
  // Must invalidate related queries
  queryClient.invalidateQueries({ queryKey: ['projects'] });
  queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
  
  // Call consumer's onSuccess
  mutationConfig?.onSuccess?.(data, variables, context);
},
```

### Issue: Zod validation failing unexpectedly

**Problem:** Valid data rejected by Zod schema

**Solution:** Check schema definition and error messages

```typescript
// Debug validation errors
try {
  const result = createProjectInputSchema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.errors); // See specific validation failures
  }
}
```

### Issue: TypeScript errors with query config

**Problem:** Type errors when passing queryConfig override

**Solution:** Use correct QueryConfig type

```typescript
import type { QueryConfig } from '@/lib/react-query';

// ✅ CORRECT
export function useProjects({
  params,
  queryConfig,
}: {
  params?: ListProjectsParams;
  queryConfig?: QueryConfig<typeof getProjectsQueryOptions>;
} = {}) {
  // ...
}
```

## React Query DevTools

Enable React Query DevTools in development to inspect queries, mutations, and cache:

1. **Open DevTools**: Click the floating React Query icon in bottom-right corner
2. **Inspect Queries**: View all active queries, their status, and cached data
3. **Debug Cache**: See query keys, stale status, and refetch timing
4. **Trigger Refetch**: Manually refetch queries or invalidate cache
5. **Monitor Mutations**: Track mutation status and cache invalidation

See `packages/web/docs/development-tools.md` for detailed usage.

## Testing

### Running Tests

```bash
# Run all API integration tests
cd packages/web && pnpm test --run "api.test.ts"

# Run specific module tests
pnpm test --run "projects-api.test.ts"

# Run with coverage
pnpm test --run --coverage "api.test.ts"
```

### Test Structure

Tests follow this structure:

```typescript
describe('Projects API Integration Tests', () => {
  describe('createProject / useCreateProject', () => {
    it('creates project successfully', async () => { /* ... */ });
    it('validates input with Zod schema', async () => { /* ... */ });
    it('mutation hook invalidates projects cache on success', async () => { /* ... */ });
    it('mutation hook calls custom onSuccess callback', async () => { /* ... */ });
    it('handles API errors', async () => { /* ... */ });
  });
  
  // ... more endpoint tests
});
```

### Test Coverage Requirements

- **Minimum:** 80% coverage for all new API code
- **Achieved:** 100% coverage (59/59 statements, 7/7 branches, 32/32 functions)

## Resources

### Documentation
- [React Query Official Docs](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev)
- [WebSocket Testing Strategy](../../../docs/planning/artifacts/websocket-testing-strategy.md)
- [Development Tools Guide](../../docs/development-tools.md)

### Code Examples
- Projects API: `src/shared/api/projects/`
- Documents API: `src/shared/api/documents/`
- Chat API: `src/shared/api/chat/`

### Related Files
- API Client: `src/lib/api-client.ts`
- Query Client Config: `src/lib/query-client.ts`
- React Query Types: `src/lib/react-query.ts`

## Support

For questions or issues:
1. Check this README first
2. Review existing API modules for examples
3. Check React Query documentation
4. Ask in team chat
5. Create a GitHub issue with `[api]` label

---

**Last Updated:** 2026-05-01  
**Maintained By:** Frontend Team  
**Questions?** See above Support section
