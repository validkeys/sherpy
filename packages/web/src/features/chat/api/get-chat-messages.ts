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
 * Fetches chat messages for a project with cursor-based pagination
 */
export const getChatMessages = ({
  projectId,
  cursor,
  limit,
}: {
  projectId: string;
  cursor?: string;
  limit?: number;
}): Promise<GetChatMessagesResponse> => {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = String(limit);

  return api.get<GetChatMessagesResponse>(`/api/projects/${projectId}/chat/messages`, {
    params,
  });
};

/**
 * Part 2: Query options factory
 * Creates react-query queryOptions for getChatMessages
 */
export const getChatMessagesQueryOptions = ({
  projectId,
  cursor,
  limit,
}: {
  projectId: string;
  cursor?: string;
  limit?: number;
}) => {
  return queryOptions({
    queryKey: ['chat-messages', projectId, { cursor, limit }],
    queryFn: () => getChatMessages({ projectId, cursor, limit }),
  });
};

/**
 * Part 3: Hook
 * React hook that exposes the query with configuration options
 */
export type UseChatMessagesOptions = {
  projectId: string;
  cursor?: string;
  limit?: number;
  queryConfig?: QueryConfig<typeof getChatMessagesQueryOptions>;
};

export const useChatMessages = ({ projectId, cursor, limit, queryConfig }: UseChatMessagesOptions) => {
  return useQuery({
    ...getChatMessagesQueryOptions({ projectId, cursor, limit }),
    ...queryConfig,
  });
};
