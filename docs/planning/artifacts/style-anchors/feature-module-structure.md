---
id: feature-module-structure
name: Feature Module Structure
category: Architecture
tags: [feature-based, organization, folder-structure]
created: 2026-04-28
---

## Overview

Feature-based architecture where each feature is self-contained with its own components, API layer, state, and hooks. Features don't import from each other; composition happens at the app level.

## Source Reference

**Pattern**: Bulletproof React Architecture
**Reference**: https://github.com/alan2207/bulletproof-react
**Example Feature**: `/apps/react-vite/src/features/discussions/`

## Code Example

```
src/features/[feature-name]/
├── api/                    # All API calls for this feature
│   ├── get-[resource].ts   # Query (GET) with fetcher + queryOptions + hook
│   ├── create-[resource].ts # Mutation (POST) with schema + fetcher + hook
│   ├── update-[resource].ts # Mutation (PATCH/PUT)
│   └── delete-[resource].ts # Mutation (DELETE)
├── components/             # Feature-specific UI components
│   ├── [feature]-list.tsx
│   ├── [feature]-item.tsx
│   └── [feature]-form.tsx
├── hooks/                  # Feature-specific custom hooks
│   └── use-[feature]-logic.ts
├── stores/                 # Feature state (jotai atoms)
│   └── [feature]-atoms.ts
├── types/                  # Feature-specific TypeScript types
│   └── index.ts
└── index.ts                # Public API - exports what app can use
```

## What This Demonstrates

- **Feature Independence**: Each feature is a complete vertical slice
- **Clear Boundaries**: Features don't know about each other
- **Colocation**: Everything related to a feature lives together
- **Unidirectional Flow**: shared → features → app (no circular dependencies)
- **Explicit Public API**: Only exports what's needed via index.ts

## When to Use

- When creating any new feature (sidebar, chat, files, cascade-updates)
- When refactoring existing code into feature-based organization
- When you need to add a new vertical slice of functionality

## Pattern Requirements

✓ Create feature folder under `src/features/[feature-name]/`
✓ Include only the folders your feature needs (not all are required)
✓ Export public API through feature's index.ts
✓ Keep all feature code within the feature folder
✓ Import from `@/components` and `@/lib` for shared code
✓ Use relative imports within the feature
✓ Server data belongs in `api/` with react-query, not in `stores/`

## Common Mistakes to Avoid

❌ Cross-feature imports (`import from '@/features/other-feature'`)
❌ Putting shared code in a feature folder (use `src/shared/` instead)
❌ Mixing server state (react-query) with client state (jotai)
❌ Creating all folders even when not needed (only create what you use)
❌ Exporting implementation details from index.ts (only export public API)
❌ Deep nesting of folders (keep it flat within each category)

## Related Anchors

- `react-query-api-layer` - How to structure API calls
- `jotai-feature-state` - How to structure feature state
- `shadcn-component-pattern` - How to build shared components

## Test Coverage

**Integration Tests** (feature behavior):
```typescript
describe('Feature', () => {
  it('renders feature UI and fetches data', async () => {
    render(<Feature />);
    await waitFor(() => {
      expect(screen.getByText('Expected Content')).toBeInTheDocument();
    });
  });

  it('handles user interactions and mutations', async () => {
    render(<Feature />);
    const button = screen.getByRole('button', { name: 'Action' });
    await userEvent.click(button);
    // Assert expected behavior
  });
});
```

**What to Test**:
- Feature renders and loads data from API
- User interactions trigger expected behaviors
- Error states display properly
- Loading states work correctly
