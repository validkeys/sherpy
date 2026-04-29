/**
 * Login Page - Simple Okta OIDC login
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

export function LoginPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full border">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Sherpy PM</h1>
          <p className="text-muted-foreground">Local-first project management with AI scheduling</p>
        </div>

        <Button onClick={login} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? "Loading..." : "Sign in with Okta"}
        </Button>
      </div>
    </div>
  );
}
