import { Button } from '@/shared/components/ui/button';
import { ErrorType, type ClassifiedError } from '@/lib/error-utils';

interface ErrorFallbackProps {
  error: ClassifiedError;
  onReset?: () => void;
  onGoHome?: () => void;
}

export function ErrorFallback({ error, onReset, onGoHome }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case ErrorType.Network:
        return 'Connection Problem';
      case ErrorType.Authentication:
        return 'Authentication Required';
      case ErrorType.Api:
        return 'Server Error';
      case ErrorType.Validation:
        return 'Invalid Request';
      default:
        return 'Something Went Wrong';
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.Network:
        return '🌐';
      case ErrorType.Authentication:
        return '🔐';
      case ErrorType.Api:
        return '🔧';
      case ErrorType.Validation:
        return '⚠️';
      default:
        return '❌';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-4 text-6xl">{getErrorIcon()}</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{getErrorTitle()}</h1>
          <p className="text-gray-600">{error.userMessage}</p>
        </div>

        {isDev && (
          <div className="rounded-md bg-gray-100 p-4">
            <h3 className="mb-2 font-mono text-sm font-semibold text-gray-700">
              Development Details
            </h3>
            <div className="space-y-1 font-mono text-xs text-gray-600">
              <p>
                <strong>Error ID:</strong> {error.errorId}
              </p>
              <p>
                <strong>Type:</strong> {error.type}
              </p>
              <p>
                <strong>Message:</strong> {error.message}
              </p>
              {error.originalError instanceof Error && (
                <>
                  <p>
                    <strong>Stack:</strong>
                  </p>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-200 p-2 text-xs">
                    {error.originalError.stack}
                  </pre>
                </>
              )}
            </div>
          </div>
        )}

        {!isDev && (
          <div className="rounded-md bg-gray-100 p-3 text-center">
            <p className="font-mono text-xs text-gray-500">Error ID: {error.errorId}</p>
            <p className="mt-1 text-xs text-gray-500">
              Please share this ID if you need support.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {error.retryable && onReset && (
            <Button onClick={onReset} variant="default" className="w-full">
              Try Again
            </Button>
          )}
          <Button onClick={handleGoHome} variant="outline" className="w-full">
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
