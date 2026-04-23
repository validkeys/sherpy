/**
 * Login Callback - Handles Okta redirect and token exchange
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth";

export function LoginCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse tokens from URL
        await authClient.handleLoginRedirect();

        // Redirect to inbox on success
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Login callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full border">
          <h2 className="text-2xl font-bold text-destructive mb-4">
            Authentication Error
          </h2>
          <p className="text-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="text-primary underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
