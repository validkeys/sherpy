/**
 * List Documents Query
 *
 * GET /api/projects/:projectId/documents
 * Fetches all documents belonging to a project.
 * Follows the react-query-api-layer three-part pattern.
 * Used in Files tab tree view to display generated planning artifacts.
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { DocumentListResponse } from './types';

/**
 * Part 1: Fetcher function
 * Fetches list of documents for a specific project from the API
 *
 * @param projectId - The project ID to fetch documents for
 * @returns Promise resolving to list of documents
 * @throws {ApiError} When API request fails
 *
 * @example
 * ```ts
 * const documents = await getDocuments({ projectId: 'proj-123' });
 * console.log(documents.documents); // Array of Document objects
 * ```
 */
export async function getDocuments({
  projectId,
}: {
  projectId: string;
}): Promise<DocumentListResponse> {
  return api.get<DocumentListResponse>(`/api/projects/${projectId}/documents`);
}

/**
 * Part 2: Query options factory
 * Creates standardized query options for React Query
 *
 * @param projectId - The project ID to fetch documents for
 * @returns Query options object with queryKey and queryFn
 */
export function getDocumentsQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: ['documents', projectId] as const,
    queryFn: () => getDocuments({ projectId }),
    enabled: !!projectId, // Only fetch when projectId is provided
  });
}

/**
 * Part 3: React Query hook
 * Hook for fetching documents list with React Query
 *
 * Automatically disabled when projectId is not provided.
 * Consumers can override query configuration while maintaining
 * the standardized queryKey and queryFn.
 *
 * @param projectId - The project ID to fetch documents for
 * @param queryConfig - Optional query configuration overrides
 * @returns Query object with data, isLoading, error, etc.
 *
 * @example
 * ```tsx
 * function FileTree() {
 *   const { data, isLoading, error } = useDocuments({
 *     projectId: 'proj-123',
 *     queryConfig: { staleTime: 300000 }, // 5 minutes
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error.message} />;
 *   if (!data?.documents.length) return <EmptyState />;
 *
 *   return (
 *     <TreeView>
 *       {data.documents.map((doc) => (
 *         <TreeNode key={doc.id} document={doc} />
 *       ))}
 *     </TreeView>
 *   );
 * }
 * ```
 */
export function useDocuments({
  projectId,
  queryConfig,
}: {
  projectId: string;
  queryConfig?: QueryConfig<typeof getDocumentsQueryOptions>;
}) {
  return useQuery({
    ...getDocumentsQueryOptions(projectId),
    ...queryConfig,
  });
}
