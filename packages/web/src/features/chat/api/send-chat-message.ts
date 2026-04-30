/**
 * Send Chat Message API
 *
 * Mutation pattern: mutation function → hook with cache invalidation
 * Sends a new chat message to a project.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/shared/types/api';
import type { ChatMessage } from '../types';
import { getChatMessagesQueryOptions } from './get-chat-messages';

/**
 * Input data for sending a chat message
 */
export interface SendChatMessageInput {
  projectId: string;
  content: string;
  role?: 'user' | 'system';
}

/**
 * Mutation function
 * Sends a chat message to the API
 */
export const sendChatMessage = ({ data }: { data: SendChatMessageInput }): Promise<ChatMessage> => {
  return api.post<ChatMessage>('/chat/messages', data);
};

/**
 * Hook with cache invalidation
 * Automatically invalidates chat messages query on success
 */
export type UseSendChatMessageOptions = {
  mutationConfig?: MutationConfig<typeof sendChatMessage>;
};

export const useSendChatMessage = ({ mutationConfig }: UseSendChatMessageOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, variables, context) => {
      // Invalidate all pages of chat messages for this project
      queryClient.invalidateQueries({
        queryKey: getChatMessagesQueryOptions({ projectId: variables.data.projectId }).queryKey,
      });
      onSuccess?.(data, variables, context);
    },
    ...restConfig,
    mutationFn: sendChatMessage,
  });
};
