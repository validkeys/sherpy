# Sherpy PM Web Frontend

React 19 + TypeScript + Vite frontend for Sherpy PM.

## M2 Milestone Completion ✅

**Status:** Complete (m2-001 through m2-021)  
**Tests:** 239 passing (83 chat + 21 API + 109 sidebar/tabs + 26 integration)

### Architecture Overview

M2 delivers a fully integrated chat-driven planning experience with:

- **Layout:** Sidebar (1/3) + MainTabs (2/3), full-height responsive design
- **Sidebar Navigation:** 10 workflow steps with visual indicators (complete/current/pending)
- **Auto-Skill Invocation:** Clicking workflow steps automatically sends skill commands to chat
- **Tabbed Interface:** Chat and Files tabs with seamless switching
- **Chat Integration:** @assistant-ui/react Thread component with hybrid mode (guided + free-form)
- **WebSocket Runtime:** Real-time streaming with auto-reconnection and error recovery
- **React Query API Layer:** Three-part pattern (hooks → service → client) for chat messages
- **State Management:** Jotai atoms for UI state, React Query for server state

### Key Features Delivered

1. **Sidebar → Chat Integration:** Navigate workflow steps → skill message sent → AI responds
2. **Hybrid Chat Mode:** Both guided workflow questions and free-form messages supported
3. **Tab Management:** Switch between Chat and Files tabs while preserving state
4. **Loading States:** Visual indicators for skill invocation and AI streaming
5. **Error Handling:** Connection errors with manual retry UI
6. **TypeScript Strict:** All code passes strict mode type checking
7. **Comprehensive Tests:** Unit tests (213) + Integration tests (26)

### Architecture Patterns

**Feature-Based Vertical Slices:**
```
src/features/
  chat/          - Chat UI with @assistant-ui Thread
  sidebar/       - Workflow navigation with auto-skill
  tabs/          - MainTabs component with state management
```

**API Layer (Three-Part Pattern):**
```typescript
// 1. React Query Hooks (features/chat/api/use-chat-messages.ts)
export function useChatMessages(projectId: string) {
  return useQuery({
    queryKey: ['chat-messages', projectId],
    queryFn: () => ChatService.getMessages(projectId)
  });
}

// 2. Service Layer (features/chat/api/chat-service.ts)
export const ChatService = {
  getMessages: (projectId: string) => apiClient.get(`/chat/${projectId}/messages`)
};

// 3. API Client (lib/api-client.ts)
export const apiClient = createApiClient({ baseURL: env.apiUrl });
```

**WebSocket Runtime:**
- Custom hook (`use-chat-runtime.ts`) wraps @assistant-ui WebSocket adapter
- Automatic reconnection with exponential backoff
- Connection state tracking for UI feedback
- Manual retry mechanism for user control

### Testing Coverage

- **Unit Tests:** 213 tests across chat, sidebar, tabs, and API layers
- **Integration Tests:** 26 tests validating complete user flows
- **Coverage:** >70% for all M2 features
- **Test Co-location:** Tests live next to source files

### Development Workflow

```bash
# Run all tests
pnpm test --run

# Run M2-specific tests
pnpm test features/chat features/tabs features/sidebar test/integration --run

# Type check
pnpm typecheck

# Dev server
pnpm dev
```

### Next Steps (M3 and Beyond)

- File explorer tab implementation
- Project settings and configuration
- Additional workflow steps
- Performance optimization
- E2E testing with Playwright

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start dev server
pnpm dev
```

## Environment Configuration

This project uses environment variables for configuration. All frontend environment variables must be prefixed with `VITE_`.

### Required Variables

Create a `.env.local` file (or copy from `.env.example`):

```bash
# API Configuration
VITE_API_URL=http://localhost:3000    # Backend API base URL
VITE_WS_URL=ws://localhost:3000       # WebSocket URL for real-time features
VITE_DEV_MODE=true                    # Enable development features
```

### Environment Files

- `.env.example` - Template with all available variables (committed to git)
- `.env.local` - Your local configuration (NOT committed to git)

The environment configuration is type-safe and validated at runtime. See `src/config/env.ts` for implementation details.

### Usage in Code

```typescript
import { env } from '@/config/env';

// Type-safe access to environment variables
fetch(`${env.apiUrl}/users`);
const socket = new WebSocket(env.wsUrl);
if (env.devMode) {
  console.log('Development mode enabled');
}
```

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
