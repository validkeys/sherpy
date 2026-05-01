/**
 * Get Messages Query
 *
 * GET /api/projects/:projectId/chat/messages
 * Fetches chat message history for a project with pagination.
 * Follows the react-query-api-layer three-part pattern.
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { GetMessagesParams, GetMessagesResponse } from './types';

/**
 * Part 1: Fetcher function
 * Fetches chat messages for a project from the API
 *
 * @param projectId - The project ID for the chat conversation
 * @param params - Query parameters for pagination (limit, cursor)
 * @returns Promise resolving to paginated messages list
 * @throws {ApiError} When API request fails
 *
 * @example
 * ```ts
 * const response = await getMessages('proj_123', { limit: 50 });
 * console.log(response.messages.length);
 * ```
 */
export async function getMessages(
  projectId: string,
  params?: GetMessagesParams
): Promise<GetMessagesResponse> {
  return api.get<GetMessagesResponse>(`/api/projects/${projectId}/chat/messages`, { params });
}

/**
 * Part 2: Query options factory
 * Creates standardized query options for React Query
 *
 * @param projectId - The project ID for the chat conversation
 * @param params - Query parameters for pagination
 * @returns Query options object with queryKey and queryFn
 */
export function getMessagesQueryOptions(projectId: string, params?: GetMessagesParams) {
  return queryOptions({
    queryKey: ['chat', projectId, 'messages', params ?? {}] as const,
    queryFn: () => getMessages(projectId, params),
    enabled: !!projectId, // Only run query if projectId is provided
  });
}

/**
 * Part 3: React Query hook
 * Hook for fetching chat messages with React Query
 *
 * The query is automatically enabled only when projectId is truthy.
 * Supports pagination with limit and cursor parameters.
 *
 * @param projectId - The project ID for the chat conversation
 * @param params - Query parameters for pagination
 * @param queryConfig - Optional query configuration overrides
 * @returns Query object with data, isLoading, error, etc.
 *
 * @example
 * ```tsx
 * function ChatHistory({ projectId }: { projectId: string }) {
 *   const { data, isLoading, error } = useMessages({
 *     projectId,
 *     params: { limit: 50 },
 *     queryConfig: { staleTime: 30000 }, // 30 seconds
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <Thread messages={data.messages} />
 *   );
 * }
 * ```
 */
export function useMessages({
  projectId,
  params,
  queryConfig,
}: {
  projectId: string;
  params?: GetMessagesParams;
  queryConfig?: QueryConfig<typeof getMessagesQueryOptions>;
}) {
  return useQuery({
    ...getMessagesQueryOptions(projectId, params),
    ...queryConfig,
  });
}
