# Source Code Structure

This project follows the **bulletproof-react** architecture pattern with feature-based organization.

## Directory Structure

```
src/
├── features/          # Feature modules (vertical slices)
│   └── [feature-name]/
│       ├── api/       # Feature-specific API hooks
│       ├── components/# Feature-specific components
│       ├── hooks/     # Feature-specific hooks
│       ├── state/     # Feature-specific state (atoms)
│       ├── types/     # Feature-specific types
│       └── index.ts   # Public API exports
│
├── shared/            # Shared/reusable code
│   ├── components/    # Shared UI components
│   ├── hooks/         # Shared React hooks
│   ├── api/           # Shared API utilities
│   ├── state/         # Global state (atoms)
│   └── utils/         # Utility functions
│
├── lib/               # Third-party library configuration
│   ├── api-client.ts  # Fetch wrapper
│   └── query-client.ts# React Query client
│
├── utils/             # Pure utility functions
│   └── cn.ts          # className utility (clsx + tailwind-merge)
│
├── config/            # Application configuration
│   └── env.ts         # Environment variables
│
├── routes/            # React Router route definitions
│
├── providers/         # React context providers
│
└── App.tsx            # Root application component
```

## Conventions

### Import Aliases

Use path aliases for cleaner imports:

```typescript
// ✅ Good
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { cn } from '@/utils/cn';

// ❌ Bad
import { Button } from '../../../shared/components/ui/button';
```

### Feature Independence

Features MUST be independent and self-contained:

```typescript
// ✅ Good - features can import from shared
import { Button } from '@/shared/components/ui/button';
import { apiClient } from '@/lib/api-client';

// ❌ Bad - features CANNOT import from other features
import { useProject } from '@/features/projects/hooks/use-project';
```

### Component Organization

Components are organized by feature, not by type:

```typescript
// ✅ Good - feature-based
features/
  projects/
    components/
      project-card.tsx
      project-list.tsx

// ❌ Bad - type-based
components/
  cards/
    project-card.tsx
  lists/
    project-list.tsx
```

### State Management

- **Client State**: Use Jotai atoms
- **Server State**: Use React Query (via API hooks)
- **Form State**: Use React Hook Form (when needed)

### Testing

- Tests co-located with source files (`.test.tsx` or `.test.ts`)
- Use custom render from `@/test/utils` for provider setup
- Test behavior, not implementation

## Adding a New Feature

1. Create feature folder: `src/features/[feature-name]/`
2. Add subdirectories: `api/`, `components/`, `hooks/`, `state/`, `types/`
3. Create `index.ts` to export public API
4. Keep feature self-contained (no imports from other features)

## See Also

- [project-structure.yaml](../project-structure.yaml) - Complete structure reference
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
