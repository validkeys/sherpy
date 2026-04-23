/**
 * Auth Provider - Manages authentication state
 */

import { authClient } from "@/lib/auth";
import type { UserClaims } from "@okta/okta-auth-js";
import { createContext, useContext, useEffect, useState } from "react";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserClaims | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Development mode bypass check
const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

// Mock user for dev mode
const DEV_USER: UserClaims = {
  sub: "dev-user-123",
  name: "Dev User",
  email: "dev@sherpy.local",
  preferred_username: "dev",
};

// Mock token for dev mode
const DEV_TOKEN = "dev-mode-token-bypass";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE);
  const [isLoading, setIsLoading] = useState(!DEV_MODE);
  const [user, setUser] = useState<UserClaims | null>(DEV_MODE ? DEV_USER : null);
  const [accessToken, setAccessToken] = useState<string | null>(DEV_MODE ? DEV_TOKEN : null);

  useEffect(() => {
    // Skip Okta in dev mode
    if (DEV_MODE) {
      console.log("🚧 DEV MODE: Authentication bypassed");
      console.log("📧 Mock user:", DEV_USER.email);
      return;
    }

    // Subscribe to auth state changes
    const updateAuthState = async () => {
      const authenticated = await authClient.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const tokenManager = authClient.tokenManager;
        const token = await tokenManager.get("accessToken");
        if (token && "accessToken" in token) {
          setAccessToken(token.accessToken);
        } else {
          setAccessToken(null);
        }

        const userInfo = await authClient.getUser();
        setUser(userInfo);
      } else {
        setAccessToken(null);
        setUser(null);
      }

      setIsLoading(false);
    };

    // Initial auth state check
    updateAuthState();

    // Listen for token updates
    authClient.authStateManager.subscribe(updateAuthState);

    return () => {
      authClient.authStateManager.unsubscribe(updateAuthState);
    };
  }, []);

  const login = async () => {
    if (DEV_MODE) {
      console.log("🚧 DEV MODE: Login bypassed");
      return;
    }
    await authClient.signInWithRedirect();
  };

  const logout = async () => {
    if (DEV_MODE) {
      console.log("🚧 DEV MODE: Logout bypassed");
      return;
    }
    await authClient.signOut();
  };

  const value: AuthState = {
    isAuthenticated,
    isLoading,
    user,
    accessToken,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
