# useProjectLoader Hook

Centralized hook for loading and managing project state with React Query and Jotai integration.

## Features

- **Project Loading**: Load projects by ID with automatic data fetching
- **State Management**: Updates `currentProjectIdAtom` automatically
- **URL Parameters**: Optional support for loading from `?projectId=<id>`
- **Error Handling**: Built-in error states with retry capability
- **Callbacks**: `onProjectLoaded` and `onError` callbacks for side effects
- **Loading States**: Exposes loading, error, and data states

## Basic Usage

```tsx
import { useProjectLoader } from '@/shared/hooks';

function ProjectPage() {
  const { project, isLoading, error, retry } = useProjectLoader({
    projectId: 'proj-123',
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} onRetry={retry} />;
  if (!project) return <EmptyState />;

  return <ProjectView project={project.project} />;
}
```

## URL Parameter Support

Enable automatic loading from URL query parameters:

```tsx
function ProjectPageWithUrl() {
  const { project, currentProjectId } = useProjectLoader({
    enableUrlParams: true,
  });

  // Visiting /?projectId=proj-123 will automatically load that project
  // currentProjectId will be 'proj-123'
}
```

## Dynamic Loading

Use `loadProject` to dynamically switch projects:

```tsx
function ProjectSwitcher() {
  const { currentProjectId, loadProject } = useProjectLoader();

  return (
    <select 
      value={currentProjectId ?? ''} 
      onChange={(e) => loadProject(e.target.value)}
    >
      <option value="proj-1">Project 1</option>
      <option value="proj-2">Project 2</option>
    </select>
  );
}
```

## With Callbacks

Use callbacks for side effects when projects load or fail:

```tsx
function ProjectPageWithCallbacks() {
  const { project } = useProjectLoader({
    projectId: 'proj-123',
    onProjectLoaded: (projectId) => {
      console.log('Project loaded:', projectId);
      trackAnalytics('project_viewed', { projectId });
    },
    onError: (error) => {
      console.error('Failed to load project:', error);
      showToast('Failed to load project');
    },
  });
}
```

## API Reference

### Options

```typescript
interface UseProjectLoaderOptions {
  projectId?: string;           // Initial project ID to load
  enableUrlParams?: boolean;    // Enable URL param loading (default: false)
  onProjectLoaded?: (projectId: string) => void;
  onError?: (error: Error) => void;
}
```

### Return Value

```typescript
interface ProjectLoaderResult {
  project: ProjectResponse | undefined;  // Loaded project data
  isLoading: boolean;                    // Loading state
  error: Error | null;                   // Error state
  currentProjectId: string | null;       // Current project ID
  loadProject: (projectId: string) => void;  // Load a project
  retry: () => void;                     // Retry after error
  clearProject: () => void;              // Clear current project
}
```

## State Management

The hook automatically updates `currentProjectIdAtom` when:
- Initial `projectId` option is provided
- URL param is detected (when `enableUrlParams: true`)
- `loadProject()` is called

This ensures all features consuming `currentProjectIdAtom` stay in sync:
- Sidebar workflow state
- Files tab document fetching
- Chat message history

## Error Handling

Errors are returned in the `error` field and can be retried:

```tsx
const { error, retry } = useProjectLoader({ projectId });

if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  );
}
```

## Integration with React Router

Works seamlessly with React Router params:

```tsx
function ProjectRouteHandler() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const { project, isLoading } = useProjectLoader({ 
    projectId 
  });

  // Project loads automatically when route changes
}
```

## Testing

The hook is designed to be easily mockable in tests:

```tsx
import { vi } from 'vitest';

vi.mock('@/shared/hooks', () => ({
  useProjectLoader: () => ({
    project: mockProject,
    isLoading: false,
    error: null,
    currentProjectId: 'test-id',
    loadProject: vi.fn(),
    retry: vi.fn(),
    clearProject: vi.fn(),
  }),
}));
```
