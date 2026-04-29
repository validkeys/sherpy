---
id: react-query-mutations
name: React Query Mutation Pattern
category: Data Fetching
tags: [react-query, mutations, validation, zod, cache-invalidation]
created: 2026-04-28
---

## Overview

Mutation pattern for POST/PATCH/DELETE operations with Zod validation, automatic cache invalidation, and configurable success callbacks.

## Source Reference

**Pattern**: Bulletproof React Mutations
**Reference**: https://github.com/alan2207/bulletproof-react
**Example**: `/apps/react-vite/src/features/discussions/api/create-discussion.ts`

## Code Example

```typescript
// features/discussions/api/create-discussion.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { MutationConfig } from '@/lib/react-query';
import { Discussion } from '../types';
import { getDiscussionsQueryOptions } from './get-discussions';

// Part 1: Zod schema for validation
export const createDiscussionInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
});

// Infer type from schema
export type CreateDiscussionInput = z.infer<typeof createDiscussionInputSchema>;

// Part 2: Fetcher function
export const createDiscussion = ({
  data,
}: {
  data: CreateDiscussionInput;
}): Promise<Discussion> => {
  return api.post('/discussions', data);
};

// Part 3: Mutation hook with cache invalidation
export const useCreateDiscussion = ({
  mutationConfig,
}: {
  mutationConfig?: MutationConfig<typeof createDiscussion>;
} = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // Invalidate discussions list to refetch with new item
      queryClient.invalidateQueries({
        queryKey: getDiscussionsQueryOptions().queryKey,
      });
      
      // Call consumer's onSuccess if provided
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: createDiscussion,
  });
};
```

## Usage in Component

```typescript
import { useCreateDiscussion, createDiscussionInputSchema } from '../api/create-discussion';
import { useNotifications } from '@/components/ui/notifications';

export const CreateDiscussionForm = () => {
  const { addNotification } = useNotifications();
  
  const createMutation = useCreateDiscussion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Discussion created successfully',
        });
      },
    },
  });

  return (
    <Form
      onSubmit={(values) => {
        createMutation.mutate({ data: values });
      }}
      schema={createDiscussionInputSchema}
    >
      {({ register, formState }) => (
        <>
          <Input
            label="Title"
            error={formState.errors['title']}
            registration={register('title')}
          />
          <Textarea
            label="Body"
            error={formState.errors['body']}
            registration={register('body')}
          />
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Discussion
          </Button>
        </>
      )}
    </Form>
  );
};
```

## What This Demonstrates

- **Input Validation**: Zod schema validates data before submission
- **Type Safety**: TypeScript types inferred from Zod schema
- **Automatic Cache Updates**: Query invalidation ensures UI stays in sync
- **Extensibility**: Consumer can provide additional onSuccess logic
- **Loading States**: isPending flag for button loading indicator
- **Separation**: Validation and API logic separate from UI

## When to Use

- When creating new resources (POST)
- When updating resources (PATCH/PUT)
- When deleting resources (DELETE)
- Anytime you need to modify server state

## Pattern Requirements

✓ Define Zod schema for input validation at top of file
✓ Export schema type with `z.infer<typeof schema>`
✓ Fetcher function accepts data in single object parameter
✓ Mutation hook accepts optional `mutationConfig` parameter
✓ Destructure `onSuccess` from mutationConfig to allow override
✓ Call `queryClient.invalidateQueries()` in onSuccess to refresh related queries
✓ Use query options from related GET endpoints for invalidation keys
✓ Spread `...restConfig` to allow consumers to override other options

## Common Mistakes to Avoid

❌ Skipping Zod validation (always validate external input)
❌ Not invalidating related queries (causes stale UI)
❌ Hardcoding onSuccess logic (use mutationConfig override)
❌ Not handling isPending state in UI (show loading indicator)
❌ Forgetting to spread ...restConfig (prevents consumer overrides)
❌ Using manual cache updates instead of invalidation (error-prone)
❌ Not providing success/error notifications to user

## Related Anchors

- `react-query-api-layer` - How to structure GET endpoints
- `zod-validation-patterns` - Advanced Zod schema patterns
- `feature-module-structure` - Where mutation files belong

## Test Coverage

**Integration Test (Mutation Hook)**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateDiscussion } from './create-discussion';
import { createWrapper } from '@/test/utils';

describe('useCreateDiscussion', () => {
  it('creates discussion and invalidates cache', async () => {
    const { result } = renderHook(() => useCreateDiscussion(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      data: {
        title: 'Test Discussion',
        body: 'Test body',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      title: 'Test Discussion',
    });
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useCreateDiscussion({ mutationConfig: { onSuccess } }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      data: { title: 'Test', body: 'Test' },
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
```

**Schema Validation Test**:
```typescript
import { createDiscussionInputSchema } from './create-discussion';

describe('createDiscussionInputSchema', () => {
  it('validates correct input', () => {
    const result = createDiscussionInputSchema.safeParse({
      title: 'Valid Title',
      body: 'Valid body',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createDiscussionInputSchema.safeParse({
      title: '',
      body: 'Valid body',
    });
    expect(result.success).toBe(false);
  });
});
```
