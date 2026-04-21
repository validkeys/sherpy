# SA-012: shadcn Dashboard Card Patterns

**Category:** Frontend Components
**Source:** https://ui.shadcn.com/blocks (Dashboard blocks)
**Applies To:** `packages/web/src/components/project/`, `packages/web/src/pages/project-detail.tsx`

## Pattern Description

shadcn Dashboard blocks provide card-based layouts for displaying project metrics, status breakdowns, and hierarchical information. These patterns are ideal for the project detail view showing milestones, tasks, and pipeline status.

## Key Components Used

- `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` — structured card composition
- `Progress` — for visual progress indicators
- `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` — for expandable sections
- `Separator` — for visual grouping within cards
- `Badge` — for status labels and counts

## Card Composition Pattern

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Basic metric card
<Card>
  <CardHeader>
    <CardTitle>Total Tasks</CardTitle>
    <CardDescription>Across all milestones</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">47</div>
    <p className="text-xs text-muted-foreground">
      +12 from last week
    </p>
  </CardContent>
</Card>

// Status breakdown card
<Card>
  <CardHeader>
    <CardTitle>Task Status</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm">Complete</span>
      <Badge variant="outline">23</Badge>
    </div>
    <Progress value={48} className="h-2" />
    <div className="flex items-center justify-between">
      <span className="text-sm">In Progress</span>
      <Badge variant="default">12</Badge>
    </div>
    <Progress value={25} className="h-2" />
    {/* More statuses */}
  </CardContent>
</Card>
```

## Collapsible Milestone Pattern

```tsx
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

<Card>
  <Collapsible>
    <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
        <div>
          <h3 className="font-semibold">Milestone Name</h3>
          <p className="text-sm text-muted-foreground">
            5 of 8 tasks complete
          </p>
        </div>
      </div>
      <Badge variant="outline">in-progress</Badge>
    </CollapsibleTrigger>

    <CollapsibleContent>
      <Separator />
      <div className="p-4 space-y-2">
        {/* Task list items */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">Task name</span>
          </div>
          <Badge variant="secondary" size="sm">60m</Badge>
        </div>
      </div>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

## Grid Layout Patterns

### Responsive Card Grid
```tsx
// 1 column mobile, 2 columns tablet, 3 columns desktop
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>

// Stats at top, full-width detail below
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* 4 stat cards */}
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
<div className="grid gap-4">
  {/* Full-width detail card */}
  <Card>...</Card>
</div>
```

## Visual Hierarchy with Cards

```tsx
// Primary content - larger, prominent
<Card className="col-span-3">
  <CardHeader>
    <CardTitle className="text-2xl">Project Overview</CardTitle>
  </CardHeader>
  <CardContent>{/* Main content */}</CardContent>
</Card>

// Secondary sidebar - narrower
<Card className="col-span-1">
  <CardHeader>
    <CardTitle className="text-base">Quick Stats</CardTitle>
  </CardHeader>
  <CardContent>{/* Metrics */}</CardContent>
</Card>
```

## Status Visualization Patterns

### Progress Rings
```tsx
// Use for pipeline stage progress
<div className="flex items-center gap-4">
  <div className="relative h-20 w-20">
    <svg className="h-20 w-20">
      <circle
        className="text-muted stroke-current"
        strokeWidth="4"
        fill="transparent"
        r="30"
        cx="40"
        cy="40"
      />
      <circle
        className="text-primary stroke-current"
        strokeWidth="4"
        strokeDasharray={`${(progress / 100) * 188.4} 188.4`}
        strokeLinecap="round"
        fill="transparent"
        r="30"
        cx="40"
        cy="40"
      />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
      {progress}%
    </span>
  </div>
  <div>
    <p className="font-medium">Pipeline Progress</p>
    <p className="text-sm text-muted-foreground">
      Stage 4 of 7
    </p>
  </div>
</div>
```

### Horizontal Status Bar
```tsx
// Task status breakdown
<div className="space-y-2">
  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
    <div className="bg-green-500" style={{ width: "45%" }} />
    <div className="bg-blue-500" style={{ width: "30%" }} />
    <div className="bg-red-500" style={{ width: "10%" }} />
    <div className="bg-gray-300" style={{ width: "15%" }} />
  </div>
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>45% Complete</span>
    <span>30% In Progress</span>
    <span>10% Blocked</span>
    <span>15% Todo</span>
  </div>
</div>
```

## Usage Guidelines

1. **Group related metrics in cards** — don't scatter individual stats across the page
2. **Use CardDescription for context** — helps users understand what the metric means
3. **Collapse long lists by default** — expand on demand with Collapsible
4. **Maintain consistent card padding** — CardHeader and CardContent handle spacing
5. **Use grid for responsive layouts** — avoid fixed widths
6. **Reserve color for semantic meaning** — green=success, red=error, blue=info

## Anti-Patterns to Avoid

- ❌ Deeply nested cards — flatten hierarchy with Separators instead
- ❌ Empty CardHeader or CardContent — omit if no content to show
- ❌ Custom card borders/shadows — use Card's default styling
- ❌ Mixing card and non-card content in same grid — maintain visual consistency
- ❌ Progress bars without labels — always show percentage or fraction

## Accessibility

- Use semantic HTML within cards (`<h3>` for CardTitle, `<p>` for CardDescription)
- CollapsibleTrigger must be keyboard accessible (space/enter to toggle)
- Progress indicators should have aria-valuenow/aria-valuemax
- Badge colors should not be sole indicator of status (include text/icon)

## Reference Implementation

See shadcn blocks: https://ui.shadcn.com/blocks under "Dashboard" for complete patterns with responsive behavior and TypeScript types.

## Additional Resources

- Card docs: https://ui.shadcn.com/docs/components/card
- Collapsible docs: https://ui.shadcn.com/docs/components/collapsible
- Progress docs: https://ui.shadcn.com/docs/components/progress
