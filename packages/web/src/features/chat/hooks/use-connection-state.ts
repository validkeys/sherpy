import { useCallback, useEffect, useRef, useState } from 'react';

interface ConnectionState {
  isConnected: boolean;
  error: Error | null;
  isReconnecting: boolean;
}

/**
 * Custom hook to monitor connection state and handle reconnection logic.
 * Separated from runtime creation to avoid duplicate runtime instances.
 *
 * @param projectId - The project ID for the current session
 * @returns Connection state and manual retry function
 */
export function useConnectionState(projectId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    error: null,
    isReconnecting: false,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const handleError = useCallback((error: Error) => {
    console.error('Chat transport error:', error);
    setConnectionState({
      isConnected: false,
      error,
      isReconnecting: false,
    });

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Schedule automatic reconnection after 3 seconds
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
      }));
      reconnectCountRef.current += 1;
    }, 3000);
  }, []);

  const handleConnect = useCallback(() => {
    setConnectionState({
      isConnected: true,
      error: null,
      isReconnecting: false,
    });
    reconnectCountRef.current = 0;

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const manualRetry = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      isReconnecting: true,
    }));
    // The runtime will attempt to reconnect on next message send
    // or we can force a reconnection by switching threads
    handleConnect();
  }, [handleConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Note: In a full implementation, this hook would monitor the runtime's
  // connection status and call handleError/handleConnect based on actual
  // connection events. For now, it provides the state management structure.

  return {
    connectionState,
    manualRetry,
  };
}
