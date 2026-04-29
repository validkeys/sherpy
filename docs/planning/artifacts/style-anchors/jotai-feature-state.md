---
id: jotai-feature-state
name: Jotai Feature State with Bunshi
category: State Management
tags: [jotai, bunshi, atoms, client-state]
created: 2026-04-28
---

## Overview

Use jotai for client-side UI state and bunshi for dependency injection. Server data belongs in react-query, not jotai atoms. Feature state should be scoped to the feature folder.

## Source Reference

**Pattern**: Jotai + Bunshi Integration
**Documentation**: 
- https://jotai.org/docs/introduction
- https://www.bunshi.org/

## Code Example

```typescript
// features/sidebar/stores/sidebar-atoms.ts

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Simple atom for transient UI state
export const sidebarExpandedAtom = atom<boolean>(true);

// Atom with localStorage persistence
export const selectedStepAtom = atomWithStorage<string | null>(
  'sherpy:selectedStep',
  null
);

// Derived atom (computed value)
export const currentStepIndexAtom = atom((get) => {
  const selectedStep = get(selectedStepAtom);
  const steps = [
    'gap-analysis',
    'business-requirements',
    'technical-requirements',
    // ... more steps
  ];
  return selectedStep ? steps.indexOf(selectedStep) : 0;
});

// Atom with read/write logic
export const nextStepAtom = atom(
  (get) => get(currentStepIndexAtom) + 1,
  (get, set) => {
    const currentIndex = get(currentStepIndexAtom);
    const steps = [
      'gap-analysis',
      'business-requirements',
      'technical-requirements',
      // ... more steps
    ];
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      set(selectedStepAtom, nextStep);
    }
  }
);
```

## Using Bunshi for Scoped State

```typescript
// features/sidebar/stores/sidebar-scope.ts

import { createScope, molecule } from 'bunshi';
import { atom } from 'jotai';

// Create a scope for project-specific state
export const ProjectScope = createScope<{ projectId: string }>(undefined);

// Create a molecule that provides project-scoped atoms
export const ProjectStateMolecule = molecule((getMol, getScope) => {
  const { projectId } = getScope(ProjectScope);
  
  // These atoms are scoped per project
  return {
    workflowStateAtom: atom<'idle' | 'running' | 'complete'>('idle'),
    skillExecutionProgressAtom: atom<number>(0),
    projectId,
  };
});
```

## Usage in Components

```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sidebarExpandedAtom, selectedStepAtom } from '../stores/sidebar-atoms';

export const Sidebar = () => {
  // Read and write
  const [expanded, setExpanded] = useAtom(sidebarExpandedAtom);
  
  // Read only (optimized)
  const selectedStep = useAtomValue(selectedStepAtom);
  
  // Write only (optimized)
  const setStep = useSetAtom(selectedStepAtom);

  return (
    <aside className={cn({ 'w-1/3': expanded, 'w-16': !expanded })}>
      <button onClick={() => setExpanded((prev) => !prev)}>
        Toggle
      </button>
      {/* Render steps */}
    </aside>
  );
};
```

## What This Demonstrates

- **Client State Only**: Jotai for UI state, not server data
- **Feature Scoping**: Atoms live in feature's stores/ folder
- **Derived Atoms**: Compute values from other atoms
- **Persistence**: Optional localStorage integration
- **Dependency Injection**: Bunshi for scoped state per project
- **Performance**: Read-only and write-only hooks for optimization

## When to Use

- **DO use jotai for:**
  - UI state (sidebar expanded, selected tab, theme)
  - Form state (multi-step forms, draft state)
  - Transient state (modals open/closed, tooltips)
  - Client-side computed values
  - URL-independent state that should persist across navigation

- **DON'T use jotai for:**
  - Server data (use react-query instead)
  - Data from API calls (use react-query)
  - Cached data (use react-query)
  - Lists of items from database (use react-query)

## Pattern Requirements

✓ Create atoms in `features/[feature]/stores/` for feature-specific state
✓ Create atoms in `src/stores/` only for truly global state
✓ Use `atomWithStorage` for state that should persist across sessions
✓ Use derived atoms (`atom((get) => ...)`) for computed values
✓ Name atoms with `Atom` suffix for clarity
✓ Export atoms directly, not wrapped in functions
✓ Use bunshi scopes when state needs to be isolated per entity (project, user, etc.)

## Common Mistakes to Avoid

❌ Putting server data in atoms (use react-query instead)
❌ Creating atoms in component files (keep in stores/ folder)
❌ Using atoms for state that belongs in URL (pagination, filters)
❌ Not using derived atoms for computed values (causes redundant state)
❌ Using `useAtom` when only reading or writing (use `useAtomValue` or `useSetAtom`)
❌ Creating global atoms for feature-specific state
❌ Forgetting to cleanup persisted state when no longer needed

## Related Anchors

- `react-query-api-layer` - Use this for server data, not jotai
- `feature-module-structure` - Where to put stores/ folder
- `url-state-management` - When to use URL params instead of atoms

## Test Coverage

**Atom Behavior Test**:
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAtom } from 'jotai';
import { Provider } from 'jotai';
import { sidebarExpandedAtom, nextStepAtom } from './sidebar-atoms';

describe('sidebar atoms', () => {
  it('toggles sidebar expanded state', () => {
    const wrapper = ({ children }) => <Provider>{children}</Provider>;
    const { result } = renderHook(() => useAtom(sidebarExpandedAtom), { wrapper });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
  });

  it('advances to next step', () => {
    const wrapper = ({ children }) => <Provider>{children}</Provider>;
    const { result } = renderHook(() => useAtom(nextStepAtom), { wrapper });

    act(() => {
      result.current[1](); // Trigger write function
    });

    // Assert step changed
  });
});
```

**Integration Test (Component with Atoms)**:
```typescript
import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  it('toggles expansion on button click', async () => {
    const user = userEvent.setup();
    render(
      <Provider>
        <Sidebar />
      </Provider>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    await user.click(toggleButton);

    // Assert UI changed based on expanded state
  });
});
```
