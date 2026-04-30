import { FeatureErrorBoundary } from '@/shared/components/common';
import { useState } from 'react';

/**
 * Error Boundary Demo Page
 *
 * Demonstrates both global and feature-level error boundaries.
 * This page can be used for testing and showcasing error handling.
 */

/**
 * Component that can be triggered to throw an error
 */
function ErrorTrigger({ message }: { message: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(message);
  }

  return (
    <button
      onClick={() => setShouldThrow(true)}
      className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
    >
      Trigger Error
    </button>
  );
}

/**
 * Sample feature component
 */
function FeatureSection({ title }: { title: string }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">
        This is a sample feature section. Click the button below to simulate an error in this
        feature only. Other features should continue working.
      </p>
      <ErrorTrigger message={`Error in ${title} feature`} />
    </div>
  );
}

export default function ErrorBoundaryDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Error Boundary Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the error boundary architecture with both global and
            feature-level error boundaries.
          </p>
        </div>

        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-blue-900">How it works</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>
              Each feature section below is wrapped in a <code>FeatureErrorBoundary</code>
            </li>
            <li>Clicking "Trigger Error" will throw an error in that specific feature</li>
            <li>The error will be caught and only that feature's UI will show an error state</li>
            <li>Other features and the rest of the page will continue to work normally</li>
            <li>You can click "Try Again" to reset the error state and restore the feature</li>
          </ul>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <FeatureErrorBoundary featureName="Projects">
            <FeatureSection title="Projects Feature" />
          </FeatureErrorBoundary>

          <FeatureErrorBoundary featureName="Chat">
            <FeatureSection title="Chat Feature" />
          </FeatureErrorBoundary>

          <FeatureErrorBoundary featureName="People">
            <FeatureSection title="People Feature" />
          </FeatureErrorBoundary>

          <FeatureErrorBoundary featureName="Analytics">
            <FeatureSection title="Analytics Feature" />
          </FeatureErrorBoundary>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-yellow-900">Global Error Boundary Test</h2>
          <p className="mb-4 text-sm text-yellow-800">
            This error trigger is <strong>not</strong> wrapped in a feature boundary. If you click
            it, the error will bubble up to the global error boundary and show a full-page error
            screen.
          </p>
          <ErrorTrigger message="Global error - this will show full-page error UI" />
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Implementation Notes</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Global Error Boundary</h3>
              <p>
                Located in <code className="text-xs">src/lib/error-boundary.tsx</code>
              </p>
              <p>Integrated in the app provider stack to catch all unhandled errors</p>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Feature Error Boundary</h3>
              <p>
                Located in{' '}
                <code className="text-xs">
                  src/shared/components/common/feature-error-boundary.tsx
                </code>
              </p>
              <p>Use this within feature modules to isolate errors to that feature only</p>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-gray-900">Error Tracking</h3>
              <p>
                Both boundaries support <code>onError</code> callbacks for integration with error
                tracking services like Sentry
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
