# Bulletproof React Style Anchors

## Overview

This document captures style anchors from the [bulletproof-react](https://github.com/alan2207/bulletproof-react) repository to guide the UI refactor project. These patterns align with our tech stack:
- Feature-based organization
- jotai/bunshi for state management
- react-query (@tanstack/query) for data fetching
- shadcn components with Radix UI primitives

## Core Architecture Principles

### Feature-Based Organization

The bulletproof-react architecture emphasizes **feature-based modules** over flat folder structures. Each feature is self-contained with its own components, API calls, hooks, stores, types, and utilities.

**Key Principle**: Features should NOT import from each other. Instead, compose features at the application level to maintain independence and reduce coupling.

### Project Structure

```
src/
├── app/              # Application layer (routes, main app component, providers, router)
├── assets/           # Static files (images, fonts)
├── components/       # Shared components used across the entire application
├── config/           # Global configurations, env variables
├── features/         # Feature-based modules (PRIMARY ORGANIZATION PATTERN)
├── hooks/            # Shared hooks used across the entire application
├── lib/              # Reusable libraries preconfigured for the application
├── stores/           # Global state stores
├── testing/          # Test utilities and mocks
├── types/            # Shared types used across the application
└── utils/            # Shared utility functions
```

### Feature Module Structure

Each feature follows this structure (only include folders that are necessary):

```
src/features/awesome-feature/
├── api/          # API request declarations and hooks related to this feature
├── assets/       # Feature-specific static files
├── components/   # Components scoped to this feature
├── hooks/        # Hooks scoped to this feature
├── stores/       # State stores for this feature
├── types/        # TypeScript types for this feature
└── utils/        # Utility functions for this feature
```

### Unidirectional Codebase Architecture

Code flows in ONE direction: **shared → features → app**

- Shared parts (components, hooks, lib, types, utils) can be used by any part of the codebase
- Features can only import from shared parts
- App can import from features and shared parts
- Features CANNOT import from app
- Features CANNOT cross-import from other features

## API Layer Patterns

### API Client Configuration

**File**: `/tmp/bulletproof-react/apps/react-vite/src/lib/api-client.ts`

**Key Patterns**:
1. Single API client instance configured with interceptors
2. Request interceptor sets common headers and credentials
3. Response interceptor handles:
   - Unwrapping response data
   - Global error notifications
   - 401 redirects to login

```typescript
// Single axios instance with baseURL
export const api = Axios.create({
  baseURL: env.API_URL,
});

// Request interceptor for auth
api.interceptors.request.use(authRequestInterceptor);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Global error notification
    // 401 redirect to login
    return Promise.reject(error);
  }
);
```

### API Request Declaration Pattern

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/api/get-discussions.ts`

Every API request declaration consists of three parts:

1. **Fetcher Function**: Plain function that calls the API
2. **Query Options Factory**: Returns react-query queryOptions
3. **Hook**: Exposes the query with configuration options

```typescript
// 1. Fetcher function
export const getDiscussions = (page = 1): Promise<{
  data: Discussion[];
  meta: Meta;
}> => {
  return api.get(`/discussions`, {
    params: { page },
  });
};

// 2. Query options factory
export const getDiscussionsQueryOptions = ({ page }: { page?: number } = {}) => {
  return queryOptions({
    queryKey: page ? ['discussions', { page }] : ['discussions'],
    queryFn: () => getDiscussions(page),
  });
};

// 3. Hook with configuration
type UseDiscussionsOptions = {
  page?: number;
  queryConfig?: QueryConfig<typeof getDiscussionsQueryOptions>;
};

export const useDiscussions = ({
  queryConfig,
  page,
}: UseDiscussionsOptions) => {
  return useQuery({
    ...getDiscussionsQueryOptions({ page }),
    ...queryConfig,
  });
};
```

### Mutation Pattern with Validation

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/api/create-discussion.ts`

**Key Patterns**:
1. Zod schema for input validation
2. Infer TypeScript types from schema
3. Mutation hook with automatic cache invalidation
4. Support for mutation config overrides

```typescript
// 1. Validation schema
export const createDiscussionInputSchema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
});

// 2. Infer type from schema
export type CreateDiscussionInput = z.infer<typeof createDiscussionInputSchema>;

// 3. Fetcher function
export const createDiscussion = ({
  data,
}: {
  data: CreateDiscussionInput;
}): Promise<Discussion> => {
  return api.post(`/discussions`, data);
};

// 4. Mutation hook with cache invalidation
export const useCreateDiscussion = ({
  mutationConfig,
}: UseCreateDiscussionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getDiscussionsQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: createDiscussion,
  });
};
```

### Infinite Query Pattern

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/comments/api/get-comments.ts`

For paginated data with infinite scroll:

```typescript
export const getInfiniteCommentsQueryOptions = (discussionId: string) => {
  return infiniteQueryOptions({
    queryKey: ['comments', discussionId],
    queryFn: ({ pageParam = 1 }) => {
      return getComments({ discussionId, page: pageParam as number });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.page === lastPage?.meta?.totalPages) return undefined;
      const nextPage = lastPage.meta.page + 1;
      return nextPage;
    },
    initialPageParam: 1,
  });
};
```

## Component Patterns

### Feature Component Pattern

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/components/discussions-list.tsx`

**Key Patterns**:
1. Import from shared UI components (not feature components)
2. Use relative imports for feature-specific API hooks
3. Handle loading states with spinners
4. Prefetch related data on hover
5. Use URL state (search params) for pagination

```typescript
export const DiscussionsList = ({
  onDiscussionPrefetch,
}: DiscussionsListProps) => {
  const [searchParams] = useSearchParams();
  const discussionsQuery = useDiscussions({
    page: +(searchParams.get('page') || 1),
  });
  const queryClient = useQueryClient();

  if (discussionsQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ... render with prefetching on hover
  onMouseEnter={() => {
    queryClient.prefetchQuery(getDiscussionQueryOptions(id));
    onDiscussionPrefetch?.(id);
  }}
};
```

### Form Component with Mutation

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/components/create-discussion.tsx`

**Key Patterns**:
1. Use mutation hook with success callbacks
2. Add notifications on success
3. Use FormDrawer pattern for modal forms
4. Pass schema to Form component for validation
5. Use form render props for field registration

```typescript
export const CreateDiscussion = () => {
  const { addNotification } = useNotifications();
  const createDiscussionMutation = useCreateDiscussion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Discussion Created',
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createDiscussionMutation.isSuccess}
      triggerButton={<Button size="sm" icon={<Plus />}>Create Discussion</Button>}
      title="Create Discussion"
    >
      <Form
        id="create-discussion"
        onSubmit={(values) => {
          createDiscussionMutation.mutate({ data: values });
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
          </>
        )}
      </Form>
    </FormDrawer>
  );
};
```

### Feature Composition Pattern

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/features/comments/components/comments.tsx`

Features compose smaller components together:

```typescript
type CommentsProps = {
  discussionId: string;
};

export const Comments = ({ discussionId }: CommentsProps) => {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold">Comments:</h3>
        <CreateComment discussionId={discussionId} />
      </div>
      <CommentsList discussionId={discussionId} />
    </div>
  );
};
```

## Shared Component Patterns

### Button Component (shadcn-style)

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/components/ui/button/button.tsx`

**Key Patterns**:
1. Use class-variance-authority (cva) for variants
2. Support Radix Slot for composition
3. Built-in loading state with spinner
4. Icon support
5. Forward refs for proper composition

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // ... more variants
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, isLoading, icon, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {isLoading && <Spinner size="sm" className="text-current" />}
        {!isLoading && icon && <span className="mr-2">{icon}</span>}
        <span className="mx-2">{children}</span>
      </Comp>
    );
  },
);
```

### Form Component with React Hook Form

**Example File**: `/tmp/bulletproof-react/apps/react-vite/src/components/ui/form/form.tsx`

**Key Patterns**:
1. Wrap react-hook-form with custom Form component
2. Integrate zod for validation
3. Use render props to expose form methods
4. Provide FormField, FormItem, FormLabel, FormControl context
5. Automatic error message display

```typescript
type FormProps<TFormValues extends FieldValues, Schema> = {
  onSubmit: SubmitHandler<TFormValues>;
  schema: Schema;
  className?: string;
  children: (methods: UseFormReturn<TFormValues>) => React.ReactNode;
  options?: UseFormProps<TFormValues>;
  id?: string;
};

const Form = <
  Schema extends ZodType<any, any, any>,
  TFormValues extends FieldValues = z.infer<Schema>,
>({
  onSubmit,
  children,
  className,
  options,
  id,
  schema,
}: FormProps<TFormValues, Schema>) => {
  const form = useForm({ ...options, resolver: zodResolver(schema) });
  return (
    <FormProvider {...form}>
      <form
        className={cn('space-y-6', className)}
        onSubmit={form.handleSubmit(onSubmit)}
        id={id}
      >
        {children(form)}
      </form>
    </FormProvider>
  );
};
```

## State Management Patterns

From `/tmp/bulletproof-react/docs/state-management.md`:

### Component State
- Use `useState` for simple independent states
- Use `useReducer` for complex states with multiple updates

### Application State
- Keep state as close as possible to components that need it
- Don't globalize unnecessarily
- Good options: context + hooks, zustand, jotai, mobx, redux toolkit

### Server Cache State
- Use react-query (TanStack Query) for server data
- Don't store in Redux/Zustand if not needed
- Let react-query handle caching, refetching, invalidation

### Form State
- Use React Hook Form for form management
- Integrate with zod for validation
- Create abstracted Form component wrapper

### URL State
- Use URL params and query params for shareable state
- Leverage react-router for URL state management

## React Query Configuration

**File**: `/tmp/bulletproof-react/apps/react-vite/src/lib/react-query.ts`

Global query configuration:

```typescript
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  },
} satisfies DefaultOptions;

// Type helpers for config
export type QueryConfig<T extends (...args: any[]) => any> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

export type MutationConfig<
  MutationFnType extends (...args: any) => Promise<any>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
```

## Component Best Practices

From `/tmp/bulletproof-react/docs/components-and-styling.md`:

1. **Colocate**: Keep components, functions, styles, state close to where they're used
2. **Avoid nested render functions**: Extract into separate components
3. **Stay consistent**: Use linters and formatters
4. **Limit props**: Too many props = split component or use composition
5. **Abstract shared components**: Build a component library for reusable pieces
6. **Wrap 3rd party components**: Adapt them to application needs

## Key Files for Reference

### Feature Module Examples

1. **Discussions Feature (Complete CRUD)**:
   - `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/api/get-discussions.ts` - Query pattern
   - `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/api/create-discussion.ts` - Mutation pattern
   - `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/components/discussions-list.tsx` - List with prefetch
   - `/tmp/bulletproof-react/apps/react-vite/src/features/discussions/components/create-discussion.tsx` - Form drawer pattern

2. **Comments Feature (Infinite Query)**:
   - `/tmp/bulletproof-react/apps/react-vite/src/features/comments/api/get-comments.ts` - Infinite query pattern
   - `/tmp/bulletproof-react/apps/react-vite/src/features/comments/components/comments.tsx` - Feature composition

3. **Auth Feature (Simple)**:
   - `/tmp/bulletproof-react/apps/react-vite/src/features/auth/components/login-form.tsx` - Form with URL state

### Shared Component Examples

1. **Button**: `/tmp/bulletproof-react/apps/react-vite/src/components/ui/button/button.tsx`
2. **Form**: `/tmp/bulletproof-react/apps/react-vite/src/components/ui/form/form.tsx`

### Configuration Examples

1. **API Client**: `/tmp/bulletproof-react/apps/react-vite/src/lib/api-client.ts`
2. **React Query Config**: `/tmp/bulletproof-react/apps/react-vite/src/lib/react-query.ts`

## Application to Our UI Refactor

### Recommended Feature Structure

For our sidebar and chat features:

```
src/features/sidebar/
├── api/
│   ├── get-sidebar-state.ts
│   └── update-sidebar-state.ts
├── components/
│   ├── sidebar.tsx
│   ├── sidebar-header.tsx
│   ├── sidebar-nav.tsx
│   └── sidebar-footer.tsx
├── hooks/
│   └── use-sidebar-collapse.ts
└── stores/
    └── sidebar-store.ts    # jotai atoms

src/features/chat/
├── api/
│   ├── send-message.ts
│   ├── get-messages.ts
│   └── get-conversations.ts
├── components/
│   ├── chat-view.tsx
│   ├── message-list.tsx
│   ├── message-input.tsx
│   └── conversation-list.tsx
├── hooks/
│   ├── use-chat-scroll.ts
│   └── use-message-submit.ts
└── stores/
    └── chat-store.ts       # jotai atoms
```

### Integration Points

1. **jotai/bunshi**: Use for feature-specific client state (sidebar collapsed, chat draft messages)
2. **react-query**: Use for all server data (messages, conversations, user data)
3. **shadcn components**: Follow the same patterns (cva, Radix primitives, forward refs)
4. **Feature isolation**: Sidebar and chat should not import from each other

### Key Takeaways

1. Each feature is self-contained and independent
2. API layer is declarative with fetcher + queryOptions + hook pattern
3. Always use zod schemas for validation
4. Mutations invalidate related queries automatically
5. Components handle loading/error states explicitly
6. Forms use render props pattern with validation
7. Shared components use cva for variants
8. State management is layered: component → feature → global
9. Server cache is separate from application state
