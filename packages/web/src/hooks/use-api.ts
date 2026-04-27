import { useAuth } from "@/components/auth/auth-provider";
import { createApiClient } from "@/lib/api-client";
import { useMemo, useRef, useEffect } from "react";

let apiInstanceCounter = 0;

export function useApi() {
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken);
  const instanceId = useMemo(() => ++apiInstanceCounter, []);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const apiClient = useMemo(() => {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    console.log(`[DIAG] useApi #${instanceId}: creating NEW ApiClient (baseUrl: "${baseUrl}")`);
    return createApiClient(baseUrl, async () => {
      return tokenRef.current;
    });
  }, [instanceId]);

  return apiClient;
}
