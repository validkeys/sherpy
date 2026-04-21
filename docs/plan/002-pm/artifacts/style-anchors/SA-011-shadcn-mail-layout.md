# SA-011: shadcn Mail/Inbox Layout Pattern

**Category:** Frontend Layout
**Source:** https://ui.shadcn.com/blocks (Mail block)
**Applies To:** `packages/web/src/components/inbox/`, `packages/web/src/pages/inbox.tsx`

## Pattern Description

The shadcn Mail block provides a three-pane inbox layout pattern: collapsible sidebar navigation, scrollable message/item list, and detail view panel. This pattern is ideal for the Sherpy PM inbox UI where projects are displayed as items in a list with detail views.

## Key Components Used

- `ResizablePanelGroup` + `ResizablePanel` + `ResizableHandle` — for adjustable panel widths
- `Tabs` — for switching between views (e.g., All, Active, Archived)
- `ScrollArea` — for scrollable lists without browser scrollbar
- `Separator` — for visual dividers between sections
- `Badge` — for status indicators and counts
- `Button` (variant: ghost, size: sm) — for list item actions
- `Input` (with search icon) — for filtering/search

## Layout Structure

```tsx
<ResizablePanelGroup direction="horizontal">
  {/* Sidebar - collapsible */}
  <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
    <div className="flex h-full flex-col">
      {/* Nav header */}
      <div className="flex items-center px-4 py-2">
        <h1 className="text-xl font-bold">Projects</h1>
      </div>

      {/* Nav items */}
      <ScrollArea className="flex-1">
        <nav className="grid gap-1 px-2">
          <Button variant="ghost" className="justify-start">
            All Projects
            <Badge className="ml-auto">24</Badge>
          </Button>
          {/* More nav items */}
        </nav>
      </ScrollArea>
    </div>
  </ResizablePanel>

  <ResizableHandle withHandle />

  {/* Project List Panel */}
  <ResizablePanel defaultSize={30} minSize={25}>
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="border-b px-4 py-3">
        <Input placeholder="Search projects..." />
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4">
          {/* Project item cards */}
          <button className="flex flex-col gap-2 rounded-lg border p-3 text-left hover:bg-accent">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Project Name</span>
              <Badge variant="outline">active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Description preview...
            </p>
          </button>
        </div>
      </ScrollArea>
    </div>
  </ResizablePanel>

  <ResizableHandle withHandle />

  {/* Detail Panel */}
  <ResizablePanel defaultSize={50}>
    <div className="flex h-full flex-col">
      {/* Detail content */}
    </div>
  </ResizablePanel>
</ResizablePanelGroup>
```

## Responsive Behavior

- **Desktop (1280px+):** All three panels visible, resizable
- **Tablet (768px-1279px):** Sidebar collapses to icons, list + detail visible
- **Mobile (<768px):** Single panel view, use Sheet overlay for navigation

## Styling Patterns

### List Item States
```tsx
// Default state
className="flex flex-col gap-2 rounded-lg border p-3 text-left"

// Hover state
className="hover:bg-accent hover:text-accent-foreground"

// Selected state
className="bg-muted border-primary"

// Combined
className="flex flex-col gap-2 rounded-lg border p-3 text-left hover:bg-accent data-[selected]:bg-muted"
```

### Badge Variants for Status
```tsx
<Badge variant="default">in-progress</Badge>      // Blue
<Badge variant="secondary">pending</Badge>        // Grey
<Badge variant="destructive">blocked</Badge>      // Red
<Badge variant="outline">complete</Badge>         // Outlined
```

### Scroll Areas
```tsx
<ScrollArea className="flex-1">
  <div className="flex flex-col gap-2 p-4">
    {/* Scrollable content */}
  </div>
</ScrollArea>
```

## Usage Guidelines

1. **Use ResizablePanelGroup for desktop layouts** — users can adjust panel widths to their preference
2. **Wrap long lists in ScrollArea** — provides consistent scroll behavior across browsers
3. **Use ghost variant buttons for sidebar nav** — reduces visual weight
4. **Implement keyboard navigation** — arrow keys for list navigation, Enter to select
5. **Persist panel sizes** — store in localStorage for user preference
6. **Use data attributes for selection state** — `data-[selected]` for styling selected items

## Anti-Patterns to Avoid

- ❌ Fixed pixel widths for panels — use percentage-based defaultSize
- ❌ Browser native scrollbars — always wrap in ScrollArea
- ❌ Inline styles for hover states — use Tailwind state variants
- ❌ Custom scrollbar styling — ScrollArea handles cross-browser consistency
- ❌ Prop drilling panel state — use context or URL state for selected item

## Reference Implementation

See shadcn blocks: https://ui.shadcn.com/blocks under "Mail" for the complete reference implementation with TypeScript types and accessibility features.

## Additional Resources

- ResizablePanel docs: https://ui.shadcn.com/docs/components/resizable
- ScrollArea docs: https://ui.shadcn.com/docs/components/scroll-area
- Badge docs: https://ui.shadcn.com/docs/components/badge
