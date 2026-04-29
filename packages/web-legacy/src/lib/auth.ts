/**
 * Okta OIDC SPA Authentication (PKCE)
 */

import { OktaAuth } from "@okta/okta-auth-js";

// Development mode bypass check
const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

// Initialize OktaAuth with PKCE configuration
// In DEV_MODE, provide dummy values to prevent initialization errors
export const authClient = new OktaAuth({
  issuer: DEV_MODE ? "https://dev.okta.local/oauth2/default" : (import.meta.env.VITE_OKTA_DOMAIN || ""),
  clientId: DEV_MODE ? "dev-client-id" : (import.meta.env.VITE_OKTA_CLIENT_ID || ""),
  redirectUri: `${window.location.origin}/login/callback`,
  postLogoutRedirectUri: window.location.origin,
  scopes: ["openid", "profile", "email"],
  pkce: true,
  tokenManager: {
    storage: "sessionStorage",
  },
});

/**
 * Get the current access token
 */
export async function getAccessToken(): Promise<string | undefined> {
  const tokenManager = authClient.tokenManager;
  const token = await tokenManager.get("accessToken");
  if (token && "accessToken" in token) {
    return token.accessToken;
  }
  return undefined;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  return authClient.isAuthenticated();
}

/**
 * Get current user info
 */
export async function getUserInfo() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }
  return authClient.getUser();
}
