/**
 * Get Project by ID Query
 *
 * GET /api/projects/:projectId
 * Fetches a single project by ID.
 * Follows the react-query-api-layer three-part pattern.
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ProjectResponse } from './types';

/**
 * Part 1: Fetcher function
 * Fetches a single project by ID from the API
 *
 * @param projectId - The project ID to fetch
 * @returns Promise resolving to the project
 * @throws {ApiError} When API request fails (including 404 Not Found)
 *
 * @example
 * ```ts
 * const response = await getProject('proj_abc123');
 * console.log(response.project.name);
 * ```
 */
export async function getProject(projectId: string): Promise<ProjectResponse> {
  return api.get<ProjectResponse>(`/api/projects/${projectId}`);
}

/**
 * Part 2: Query options factory
 * Creates standardized query options for React Query
 *
 * @param projectId - The project ID to fetch
 * @returns Query options object with queryKey and queryFn
 */
export function getProjectQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: ['projects', projectId] as const,
    queryFn: () => getProject(projectId),
    enabled: !!projectId, // Only run query if projectId is provided
  });
}

/**
 * Part 3: React Query hook
 * Hook for fetching a single project by ID
 *
 * The query is automatically enabled only when projectId is truthy.
 * Consumers can override query configuration while maintaining
 * the standardized queryKey and queryFn.
 *
 * @param projectId - The project ID to fetch
 * @param queryConfig - Optional query configuration overrides
 * @returns Query object with data, isLoading, error, etc.
 *
 * @example
 * ```tsx
 * function ProjectDetails({ projectId }: { projectId: string }) {
 *   const { data, isLoading, error } = useProject({
 *     projectId,
 *     queryConfig: { staleTime: 300000 }, // 5 minutes
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <ProjectView project={data.project} />;
 * }
 * ```
 */
export function useProject({
  projectId,
  queryConfig,
}: {
  projectId: string;
  queryConfig?: QueryConfig<typeof getProjectQueryOptions>;
}) {
  return useQuery({
    ...getProjectQueryOptions(projectId),
    ...queryConfig,
  });
}
