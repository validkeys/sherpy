/**
 * Error Boundary Component
 * Catches React errors (including Suspense rejections) and displays fallback UI
 */

import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              Error Loading Project
            </h1>
            <p className="text-muted-foreground">
              {this.state.error.message || "An unexpected error occurred"}
            </p>
            <Link
              to="/projects"
              className="text-primary hover:underline inline-block"
            >
              Return to Projects
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
