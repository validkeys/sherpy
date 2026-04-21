# SA-013: React 19 Composition Patterns

**Category:** Frontend Architecture
**Source:** React 19 docs, Vercel composition patterns
**Applies To:** All React components in `packages/web/src/`

## Pattern Description

Modern React composition patterns emphasize component composition over prop proliferation, use of React 19 features (use hook, Suspense), and clean separation of concerns. These patterns prevent "boolean props hell" and create flexible, maintainable component APIs.

## Compound Components Pattern

Use compound components for related UI elements that share state.

```tsx
// ❌ Prop proliferation anti-pattern
<Card
  title="Project Details"
  description="View and edit project"
  showFooter={true}
  footerContent={<Button>Save</Button>}
  headerActions={<Button variant="ghost">Close</Button>}
/>

// ✅ Compound component pattern
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>View and edit project</CardDescription>
      </div>
      <Button variant="ghost">Close</Button>
    </div>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

## Children as API Pattern

Use children instead of render props when possible.

```tsx
// ❌ Render prop pattern (verbose)
<DataLoader
  url="/api/projects"
  renderLoading={() => <Skeleton />}
  renderError={(error) => <ErrorBanner message={error.message} />}
  renderData={(data) => <ProjectList projects={data} />}
/>

// ✅ Children with Suspense (React 19)
<Suspense fallback={<Skeleton />}>
  <ErrorBoundary fallback={<ErrorBanner />}>
    <ProjectList />
  </ErrorBoundary>
</Suspense>
```

## React 19 `use` Hook Pattern

Use the `use` hook for promise-based data fetching.

```tsx
import { use } from "react"

// Create a fetcher that returns a promise
async function fetchProject(id: string) {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

// Component uses `use` hook with Suspense boundary
function ProjectDetail({ projectId }: { projectId: string }) {
  // `use` unwraps the promise - component suspends until resolved
  const project = use(fetchProject(projectId))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>{project.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Project details */}
      </CardContent>
    </Card>
  )
}

// Parent wraps in Suspense
function ProjectPage() {
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetail projectId="123" />
    </Suspense>
  )
}
```

## Context for Shared State Pattern

Use context for state that multiple components need, avoiding prop drilling.

```tsx
// Create context with provider
import { createContext, useContext, useState } from "react"

interface InboxState {
  selectedProject: string | null
  setSelectedProject: (id: string | null) => void
  filterTag: string | null
  setFilterTag: (tag: string | null) => void
}

const InboxContext = createContext<InboxState | null>(null)

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)

  return (
    <InboxContext.Provider value={{
      selectedProject,
      setSelectedProject,
      filterTag,
      setFilterTag,
    }}>
      {children}
    </InboxContext.Provider>
  )
}

export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error("useInbox must be used within InboxProvider")
  }
  return context
}

// Usage in components
function ProjectList() {
  const { selectedProject, setSelectedProject, filterTag } = useInbox()
  // Use state without prop drilling
}
```

## Composition via Slots Pattern

Use named slots for flexible component composition.

```tsx
interface PageLayoutProps {
  header: React.ReactNode
  sidebar: React.ReactNode
  main: React.ReactNode
  aside?: React.ReactNode
}

function PageLayout({ header, sidebar, main, aside }: PageLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b">{header}</header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r overflow-y-auto">{sidebar}</aside>
        <main className="flex-1 overflow-y-auto">{main}</main>
        {aside && (
          <aside className="w-80 border-l overflow-y-auto">{aside}</aside>
        )}
      </div>
    </div>
  )
}

// Usage - clear slots for content areas
<PageLayout
  header={<ProjectHeader />}
  sidebar={<ProjectNav />}
  main={<ProjectContent />}
  aside={<ProjectChat />}
/>
```

## Custom Hooks for Logic Reuse

Extract component logic into custom hooks.

```tsx
// Hook encapsulates WebSocket subscription logic
function useProjectUpdates(projectId: string) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])

  useEffect(() => {
    const ws = connectWebSocket()

    ws.on("project:updated", (data) => {
      if (data.projectId === projectId) {
        setUpdates((prev) => [...prev, data])
      }
    })

    return () => ws.disconnect()
  }, [projectId])

  return updates
}

// Multiple components can reuse this logic
function ProjectDetailView({ projectId }: { projectId: string }) {
  const updates = useProjectUpdates(projectId)
  // Render using updates
}

function ProjectListItem({ projectId }: { projectId: string }) {
  const updates = useProjectUpdates(projectId)
  // Show update count badge
}
```

## Render Props for Ultimate Flexibility

Use render props when children need access to internal state.

```tsx
interface SearchableListProps<T> {
  items: T[]
  filterFn: (item: T, query: string) => boolean
  children: (filteredItems: T[], query: string) => React.ReactNode
}

function SearchableList<T>({ items, filterFn, children }: SearchableListProps<T>) {
  const [query, setQuery] = useState("")
  const filtered = items.filter((item) => filterFn(item, query))

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {children(filtered, query)}
    </div>
  )
}

// Usage
<SearchableList
  items={projects}
  filterFn={(project, query) => project.name.toLowerCase().includes(query.toLowerCase())}
>
  {(filteredProjects, query) => (
    <div>
      {query && <p>Showing {filteredProjects.length} results</p>}
      {filteredProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )}
</SearchableList>
```

## Usage Guidelines

1. **Prefer compound components over prop drilling** — CardHeader, CardContent, CardFooter
2. **Use Suspense for async data** — replaces loading states and render props
3. **Extract shared logic to custom hooks** — keeps components thin
4. **Use context for cross-cutting concerns** — auth, theme, selected state
5. **Keep components pure and predictable** — same props = same output
6. **Composition over configuration** — flexible APIs through children

## Anti-Patterns to Avoid

- ❌ Boolean prop explosion — `showX`, `hideY`, `enableZ` (use compound components)
- ❌ Mega components with 20+ props — break into smaller composed components
- ❌ Prop drilling beyond 2-3 levels — use context or state management
- ❌ Mixed concerns in one component — separate data, logic, and presentation
- ❌ Conditional rendering with many ternaries — extract to separate components

## React 19 Features to Embrace

- ✅ `use` hook for promises — simpler data fetching with Suspense
- ✅ Server components (future) — automatic code splitting, zero bundle impact
- ✅ Actions — form submission without client-side JS
- ✅ Asset loading — preload fonts, images, scripts declaratively
- ✅ Document metadata — title, meta tags as components

## TypeScript Best Practices

```tsx
// ✅ Generic components with constraints
interface ListProps<T extends { id: string }> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
}

// ✅ Discriminated unions for polymorphic props
type ButtonProps =
  | { variant: "link"; href: string }
  | { variant: "button"; onClick: () => void }

// ✅ Strict children typing
interface CardProps {
  children: React.ReactElement<CardHeaderProps | CardContentProps>[]
}
```

## Reference Patterns

- Vercel composition patterns: https://vercel.com/blog/react-composition-patterns
- React 19 docs: https://react.dev/blog/2024/12/05/react-19
- shadcn/ui source: https://github.com/shadcn-ui/ui (excellent composition examples)

## Additional Resources

- Kent C. Dodds: Advanced React Component Patterns
- React docs: Composition vs Inheritance
- TypeScript: Generic Components Guide
