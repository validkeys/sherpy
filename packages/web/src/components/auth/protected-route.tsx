/**
 * Protected Route - Requires authentication
 */

import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(
    `[DIAG] ProtectedRoute render #${renderCount.current}, isLoading=${isLoading}, isAuthenticated=${isAuthenticated}`,
  );

  useEffect(() => {
    console.log("[DIAG] ProtectedRoute MOUNTED");
    return () => {
      console.log("[DIAG] ProtectedRoute UNMOUNTING");
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
