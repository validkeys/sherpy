import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { classifyError, logError, type ClassifiedError } from '@/lib/error-utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ClassifiedError, reset: () => void) => ReactNode;
  onError?: (error: ClassifiedError, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: ClassifiedError | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const classifiedError = classifyError(error);

    logError(classifiedError, {
      componentStack: errorInfo.componentStack,
      digest: errorInfo.digest,
    });

    this.setState({
      errorInfo,
    });

    this.props.onError?.(classifiedError, errorInfo);
  }

  reset = (): void => {
    this.setState({
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(error, this.reset);
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-4 text-gray-600">{error.userMessage}</p>
            <button
              onClick={this.reset}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
