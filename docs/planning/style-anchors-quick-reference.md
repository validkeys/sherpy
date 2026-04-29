# Style Anchors Quick Reference

## TL;DR

This is a condensed reference for the bulletproof-react patterns. See `bulletproof-react-style-anchors.md` for full details.

## File Organization

```
src/features/[feature-name]/
├── api/          # All API calls for this feature
├── components/   # Feature-specific components
├── hooks/        # Feature-specific hooks
├── stores/       # Feature-specific state (jotai atoms)
└── types/        # Feature-specific types
```

## API Declaration Template

```typescript
// 1. Define fetcher function
export const getData = (params): Promise<Data> => {
  return api.get('/endpoint', { params });
};

// 2. Create query options factory
export const getDataQueryOptions = (params) => {
  return queryOptions({
    queryKey: ['data', params],
    queryFn: () => getData(params),
  });
};

// 3. Export hook
export const useData = ({ queryConfig, ...params }) => {
  return useQuery({
    ...getDataQueryOptions(params),
    ...queryConfig,
  });
};
```

## Mutation Template

```typescript
// 1. Define zod schema
export const createDataSchema = z.object({
  field: z.string().min(1, 'Required'),
});

export type CreateDataInput = z.infer<typeof createDataSchema>;

// 2. Define fetcher
export const createData = ({ data }: { data: CreateDataInput }) => {
  return api.post('/endpoint', data);
};

// 3. Export hook with cache invalidation
export const useCreateData = ({ mutationConfig } = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getDataQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: createData,
  });
};
```

## Component Template

```typescript
export const FeatureComponent = ({ prop }: Props) => {
  // 1. Hooks
  const query = useData({ params });
  const mutation = useCreateData({
    mutationConfig: {
      onSuccess: () => {
        // Handle success
      },
    },
  });

  // 2. Loading state
  if (query.isLoading) {
    return <Spinner />;
  }

  // 3. Early return for no data
  if (!query.data) return null;

  // 4. Render
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

## Form Component Template

```typescript
export const CreateForm = () => {
  const { addNotification } = useNotifications();
  const mutation = useCreateData({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Success',
        });
      },
    },
  });

  return (
    <Form
      onSubmit={(values) => mutation.mutate({ data: values })}
      schema={createDataSchema}
    >
      {({ register, formState }) => (
        <>
          <Input
            label="Field"
            error={formState.errors['field']}
            registration={register('field')}
          />
          <Button type="submit" isLoading={mutation.isPending}>
            Submit
          </Button>
        </>
      )}
    </Form>
  );
};
```

## Shared Component Template (shadcn-style)

```typescript
const componentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-styles',
        secondary: 'secondary-styles',
      },
      size: {
        default: 'default-size',
        sm: 'small-size',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ComponentProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof componentVariants> & {
    asChild?: boolean;
  };

export const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        className={cn(componentVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Component.displayName = 'Component';
```

## Import Rules

```typescript
// ✅ GOOD: Feature imports
import { useData } from '../api/get-data';           // Relative imports within feature
import { Button } from '@/components/ui/button';      // Shared components
import { cn } from '@/utils/cn';                      // Shared utils

// ❌ BAD: Cross-feature imports
import { useSidebar } from '@/features/sidebar/hooks'; // NO! Features should not import each other
```

## State Management Layers

1. **Component State**: `useState`, `useReducer` - local to component
2. **Feature State**: jotai atoms in `features/[feature]/stores/` - scoped to feature
3. **Global State**: jotai atoms in `stores/` - truly global (theme, user)
4. **Server Cache**: react-query - all server data
5. **URL State**: search params, route params - shareable state

## React Query Config

```typescript
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  },
} satisfies DefaultOptions;
```

## Key Principles

1. Features are independent - no cross-imports
2. Code flows one direction: shared → features → app
3. Colocate everything - keep files close to usage
4. Server data goes in react-query, not state stores
5. Validate with zod schemas
6. Use shadcn patterns for shared components
7. Forward refs for composition
8. Handle loading/error states explicitly

## Checklist for New Features

- [ ] Create feature folder under `src/features/`
- [ ] Add `api/` folder with fetcher + queryOptions + hook pattern
- [ ] Add zod schemas for mutations
- [ ] Add `components/` folder for feature UI
- [ ] Add `stores/` folder for feature state (jotai)
- [ ] Add `hooks/` folder for feature-specific hooks
- [ ] Import from shared components, not other features
- [ ] Handle loading states with Spinner
- [ ] Add notifications for mutations
- [ ] Invalidate queries after mutations
- [ ] Use URL state for shareable params (pagination, filters)

## Reference Files

**Must Read**:
1. `bulletproof-react-style-anchors.md` - Full patterns and examples
2. Bulletproof React docs: https://github.com/alan2207/bulletproof-react/tree/master/docs

**Example Features**:
- Discussions (CRUD with pagination)
- Comments (Infinite scroll)
- Auth (Forms with validation)
