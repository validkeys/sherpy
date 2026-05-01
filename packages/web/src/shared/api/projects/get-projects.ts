/**
 * List Projects Query
 *
 * GET /api/projects
 * Fetches a list of projects with optional filtering.
 * Follows the react-query-api-layer three-part pattern.
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ListProjectsParams, ProjectListResponse } from './types';

/**
 * Part 1: Fetcher function
 * Fetches list of projects from the API with optional filters
 *
 * @param params - Query parameters for filtering (status, priority, search, pagination)
 * @returns Promise resolving to list of projects
 * @throws {ApiError} When API request fails
 *
 * @example
 * ```ts
 * const projects = await getProjects({
 *   pipelineStatus: ['intake', 'business-requirements'],
 *   priority: ['high', 'critical'],
 *   limit: 20,
 * });
 * ```
 */
export async function getProjects(params?: ListProjectsParams): Promise<ProjectListResponse> {
  return api.get<ProjectListResponse>('/api/projects', { params });
}

/**
 * Part 2: Query options factory
 * Creates standardized query options for React Query
 *
 * @param params - Query parameters for filtering
 * @returns Query options object with queryKey and queryFn
 */
export function getProjectsQueryOptions(params?: ListProjectsParams) {
  return queryOptions({
    queryKey: ['projects', params ?? {}] as const,
    queryFn: () => getProjects(params),
  });
}

/**
 * Part 3: React Query hook
 * Hook for fetching projects list with React Query
 *
 * Consumers can override query configuration while maintaining
 * the standardized queryKey and queryFn.
 *
 * @param params - Query parameters for filtering
 * @param queryConfig - Optional query configuration overrides
 * @returns Query object with data, isLoading, error, etc.
 *
 * @example
 * ```tsx
 * function ProjectsList() {
 *   const { data, isLoading, error } = useProjects({
 *     params: { pipelineStatus: ['intake'], limit: 10 },
 *     queryConfig: { staleTime: 60000 },
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {data.projects.map((project) => (
 *         <li key={project.id}>{project.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useProjects({
  params,
  queryConfig,
}: {
  params?: ListProjectsParams;
  queryConfig?: QueryConfig<typeof getProjectsQueryOptions>;
} = {}) {
  return useQuery({
    ...getProjectsQueryOptions(params),
    ...queryConfig,
  });
}
