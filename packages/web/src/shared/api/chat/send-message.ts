/**
 * Send Message Mutation
 *
 * POST /api/projects/:projectId/chat/messages
 * Sends a user or assistant message to the chat conversation.
 * Follows the react-query-mutations pattern with Zod validation.
 */

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SendMessageResponse } from './types';
import { type SendMessageInput, sendMessageInputSchema } from './schemas';

/**
 * Input for send message mutation
 */
export interface SendMessageVariables {
  projectId: string;
  data: SendMessageInput;
}

/**
 * Fetcher function for sending a message
 * Validates input with Zod schema before making API call
 *
 * @param projectId - The project ID for the chat conversation
 * @param data - Message data (content and role)
 * @returns Promise resolving to the created message
 * @throws {ApiError} When API request fails
 * @throws {ZodError} When input validation fails
 *
 * @example
 * ```ts
 * const response = await sendMessage({
 *   projectId: 'proj_123',
 *   data: { content: 'Hello!', role: 'user' },
 * });
 * ```
 */
export async function sendMessage({
  projectId,
  data,
}: SendMessageVariables): Promise<SendMessageResponse> {
  // Validate input
  const validatedData = sendMessageInputSchema.parse(data);

  // Make API request
  return api.post<SendMessageResponse>(`/api/projects/${projectId}/chat/messages`, validatedData);
}

/**
 * React Query mutation hook for sending a chat message
 *
 * Automatically invalidates the chat messages cache on success.
 * Integrates with @assistant-ui components from M2.
 *
 * @param mutationConfig - Optional mutation configuration overrides
 * @returns Mutation object with mutate, mutateAsync, isLoading, etc.
 *
 * @example
 * ```tsx
 * function ChatInput({ projectId }: { projectId: string }) {
 *   const { mutate: sendMsg, isLoading } = useSendMessage({
 *     onSuccess: () => {
 *       toast.success('Message sent');
 *     },
 *     onError: (error) => {
 *       toast.error('Failed to send message');
 *     },
 *   });
 *
 *   const handleSubmit = (content: string) => {
 *     sendMsg({
 *       projectId,
 *       data: { content, role: 'user' },
 *     });
 *   };
 *
 *   // ...
 * }
 * ```
 */
export function useSendMessage(mutationConfig?: MutationConfig<typeof sendMessage>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data, variables, context) => {
      // Invalidate chat messages for this project to refetch with new message
      queryClient.invalidateQueries({
        queryKey: ['chat', variables.projectId, 'messages'],
      });

      // Call consumer's onSuccess if provided
      mutationConfig?.onSuccess?.(data, variables, context);
    },
    ...mutationConfig,
  });
}
