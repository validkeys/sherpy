import { useAuth } from "@/components/auth/auth-provider";
import { createApiClient } from "@/lib/api-client";
import { useEffect, useMemo, useRef } from "react";

export function useApi() {
  const { accessToken } = useAuth();
  const tokenRef = useRef(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const apiClient = useMemo(() => {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    return createApiClient(baseUrl, async () => {
      return tokenRef.current;
    });
  }, []);

  return apiClient;
}
