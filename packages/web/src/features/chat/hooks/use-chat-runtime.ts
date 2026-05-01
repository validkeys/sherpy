import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { getAuthToken, getWebSocketUrl } from '@/lib/websocket';
import { useMessages } from '@/shared/api/chat/get-messages';
import { useSendChatMessage } from '../api/send-chat-message';

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 * Returns only the runtime - connection state monitoring is handled separately
 * by useConnectionState to avoid duplicate runtime instances.
 *
 * Loads message history from the API on mount and hydrates the runtime.
 * Automatically persists user messages sent through the UI to the database.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime with message history
 */
export function useChatRuntime(projectId: string) {
  const { mutate: persistMessage } = useSendChatMessage();

  // Fetch message history for the project
  // Wait for initial load to complete before creating runtime
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages({
    projectId,
    queryConfig: {
      enabled: !!projectId,
      staleTime: Infinity, // Only fetch once on mount
    },
  });

  // Convert API messages to runtime format
  // Only compute this once messages are fully loaded
  const initialMessages =
    !isLoadingMessages && messagesData?.messages
      ? messagesData.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: [{ type: 'text' as const, text: msg.content }],
          createdAt: new Date(msg.createdAt),
        }))
      : [];

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
    prepareSendCommandsRequest: (body) => {
      // Persist user messages to database via REST API
      // This runs before the WebSocket streaming begins
      try {
        for (const command of body.commands) {
          if (command.type === 'add-message' && command.message.role === 'user') {
            // Extract text content from the message parts
            const textContent = command.message.parts
              .filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join('');

            if (textContent) {
              persistMessage({
                data: {
                  projectId,
                  content: textContent,
                  role: 'user',
                },
              });
            }
          }
        }
      } catch (error) {
        // Don't block WebSocket streaming if persistence fails
        console.error('Failed to persist message:', error);
      }

      return body;
    },
    onError: (error) => {
      console.error('Chat transport error:', error);
    },
  });

  return {
    runtime,
    isLoadingHistory: isLoadingMessages,
  };
}
