import { ErrorBoundary } from '@/lib/error-boundary';
import { classifyError, logError } from '@/lib/error-utils';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider as JotaiProvider } from 'jotai';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

/**
 * App Provider
 *
 * Root provider component that wraps the application with:
 * - Global Error Boundary for catching and handling errors
 * - React Query (TanStack Query) for server state management
 * - Jotai for client state management
 * - React Query Devtools (development only)
 * - Global error handlers for unhandled promise rejections
 *
 * Add additional providers here as needed (auth, theme, etc.)
 */
interface AppProviderProps {
  children: ReactNode;
}

function GlobalErrorHandler({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const classifiedError = classifyError(event.reason);
      logError(classifiedError, {
        type: 'unhandledRejection',
        promise: event.promise,
      });
    };

    const handleError = (event: ErrorEvent) => {
      const classifiedError = classifyError(event.error);
      logError(classifiedError, {
        type: 'uncaughtError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <QueryClientProvider client={queryClient}>
          <JotaiProvider>{children}</JotaiProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}
