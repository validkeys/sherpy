/**
 * Get Document by Type Query
 *
 * GET /api/projects/:projectId/documents/:documentType
 * Fetches a specific document by type for preview in Files tab.
 * Returns the latest version of the document.
 * Follows the react-query-api-layer three-part pattern.
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { DocumentResponse, DocumentType } from './types';

/**
 * Part 1: Fetcher function
 * Fetches a specific document by type from the API
 *
 * Returns the latest version of the document for the given type.
 * If document doesn't exist, API returns 404.
 *
 * @param projectId - The project ID
 * @param documentType - The type of document to fetch
 * @returns Promise resolving to the document
 * @throws {ApiError} When API request fails or document not found (404)
 *
 * @example
 * ```ts
 * const document = await getDocument({
 *   projectId: 'proj-123',
 *   documentType: 'business-requirements',
 * });
 * console.log(document.document.content);
 * ```
 */
export async function getDocument({
  projectId,
  documentType,
}: {
  projectId: string;
  documentType: DocumentType;
}): Promise<DocumentResponse> {
  return api.get<DocumentResponse>(`/api/projects/${projectId}/documents/${documentType}`);
}

/**
 * Part 2: Query options factory
 * Creates standardized query options for React Query
 *
 * @param projectId - The project ID
 * @param documentType - The type of document to fetch
 * @returns Query options object with queryKey and queryFn
 */
export function getDocumentQueryOptions(projectId: string, documentType: DocumentType) {
  return queryOptions({
    queryKey: ['documents', projectId, documentType] as const,
    queryFn: () => getDocument({ projectId, documentType }),
    enabled: !!projectId && !!documentType, // Only fetch when both are provided
  });
}

/**
 * Part 3: React Query hook
 * Hook for fetching a specific document with React Query
 *
 * Automatically disabled when projectId or documentType is not provided.
 * Handles 404 gracefully (document may not exist yet).
 * Consumers can override query configuration while maintaining
 * the standardized queryKey and queryFn.
 *
 * @param projectId - The project ID
 * @param documentType - The type of document to fetch
 * @param queryConfig - Optional query configuration overrides
 * @returns Query object with data, isLoading, error, etc.
 *
 * @example
 * ```tsx
 * function FilePreview({ documentType }: { documentType: DocumentType }) {
 *   const projectId = useCurrentProjectId();
 *   const { data, isLoading, error } = useDocument({
 *     projectId,
 *     documentType,
 *     queryConfig: { staleTime: 300000 },
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error?.status === 404) return <EmptyState message="Document not generated yet" />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <CodeEditor
 *       value={data.document.content}
 *       language={data.document.format}
 *       readOnly
 *     />
 *   );
 * }
 * ```
 */
export function useDocument({
  projectId,
  documentType,
  queryConfig,
}: {
  projectId: string;
  documentType: DocumentType;
  queryConfig?: QueryConfig<typeof getDocumentQueryOptions>;
}) {
  return useQuery({
    ...getDocumentQueryOptions(projectId, documentType),
    ...queryConfig,
  });
}
