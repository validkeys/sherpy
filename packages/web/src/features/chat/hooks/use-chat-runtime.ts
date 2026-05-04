import { useAssistantTransportRuntime } from '@assistant-ui/react';
import { useMemo } from 'react';
import type { SendCommandsRequestBody } from '@assistant-ui/react';
import { getAuthToken, getWebSocketUrl } from '@/lib/websocket';
import { useMessages } from '@/shared/api/chat/get-messages';
import { useSendChatMessage } from '../api/send-chat-message';
import { convertMessagesToThread } from '../utils/message-converter';

/**
 * Custom hook to create and configure chat runtime with streaming connection.
 * Handles initial message history hydration from the database and persistence
 * of new user messages.
 *
 * @param projectId - The project ID for the current session
 * @returns Configured assistant runtime with loading state
 */
export function useChatRuntime(projectId: string) {
  // Fetch message history from database
  const { data: messagesData, isLoading: isLoadingHistory } = useMessages({
    projectId,
    queryConfig: {
      enabled: true,
      staleTime: Infinity, // Only fetch once on mount
    },
  });

  // Convert API messages to runtime format
  const initialMessages = useMemo(() => {
    if (!messagesData?.messages) {
      return [];
    }
    return convertMessagesToThread(messagesData.messages);
  }, [messagesData?.messages]);

  // Hook for persisting user messages to database
  const { mutate: persistMessage } = useSendChatMessage();

  const runtime = useAssistantTransportRuntime<{
    messages: never[];
    isRunning: boolean;
  }>({
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
    prepareSendCommandsRequest: (body: SendCommandsRequestBody) => {
      // Persist user messages to database before sending to WebSocket
      body.commands.forEach((command) => {
        if (command.type === 'add-message' && command.message.role === 'user') {
          // Extract text content from message parts
          const textParts = command.message.parts.filter(
            (part): part is { type: 'text'; text: string } => part.type === 'text'
          );
          const content = textParts.map((part) => part.text).join('');

          // Only persist if there's content
          if (content) {
            try {
              persistMessage({
                data: {
                  projectId,
                  content,
                  role: 'user',
                },
              });
            } catch (error) {
              console.error('Failed to persist message:', error);
            }
          }
        }
      });

      // Return body unchanged for WebSocket streaming
      return body;
    },
  });

  return {
    runtime,
    isLoadingHistory,
  };
}
