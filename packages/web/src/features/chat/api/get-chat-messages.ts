/**
 * Get Chat Messages API
 *
 * Three-part pattern: fetcher → query options → hook
 * Fetches paginated chat message history for a project.
 */

import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/shared/types/api';
import type { GetChatMessagesResponse } from '../types';

/**
 * Part 1: Fetcher function
 * Fetches chat messages for a project with pagination
 */
export const getChatMessages = ({
  projectId,
  page = 1,
}: {
  projectId: string;
  page?: number;
}): Promise<GetChatMessagesResponse> => {
  return api.get<GetChatMessagesResponse>(`/chat/messages`, {
    params: { projectId, page },
  });
};

/**
 * Part 2: Query options factory
 * Creates react-query queryOptions for getChatMessages
 */
export const getChatMessagesQueryOptions = ({
  projectId,
  page,
}: {
  projectId: string;
  page?: number;
}) => {
  return queryOptions({
    queryKey: page ? ['chat-messages', projectId, { page }] : ['chat-messages', projectId],
    queryFn: () => getChatMessages({ projectId, page }),
  });
};

/**
 * Part 3: Hook
 * React hook that exposes the query with configuration options
 */
export type UseChatMessagesOptions = {
  projectId: string;
  page?: number;
  queryConfig?: QueryConfig<typeof getChatMessagesQueryOptions>;
};

export const useChatMessages = ({ projectId, page, queryConfig }: UseChatMessagesOptions) => {
  return useQuery({
    ...getChatMessagesQueryOptions({ projectId, page }),
    ...queryConfig,
  });
};
