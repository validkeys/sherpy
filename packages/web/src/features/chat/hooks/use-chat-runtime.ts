import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { useEffect, useState } from 'react';
import { getAuthToken, getWebSocketUrl } from '@/lib/websocket';
import { useMessages } from '@/shared/api/chat/get-messages';

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 * Returns only the runtime - connection state monitoring is handled separately
 * by useConnectionState to avoid duplicate runtime instances.
 *
 * Loads message history from the API on mount and hydrates the runtime.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime with message history
 */
export function useChatRuntime(projectId: string) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Fetch message history for the project
  const { data: messagesData } = useMessages({
    projectId,
    queryConfig: {
      enabled: !!projectId && !isHydrated,
      staleTime: Infinity, // Only fetch once on mount
    },
  });

  // Convert API messages to runtime format
  const initialMessages =
    messagesData?.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: [{ type: 'text' as const, text: msg.content }],
      createdAt: new Date(msg.createdAt),
    })) || [];

  const runtime = useAssistantTransportRuntime({
    initialState: {
      messages: initialMessages,
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
    onError: (error) => {
      console.error('Chat transport error:', error);
    },
  });

  // Mark as hydrated once messages are loaded
  useEffect(() => {
    if (messagesData && !isHydrated) {
      setIsHydrated(true);
    }
  }, [messagesData, isHydrated]);

  return {
    runtime,
  };
}
