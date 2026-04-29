# Sherpy PM Web Frontend

React 19 + TypeScript + Vite frontend for Sherpy PM.

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
