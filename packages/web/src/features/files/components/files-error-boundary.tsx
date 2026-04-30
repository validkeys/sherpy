/**
 * Files Error Boundary Component
 *
 * Catches errors in the files feature and displays a user-friendly error message
 * with a retry button.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FilesErrorBoundaryProps {
  children: React.ReactNode;
}

interface FilesErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class FilesErrorBoundary extends React.Component<
  FilesErrorBoundaryProps,
  FilesErrorBoundaryState
> {
  constructor(props: FilesErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FilesErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Files feature error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There was an error loading the files feature. Please try again.
              </p>
              {this.state.error && (
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
