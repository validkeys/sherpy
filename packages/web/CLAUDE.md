# Sherpy PM Web Frontend

React 19 + Vite + TypeScript frontend for Sherpy PM, following bulletproof-react architecture with feature-based organization.

## Architecture Documentation

**See [`project-structure.yaml`](./project-structure.yaml) for the canonical architecture reference.**

The project-structure.yaml file contains comprehensive documentation including:
- Technology stack and versions
- Directory structure and organization
- Path aliases and import conventions
- Feature boundaries and dependencies
- State management patterns
- Testing strategies
- Code quality standards
- Development workflows

## Quick Start

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

## Key Principles

1. **Feature-based vertical slices** - Not layer-based architecture
2. **Independent features** - Features cannot import from each other
3. **Shared code in shared/** - Common components, hooks, utilities
4. **Co-located tests** - Tests live next to source files
5. **Path aliases** - Clean imports using @/, @/features/*, etc.
6. **TypeScript strict mode** - Maximum type safety

## Architecture Pattern

This project follows the [bulletproof-react](https://github.com/alan2207/bulletproof-react) architecture pattern with:

- Feature-based organization (`src/features/`)
- Shared utilities and components (`src/shared/`)
- Library wrappers and configuration (`src/lib/`, `src/config/`)
- Co-located tests (`.test.tsx` files alongside source)

## State Management

- **Client state**: Jotai (atoms for UI state)
- **Server state**: React Query (data fetching, caching, synchronization)
- **Form state**: React Hook Form (when needed)

## UI Framework

- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (composable, customizable)
- **LLM Chat**: assistant-ui (specialized chat interface components)

## Routing

- **Router**: React Router v7
- **Route definitions**: Centralized in `src/lib/router.tsx`
- **Route components**: Live in feature directories

## Testing

- **Test runner**: Vitest (fast, Vite-native)
- **Component testing**: React Testing Library
- **Coverage**: Vitest coverage reports
- **Convention**: Co-locate tests with source files (`.test.tsx`)

## Code Quality

- **Linting**: ESLint 9.x with TypeScript support
- **Formatting**: Prettier 3.x
- **Type checking**: TypeScript strict mode
- **Pre-commit**: Quality gates run on commit

### Quality Commands

```bash
# Run all quality checks
pnpm run lint && pnpm run typecheck && pnpm test

# Auto-fix linting issues
pnpm run lint:fix

# Format code
pnpm run format
```

## Path Aliases

Configured in `tsconfig.app.json` and `vite.config.ts`:

- `@/*` → `src/*`
- `@/features/*` → `src/features/*`
- `@/shared/*` → `src/shared/*`
- `@/lib/*` → `src/lib/*`
- `@/utils/*` → `src/utils/*`
- `@/config/*` → `src/config/*`

## Feature Boundaries

**CRITICAL**: Features are independent vertical slices. Features MUST NOT import from other features.

✅ **Allowed**:
```typescript
import { Button } from '@/shared/components/button'
import { useAuth } from '@/lib/auth'
```

❌ **Forbidden**:
```typescript
import { ProjectList } from '@/features/projects/components/project-list'
```

If code is needed across features, move it to `src/shared/`.

## Development Workflow

1. **Create feature** - Add new directory under `src/features/`
2. **Implement** - Build components, hooks, utilities
3. **Test** - Co-locate tests with source files
4. **Quality check** - Run lint, typecheck, test
5. **Commit** - Use conventional commit messages

## Legacy Code

The previous UI implementation is preserved in `/workspace/packages/web-legacy/` with full git history for reference.

## Related Documentation

- [README.md](./README.md) - Basic project setup info
- [project-structure.yaml](./project-structure.yaml) - **Canonical architecture reference**
- [src/README.md](./src/README.md) - Source directory organization

## Technology Choices

### Why Jotai for Client State?
- Atomic, bottom-up approach
- TypeScript-first design
- Minimal boilerplate
- Works well with React 19 Suspense

### Why React Query for Server State?
- Industry standard for server state management
- Built-in caching, invalidation, refetching
- Excellent TypeScript support
- Simplifies data synchronization

### Why Tailwind v4?
- Utility-first approach scales well
- v4 performance improvements
- Better CSS-in-JS integration
- Reduced runtime overhead

### Why shadcn/ui?
- Copy-paste components (no external dependency)
- Full customization control
- Built on Radix UI primitives
- Excellent accessibility

### Why assistant-ui?
- Specialized for LLM chat interfaces
- Streaming support built-in
- Message history management
- TypeScript-first

## Monorepo Context

This is the web frontend package in the Sherpy PM monorepo:

- **Backend API**: `/packages/api/` (Node.js + TypeScript)
- **Shared types**: `/packages/shared/` (shared TypeScript types)
- **Web frontend**: `/packages/web/` (this package)
- **Web legacy**: `/packages/web-legacy/` (preserved legacy implementation)

## Contributing

1. Follow the architecture patterns in `project-structure.yaml`
2. Maintain feature independence (no cross-feature imports)
3. Co-locate tests with source files
4. Run quality gates before committing
5. Use conventional commit messages

## Questions?

Refer to `project-structure.yaml` first - it's the single source of truth for architecture decisions, patterns, and conventions.
