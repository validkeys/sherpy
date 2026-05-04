import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { buildAuthenticatedWsUrl } from '@/lib/websocket';

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 * Returns only the runtime - connection state monitoring is handled separately
 * by useConnectionState to avoid duplicate runtime instances.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime
 */
export function useChatRuntime(projectId: string) {
  const runtime = useAssistantTransportRuntime({
    initialState: {
      messages: [],
      isRunning: false,
    },
    api: buildAuthenticatedWsUrl(projectId),
    converter: (state) => ({
      messages: state.messages || [],
      isRunning: state.isRunning || false,
    }),
    onError: (error) => {
      console.error('Chat transport error:', error);
    },
  });

  return {
    runtime,
  };
}
