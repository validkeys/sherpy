import type { ReactNode } from 'react';
import { Component } from 'react';
import { classifyError, logError, type ClassifiedError } from '@/lib/error-utils';

/**
 * Error Boundary Props
 */
export interface ErrorBoundaryProps {
  /**
   * Child components to render when no error has occurred
   */
  children: ReactNode;

  /**
   * Optional fallback UI to render when an error occurs.
   * Receives the error and a reset function.
   */
  // eslint-disable-next-line no-unused-vars
  fallback?: (error: Error, reset: () => void) => ReactNode;

  /**
   * Optional callback fired when an error is caught
   */
  // eslint-disable-next-line no-unused-vars
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;

  /**
   * Optional key to reset the boundary when changed
   */
  resetKeys?: Array<string | number>;
}

/**
 * Error Boundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  classifiedError: ClassifiedError | null;
}

/**
 * Global Error Boundary
 *
 * React 19 Error Boundary implementation that catches errors in child components
 * and displays a fallback UI. This is designed to be used at the root level
 * of the application.
 *
 * Features:
 * - Catches rendering errors in child components
 * - Logs errors to console (can be extended to external error tracking)
 * - Provides reset functionality to retry rendering
 * - Customizable fallback UI
 * - TypeScript strict mode compatible
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <CustomErrorUI error={error} onReset={reset} />
 *   )}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      classifiedError: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const classifiedError = classifyError(error);
    return {
      hasError: true,
      error,
      classifiedError,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    const classifiedError = classifyError(error);

    logError(classifiedError, {
      componentStack: errorInfo.componentStack,
    });

    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // If resetKeys changed and we're in an error state, reset the boundary
    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      !this.arraysEqual(prevProps.resetKeys, resetKeys)
    ) {
      this.reset();
    }
  }

  private arraysEqual(a: Array<string | number>, b: Array<string | number>): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      classifiedError: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (fallback) {
        return fallback(error, this.reset);
      }

      // Default fallback UI
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

/**
 * Default Error Fallback UI
 *
 * Simple, user-friendly error display shown when no custom fallback is provided.
 */
interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps): ReactNode {
  const classifiedError = classifyError(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">{classifiedError.userMessage}</p>
        </div>

        {import.meta.env.DEV && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-red-800">Error Details:</h2>
            <div className="mb-2 text-xs">
              <strong>Type:</strong> {classifiedError.type}
            </div>
            <div className="mb-2 text-xs">
              <strong>Error ID:</strong> {classifiedError.errorId}
            </div>
            <pre className="overflow-x-auto text-xs text-red-700">{error.message}</pre>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                  Stack trace
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-red-600">{error.stack}</pre>
              </details>
            )}
          </div>
        )}

        {!import.meta.env.DEV && (
          <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500">Error ID: {classifiedError.errorId}</p>
            <p className="mt-1 text-xs text-gray-500">
              Please share this ID if you need support.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
