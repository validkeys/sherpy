/**
 * React hook for typed API client
 */

import { useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { createApiClient } from "@/lib/api-client";

/**
 * Hook that provides typed API client with auth token injection
 */
export function useApi() {
  const { accessToken } = useAuth();

  const apiClient = useMemo(() => {
    // Empty baseUrl uses Vite proxy in dev (avoids CORS)
    // In production, set VITE_API_URL to the API server URL
    const baseUrl = import.meta.env.VITE_API_URL || "";

    return createApiClient(baseUrl, async () => accessToken);
  }, [accessToken]);

  return apiClient;
}
