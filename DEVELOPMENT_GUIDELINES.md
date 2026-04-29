# Development Guidelines

**Sherpy Flow UI Refactor Project**

This document provides comprehensive guidelines for developing in this codebase. It covers architecture patterns, conventions, best practices, and common pitfalls to help maintain consistency and quality across the team.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Code Organization](#code-organization)
- [TypeScript Conventions](#typescript-conventions)
- [Component Patterns](#component-patterns)
- [State Management](#state-management)
- [Styling](#styling)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Git Workflow](#git-workflow)
- [Common Pitfalls](#common-pitfalls)
- [Quality Gates](#quality-gates)

---

## Architecture Overview

This project follows the **bulletproof-react** architecture pattern with feature-based organization.

### Core Principles

1. **Feature-based vertical slices** - Not layer-based architecture
2. **Independent features** - Features cannot import from other features
3. **Shared code in shared/** - Common components, hooks, utilities
4. **Co-located tests** - Tests live next to source files
5. **TypeScript strict mode** - Maximum type safety enforced

### Directory Structure

```
src/
├── features/          # Feature modules (vertical slices)
│   └── [feature-name]/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       ├── types/
│       └── index.ts
├── shared/            # Shared across features
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
├── lib/              # Third-party library wrappers
│   ├── query-client.ts
│   ├── router.tsx
│   └── error-boundary.tsx
├── config/           # App configuration
├── providers/        # Context providers
└── utils/            # Generic utilities
```

### Technology Stack

- **React 19** - Latest React with concurrent features
- **TypeScript 6** - Strict mode enabled
- **Vite 8** - Fast build tool with HMR
- **Tailwind CSS v4** - Utility-first styling
- **Jotai** - Atomic client state management
- **React Query (TanStack Query)** - Server state management
- **React Router v7** - Client-side routing
- **Shadcn/ui** - Accessible, customizable components
- **Vitest** - Fast, Vite-native testing
- **ESLint 10** - Code linting
- **Prettier 3** - Code formatting

---

## Code Organization

### Where to Put Files

| What | Where | Example |
|------|-------|---------|
| Feature-specific component | `src/features/[feature]/components/` | `src/features/projects/components/project-list.tsx` |
| Shared UI component | `src/shared/components/ui/` | `src/shared/components/ui/button.tsx` |
| Feature-specific hook | `src/features/[feature]/hooks/` | `src/features/projects/hooks/use-projects.ts` |
| Shared hook | `src/shared/hooks/` | `src/shared/hooks/use-debounce.ts` |
| Feature-specific utility | `src/features/[feature]/utils/` | `src/features/projects/utils/format-project.ts` |
| Shared utility | `src/shared/utils/` | `src/shared/utils/format.ts` |
| Generic utility | `src/utils/` | `src/utils/cn.ts` |
| Feature types | `src/features/[feature]/types/` | `src/features/projects/types/project.ts` |
| Shared types | `src/shared/types/` | `src/shared/types/api.ts` |
| Constants | `src/shared/constants/` | `src/shared/constants/workflow-steps.ts` |
| Library wrapper | `src/lib/` | `src/lib/query-client.ts` |
| Configuration | `src/config/` | `src/config/env.ts` |
| Provider | `src/providers/` | `src/providers/app-provider.tsx` |

### Feature Structure Template

```
src/features/projects/
├── components/
│   ├── project-list.tsx
│   ├── project-list.test.tsx
│   ├── project-card.tsx
│   └── project-card.test.tsx
├── hooks/
│   ├── use-projects.ts
│   └── use-projects.test.ts
├── utils/
│   ├── format-project.ts
│   └── format-project.test.ts
├── types/
│   └── project.ts
└── index.ts          # Public API for feature
```

### Path Aliases

Use path aliases for clean imports:

```typescript
// ✅ Good - Use path aliases
import { Button } from '@/shared/components/ui/button';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { cn } from '@/utils/cn';
import { queryClient } from '@/lib/query-client';

// ❌ Bad - Relative paths
import { Button } from '../../../shared/components/ui/button';
import { useProjects } from '../../projects/hooks/use-projects';
```

**Available aliases:**
- `@/*` → `src/*`
- `@/features/*` → `src/features/*`
- `@/shared/*` → `src/shared/*`
- `@/lib/*` → `src/lib/*`
- `@/utils/*` → `src/utils/*`
- `@/config/*` → `src/config/*`

---

## TypeScript Conventions

### Strict Mode

TypeScript strict mode is **enabled and enforced**. All code must pass strict type checking.

```typescript
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Definitions

**Always define explicit types for:**
- Function parameters
- Function return types (when not obvious)
- React component props
- API responses
- Complex objects

```typescript
// ✅ Good - Explicit types
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'default', size = 'default', children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ Bad - Implicit any
export function Button(props) {
  return <button>{props.children}</button>;
}
```

### No Implicit Any

Never use implicit `any`. Use explicit types or `unknown`.

```typescript
// ✅ Good - Explicit unknown, then narrow
function parseJson(json: string): unknown {
  return JSON.parse(json);
}

const data = parseJson('{"id": 1}');
if (typeof data === 'object' && data !== null && 'id' in data) {
  console.log(data.id);
}

// ❌ Bad - Implicit any from JSON.parse
function parseJson(json: string) {
  return JSON.parse(json); // Returns any
}
```

### Type Organization

Export types from a dedicated `types/` directory or alongside the component:

```typescript
// Option 1: Co-located types (preferred for components)
// src/shared/components/ui/button.tsx
export interface ButtonProps {
  // ...
}

export function Button(props: ButtonProps) {
  // ...
}

// Option 2: Separate types file (for complex domain types)
// src/features/projects/types/project.ts
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
}

export type ProjectStatus = 'active' | 'archived' | 'draft';
```

### Utility Types

Leverage TypeScript utility types:

```typescript
// Pick specific properties
type ProjectSummary = Pick<Project, 'id' | 'name'>;

// Omit properties
type CreateProject = Omit<Project, 'id' | 'createdAt'>;

// Make properties optional
type PartialProject = Partial<Project>;

// Make properties required
type RequiredProject = Required<Project>;

// Extract from union
type SuccessStatus = Extract<ProjectStatus, 'active' | 'draft'>;

// Exclude from union
type ErrorStatus = Exclude<ProjectStatus, 'active'>;
```

---

## Component Patterns

### Component Structure

Follow this consistent structure for all components:

```typescript
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * Button component
 * 
 * A versatile button component with multiple variants and sizes.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ 
  variant = 'default', 
  size = 'default', 
  children, 
  onClick,
  disabled = false 
}: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onClick?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded',
        variant === 'default' && 'bg-blue-600 text-white',
        variant === 'destructive' && 'bg-red-600 text-white',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

### When to Create a Component

**Create a new component when:**
- Logic is reused more than twice
- Component exceeds ~200 lines
- Component has multiple responsibilities
- Component needs independent testing

**Keep inline when:**
- Used only once
- Fewer than ~50 lines
- No complex logic
- Tightly coupled to parent

### Hooks Best Practices

**Custom hooks should:**
- Start with `use` prefix
- Return arrays for positional values, objects for named values
- Have single responsibility
- Be co-located with tests

```typescript
// ✅ Good - Single responsibility, clear return type
export function useProjects() {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ✅ Good - Array return for positional
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue(v => !v);
  return [value, toggle];
}

// ❌ Bad - Multiple responsibilities
export function useProjectsAndUsers() {
  // Don't mix concerns
}
```

### Composition over Props Drilling

Use composition patterns to avoid prop drilling:

```typescript
// ✅ Good - Composition
export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded border p-4">{children}</div>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="border-b pb-2">{children}</div>;
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="pt-2">{children}</div>;
}

// Usage
<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>

// ❌ Bad - Boolean props proliferation
interface CardProps {
  hasHeader?: boolean;
  hasFooter?: boolean;
  hasBorder?: boolean;
  isRounded?: boolean;
  title?: string;
  content?: ReactNode;
  footer?: ReactNode;
}
```

---

## State Management

### When to Use What

| State Type | Tool | Use When |
|------------|------|----------|
| **Server state** | React Query | Data from API, needs caching/sync |
| **Global UI state** | Jotai | Shared across components (theme, modal state) |
| **Local component state** | useState | Only used in one component |
| **URL state** | React Router | Should persist in URL (filters, tabs) |
| **Form state** | React Hook Form | Complex forms with validation |

### React Query (Server State)

Use React Query for all data fetching:

```typescript
// src/features/projects/hooks/use-projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects');
      return response.data;
    },
  });
}

// Mutation with optimistic updates
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await apiClient.post('/projects', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

### Jotai (Client State)

Use Jotai for global UI state:

```typescript
// src/shared/atoms/theme.ts
import { atom } from 'jotai';

export const themeAtom = atom<'light' | 'dark'>('light');

// Derived atom
export const isDarkModeAtom = atom(
  (get) => get(themeAtom) === 'dark'
);

// Usage in component
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { themeAtom, isDarkModeAtom } from '@/shared/atoms/theme';

function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  // Or: const theme = useAtomValue(themeAtom);
  // Or: const setTheme = useSetAtom(themeAtom);
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle theme
    </button>
  );
}
```

### Local State

Use `useState` for simple, local state:

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

---

## Styling

### Tailwind CSS v4

We use Tailwind CSS v4 with utility-first approach.

#### Best Practices

```typescript
// ✅ Good - Utility classes
<div className="flex items-center gap-4 rounded-lg border p-4">
  <h2 className="text-xl font-bold">Title</h2>
</div>

// ✅ Good - Conditional classes with cn()
import { cn } from '@/utils/cn';

<button 
  className={cn(
    'px-4 py-2 rounded',
    isActive && 'bg-blue-600 text-white',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Click me
</button>

// ❌ Bad - Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
  Content
</div>

// ❌ Bad - String concatenation
<div className={`px-4 py-2 ${isActive ? 'bg-blue-600' : ''}`}>
  Content
</div>
```

#### Responsive Design

Use Tailwind's responsive prefixes:

```typescript
<div className="
  w-full              // Mobile first
  md:w-1/2            // Tablet
  lg:w-1/3            // Desktop
  xl:w-1/4            // Large desktop
">
  Responsive content
</div>
```

### Shadcn Components

Use Shadcn components for common UI patterns:

```typescript
// ✅ Good - Use Shadcn Button
import { Button } from '@/shared/components/ui/button';

<Button variant="destructive" size="lg">
  Delete
</Button>

// ✅ Good - Customize with className
<Button className="mt-4 w-full">
  Full width button
</Button>
```

### Class Variance Authority (CVA)

Use CVA for component variants:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

---

## Testing

### Test Structure

Co-locate tests with source files using `.test.tsx` or `.test.ts` extension:

```
src/features/projects/
├── components/
│   ├── project-list.tsx
│   └── project-list.test.tsx    ← Test here
├── hooks/
│   ├── use-projects.ts
│   └── use-projects.test.ts     ← Test here
```

### Component Testing

Use React Testing Library:

```typescript
// project-list.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ProjectList } from './project-list';

describe('ProjectList', () => {
  it('renders loading state', () => {
    render(<ProjectList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders projects after loading', async () => {
    render(<ProjectList />);
    
    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    // Mock empty response
    render(<ProjectList />);
    
    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });

  it('handles click events', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const handleClick = vi.fn();
    
    render(<ProjectList onProjectClick={handleClick} />);
    
    const project = await screen.findByText('Project 1');
    await userEvent.click(project);
    
    expect(handleClick).toHaveBeenCalledWith('project-1');
  });
});
```

### Hook Testing

Test custom hooks:

```typescript
// use-projects.test.ts
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useProjects } from './use-projects';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useProjects', () => {
  it('fetches projects successfully', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.projects).toHaveLength(3);
  });
});
```

### What to Test

**Always test:**
- User interactions (clicks, form submissions)
- Conditional rendering
- Error states
- Loading states
- Data transformations
- Business logic

**Don't test:**
- Implementation details
- Third-party libraries
- Simple prop passing
- Styles (use visual regression instead)

### Coverage Expectations

- **Minimum coverage**: 70% overall
- **Critical paths**: 90%+ coverage
- **Utilities**: 100% coverage
- **Components**: 80%+ coverage

Run coverage report:
```bash
pnpm run test:coverage
```

---

## Error Handling

### Error Boundaries

Use error boundaries to catch rendering errors:

```typescript
// Root level (already configured in AppProvider)
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Feature level (for isolated error handling)
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Something went wrong in this feature</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <ProjectsFeature />
</ErrorBoundary>
```

### API Error Handling

Handle API errors with React Query:

```typescript
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('40')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// In component
function ProjectList() {
  const { data, error, isLoading } = useProjects();

  if (isLoading) return <div>Loading...</div>;
  
  if (error) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4">
        <p className="text-red-800">
          Failed to load projects: {error.message}
        </p>
      </div>
    );
  }

  return <div>{/* Render projects */}</div>;
}
```

### Form Error Handling

Handle validation errors explicitly:

```typescript
function CreateProjectForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProject = useCreateProject();

  const handleSubmit = async (data: CreateProjectData) => {
    try {
      await createProject.mutateAsync(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.fields);
      } else {
        // Show generic error
        toast.error('Failed to create project');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      {errors.name && <span className="text-red-600">{errors.name}</span>}
    </form>
  );
}
```

---

## Performance

### Bundle Size Awareness

We enforce performance budgets:

- **Main bundle**: 200KB gzipped max (warn at 150KB)
- **Vendor bundle**: 300KB gzipped max (warn at 250KB)
- **Total initial load**: 500KB gzipped max

Check bundle size:
```bash
pnpm run build        # Check budgets during build
pnpm run analyze      # Visualize bundle composition
```

### Code Splitting

Split large features with lazy loading:

```typescript
// router.tsx
import { lazy } from 'react';

const ProjectsPage = lazy(() => import('@/features/projects/pages/projects-page'));
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'));

export const router = createBrowserRouter([
  {
    path: '/projects',
    element: <Suspense fallback={<Loading />}><ProjectsPage /></Suspense>,
  },
  {
    path: '/settings',
    element: <Suspense fallback={<Loading />}><SettingsPage /></Suspense>,
  },
]);
```

### Optimization Tips

**Use React.memo for expensive renders:**
```typescript
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  // Heavy computation
  return <div>{/* render */}</div>;
});
```

**Debounce expensive operations:**
```typescript
import { useDebouncedCallback } from 'use-debounce';

function SearchInput() {
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      // Expensive search operation
    },
    300
  );

  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
}
```

**Use virtualization for long lists:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function LongList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div key={virtualItem.key} style={{ height: `${virtualItem.size}px` }}>
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Git Workflow

### Commit Conventions

Follow **conventional commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `chore`: Maintenance (deps, config)
- `refactor`: Code change without behavior change
- `test`: Adding or updating tests
- `perf`: Performance improvement
- `style`: Code style changes (formatting)

**Examples:**
```bash
# Feature
feat(projects): add project creation flow

# Fix
fix(auth): resolve token refresh race condition

# Docs
docs: update development guidelines with testing section

# Chore
chore: update dependencies to latest versions
```

### Branch Strategy

Work on the `worktree-ui-refactor` branch in this worktree. Main branch is `main`.

```bash
# Check current branch
git branch

# Status
git status

# Commit
git add src/features/projects/
git commit -m "feat(projects): add project list component

Implements the project list view with filtering and sorting.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Quality Gates

**Always run before committing:**

```bash
# Run all quality checks
pnpm run lint && pnpm run typecheck && pnpm run test

# Or individually
pnpm run lint          # ESLint
pnpm run typecheck     # TypeScript
pnpm run test          # Vitest

# Auto-fix linting issues
pnpm run lint:fix

# Format code
pnpm run format
```

**Pre-commit checklist:**
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code is formatted
- [ ] No console.log statements (use console.warn/error only)
- [ ] Added tests for new functionality
- [ ] Updated types for API changes

---

## Common Pitfalls

### 1. Cross-Feature Imports

**NEVER import from other features.**

```typescript
// ❌ FORBIDDEN - Cross-feature import
import { ProjectList } from '@/features/projects/components/project-list';
import { UserAvatar } from '@/features/users/components/user-avatar';

// ✅ CORRECT - Move shared code to shared/
import { ProjectList } from '@/shared/components/project-list';
import { UserAvatar } from '@/shared/components/user-avatar';
```

### 2. Implicit Any

**Avoid implicit `any` types.**

```typescript
// ❌ Bad
const data = JSON.parse(response); // Returns any

// ✅ Good
interface ApiResponse {
  id: string;
  name: string;
}

const data = JSON.parse(response) as ApiResponse;
// Or better: use a validation library like Zod
```

### 3. Props Drilling

**Use composition or context instead of drilling props.**

```typescript
// ❌ Bad
<Parent theme={theme}>
  <Child theme={theme}>
    <GrandChild theme={theme} />
  </Child>
</Parent>

// ✅ Good - Use context or atoms
const themeAtom = atom('light');

function GrandChild() {
  const theme = useAtomValue(themeAtom);
  return <div>{theme}</div>;
}
```

### 4. Large Components

**Split components that exceed ~200 lines.**

```typescript
// ❌ Bad - 500 line component

// ✅ Good - Split into smaller components
function ProjectPage() {
  return (
    <div>
      <ProjectHeader />
      <ProjectContent />
      <ProjectFooter />
    </div>
  );
}
```

### 5. Mixing State Types

**Don't use Jotai for server state or React Query for UI state.**

```typescript
// ❌ Bad - Using atoms for server data
const projectsAtom = atom([]);

// ✅ Good - Use React Query for server state
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
});

// ❌ Bad - Using React Query for UI state
const { data: isModalOpen } = useQuery(['modal-state']);

// ✅ Good - Use atoms for UI state
const isModalOpenAtom = atom(false);
```

### 6. Not Co-locating Tests

**Always place tests next to source files.**

```typescript
// ❌ Bad
src/components/button.tsx
src/__tests__/button.test.tsx

// ✅ Good
src/components/button.tsx
src/components/button.test.tsx
```

### 7. Ignoring TypeScript Errors

**Never use `@ts-ignore` or `@ts-expect-error` without a good reason.**

```typescript
// ❌ Bad
// @ts-ignore
const value = data.property;

// ✅ Good - Fix the type
const value = (data as DataType).property;

// ✅ Acceptable - With explanation
// @ts-expect-error - Legacy API returns inconsistent types, will be fixed in v2
const value = data.property;
```

### 8. Console.log in Production

**Remove console.log before committing.**

```typescript
// ❌ Bad
console.log('Debug info:', data);

// ✅ Good - Use console.warn/error (allowed by linter)
if (import.meta.env.DEV) {
  console.warn('Development warning:', data);
}

// ✅ Good - Use proper logging service
logger.debug('Debug info:', data);
```

### 9. Hard-coded Values

**Use constants for magic numbers and strings.**

```typescript
// ❌ Bad
setTimeout(() => {}, 5000);
if (status === 'active') {}

// ✅ Good
const DEBOUNCE_DELAY = 5000;
const ProjectStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

setTimeout(() => {}, DEBOUNCE_DELAY);
if (status === ProjectStatus.ACTIVE) {}
```

### 10. Not Using Path Aliases

**Always use path aliases, never relative imports.**

```typescript
// ❌ Bad
import { Button } from '../../../shared/components/ui/button';

// ✅ Good
import { Button } from '@/shared/components/ui/button';
```

---

## Quality Gates

### Development Commands

```bash
# Start dev server
pnpm dev

# Run all quality checks (do this before committing!)
pnpm run lint && pnpm run typecheck && pnpm run test

# Individual checks
pnpm run lint              # ESLint
pnpm run lint:fix          # Auto-fix linting issues
pnpm run typecheck         # TypeScript type checking
pnpm run test              # Run all tests
pnpm run test:watch        # Watch mode
pnpm run test:coverage     # Coverage report

# Format code
pnpm run format            # Format all files
pnpm run format:check      # Check formatting

# Build
pnpm run build             # Production build
pnpm run analyze           # Analyze bundle size
```

### CI/CD Checks

All pull requests must pass:

1. **Linting** - No ESLint errors
2. **Type checking** - No TypeScript errors
3. **Tests** - All tests passing, 70%+ coverage
4. **Build** - Production build succeeds
5. **Performance budgets** - Bundle sizes within limits

### Pre-commit Checklist

Before every commit:

```bash
# 1. Run quality gates
pnpm run lint && pnpm run typecheck && pnpm run test

# 2. Check for console.log
git diff | grep -i "console\.log" && echo "Remove console.log!" || echo "✓ No console.log"

# 3. Stage files
git add src/features/projects/

# 4. Commit with conventional format
git commit -m "feat(projects): add project list component

Implements the project list view with filtering and sorting.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Additional Resources

- **CLAUDE.md** - Quick start guide and architecture overview
- **project-structure.yaml** - Detailed architecture reference (if exists)
- **React 19 Docs** - https://react.dev
- **TypeScript Docs** - https://www.typescriptlang.org/docs/
- **Tailwind CSS v4** - https://tailwindcss.com
- **React Query** - https://tanstack.com/query/latest
- **Jotai** - https://jotai.org
- **Vitest** - https://vitest.dev
- **Bulletproof React** - https://github.com/alan2207/bulletproof-react

---

## Questions?

If you have questions about:
- **Architecture patterns** → See CLAUDE.md or project-structure.yaml
- **Component examples** → Check src/shared/components/ui/
- **Testing examples** → Check src/App.test.tsx or src/lib/error-boundary.test.tsx
- **Build configuration** → See vite.config.ts
- **TypeScript config** → See tsconfig.app.json
- **Linting rules** → See eslint.config.js

For clarification or suggestions, reach out to the team lead or submit a PR with proposed changes to this document.

---

**Last updated:** 2026-04-29  
**Version:** 1.0.0  
**Maintainer:** Development Team
