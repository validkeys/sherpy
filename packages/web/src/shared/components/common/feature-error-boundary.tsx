import { ErrorBoundary } from "@/lib/error-boundary";
import type { ReactNode } from "react";

/**
 * Feature Error Boundary Props
 */
export interface FeatureErrorBoundaryProps {
  /**
   * Child components to render when no error has occurred
   */
  children: ReactNode;

  /**
   * Name of the feature for display in error messages
   */
  featureName: string;

  /**
   * Optional callback fired when an error is caught
   */
  // eslint-disable-next-line no-unused-vars
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;

  /**
   * Optional keys to reset the boundary when changed
   */
  resetKeys?: Array<string | number>;
}

/**
 * Feature Error Boundary
 *
 * A specialized error boundary for feature modules. This provides a more
 * localized error UI that doesn't take over the entire screen, allowing
 * the rest of the application to continue functioning.
 *
 * Use this within feature modules to isolate errors to just that feature,
 * preventing a failure in one feature from crashing the entire app.
 *
 * @example
 * ```tsx
 * // In a feature's index.tsx
 * export function ProjectsFeature() {
 *   return (
 *     <FeatureErrorBoundary featureName="Projects">
 *       <ProjectList />
 *     </FeatureErrorBoundary>
 *   );
 * }
 * ```
 *
 * @example With error tracking
 * ```tsx
 * <FeatureErrorBoundary
 *   featureName="Chat"
 *   onError={(error, errorInfo) => {
 *     analytics.track('feature_error', {
 *       feature: 'Chat',
 *       error: error.message,
 *     });
 *   }}
 * >
 *   <ChatInterface />
 * </FeatureErrorBoundary>
 * ```
 */
export function FeatureErrorBoundary({
  children,
  featureName,
  onError,
  resetKeys,
}: FeatureErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <FeatureErrorFallback featureName={featureName} error={error} reset={reset} />
      )}
      onError={onError}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Feature Error Fallback UI
 *
 * A compact, feature-specific error display that doesn't take over the entire screen.
 */
interface FeatureErrorFallbackProps {
  featureName: string;
  error: Error;
  reset: () => void;
}

function FeatureErrorFallback({ featureName, error, reset }: FeatureErrorFallbackProps): ReactNode {
  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
      <div className="w-full max-w-md text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          {featureName} encountered an error
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          We were unable to load this section. The rest of the application should work normally.
        </p>

        {import.meta.env.DEV && (
          <div className="mb-6 rounded border border-yellow-200 bg-yellow-50 p-3 text-left">
            <h3 className="mb-1 text-xs font-semibold text-yellow-800">Development Info:</h3>
            <pre className="overflow-x-auto text-xs text-yellow-700">{error.message}</pre>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-yellow-600 hover:text-yellow-800">
                  Stack trace
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs text-yellow-600">{error.stack}</pre>
              </details>
            )}
          </div>
        )}

        <button
          onClick={reset}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
