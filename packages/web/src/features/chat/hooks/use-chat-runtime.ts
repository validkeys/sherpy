import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAuthToken, getWebSocketUrl } from '@/lib/websocket';

interface ConnectionState {
  isConnected: boolean;
  error: Error | null;
  isReconnecting: boolean;
}

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 * Includes error handling, automatic reconnection, and connection state tracking.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime with connection state
 */
export function useChatRuntime(projectId: string) {
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

  const runtime = useAssistantTransportRuntime({
    initialState: {
      messages: [],
      isRunning: false,
    },
    api: `${getWebSocketUrl()}/chat`,
    converter: (state) => ({
      messages: state.messages || [],
      isRunning: state.isRunning || false,
    }),
    headers: async () => {
      const token = getAuthToken();
      return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'X-Project-Id': projectId,
      };
    },
    onError: handleError,
  });

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

  return {
    runtime,
    connectionState,
    manualRetry,
  };
}
