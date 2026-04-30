import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { getAuthToken, getWebSocketUrl } from '@/lib/websocket';

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime for streaming AI responses
 */
export function useChatRuntime(projectId: string) {
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
    onError: (error) => {
      console.error('Chat transport error:', error);
    },
  });

  return runtime;
}
