/**
 * React hook for WebSocket client
 */

import { useAuth } from "@/components/auth/auth-provider";
import { type ConnectionState, WebSocketClient, type WsEventType } from "@/lib/ws-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type { ConnectionState };

let wsHookInstanceCounter = 0;

export function useWebSocket() {
  const instanceId = useMemo(() => ++wsHookInstanceCounter, []);
  const { accessToken } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");

  const tokenRef = useRef(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const wsClient = useMemo(() => {
    const wsUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") + "/ws"
      : `ws://${window.location.host}/ws`;

    console.log(`[DIAG] useWebSocket #${instanceId}: creating NEW WebSocketClient → ${wsUrl}`);
    return new WebSocketClient(wsUrl, async () => tokenRef.current);
  }, [instanceId]);

  useEffect(() => {
    if (!accessToken) {
      console.log(`[DIAG] useWebSocket #${instanceId}: SKIPPING connect (no accessToken)`);
      return;
    }

    console.log(
      `[DIAG] useWebSocket #${instanceId}: connect effect running. accessToken:`,
      accessToken.substring(0, 15),
    );
    wsClient.connect();

    const unsubscribe = wsClient.on("_connectionStateChanged", (state) => {
      console.log(`[DIAG] useWebSocket #${instanceId}: connectionState →`, state);
      setConnectionState(state as ConnectionState);
    });

    return () => {
      console.log(`[DIAG] useWebSocket #${instanceId}: connect effect CLEANUP → destroy()`);
      unsubscribe();
      wsClient.destroy();
    };
  }, [wsClient, accessToken, instanceId]);

  const subscribe = useCallback(
    (eventType: WsEventType, handler: (payload: unknown) => void) => {
      return wsClient.on(eventType, handler);
    },
    [wsClient],
  );

  console.log(
    `[DIAG] useWebSocket #${instanceId}: returning { connectionState: ${connectionState}, subscribe: ${subscribe !== null ? "fn" : "null"} }`,
  );

  return {
    connectionState,
    subscribe,
  };
}
