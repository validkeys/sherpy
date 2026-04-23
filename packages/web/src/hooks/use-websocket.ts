/**
 * React hook for WebSocket client
 */

import { useAuth } from "@/components/auth/auth-provider";
import { type ConnectionState, WebSocketClient, type WsEventType } from "@/lib/ws-client";
import { useEffect, useMemo, useState } from "react";

// Re-export ConnectionState for use in other components
export type { ConnectionState };

/**
 * Hook that manages WebSocket lifecycle
 */
export function useWebSocket() {
  const { accessToken } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");

  const wsClient = useMemo(() => {
    // Use relative URL to leverage Vite proxy in dev (avoids CORS)
    // Vite proxy will forward /ws to ws://localhost:3101
    const wsUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") + "/ws"
      : `ws://${window.location.host}/ws`;

    return new WebSocketClient(wsUrl, async () => accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return; // Don't connect without auth token
    }

    // Connect on mount
    wsClient.connect();

    // Subscribe to connection state changes
    const unsubscribe = wsClient.on("_connectionStateChanged", (state) => {
      setConnectionState(state as ConnectionState);
    });

    // Disconnect on unmount
    return () => {
      unsubscribe();
      wsClient.destroy();
    };
  }, [wsClient, accessToken]);

  /**
   * Subscribe to event type
   */
  const subscribe = (eventType: WsEventType, handler: (payload: unknown) => void) => {
    return wsClient.on(eventType, handler);
  };

  return {
    connectionState,
    subscribe,
  };
}
