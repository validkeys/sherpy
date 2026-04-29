import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider as JotaiProvider } from 'jotai';
import { queryClient } from '@/lib/query-client';

/**
 * App Provider
 *
 * Root provider component that wraps the application with:
 * - React Query (TanStack Query) for server state management
 * - Jotai for client state management
 * - React Query Devtools (development only)
 *
 * Add additional providers here as needed (auth, theme, etc.)
 */
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>{children}</JotaiProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
