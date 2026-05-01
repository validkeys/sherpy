/**
 * Get Document API
 *
 * Fetches a specific document by type following the three-part react-query pattern:
 * 1. Fetcher function (getDocument)
 * 2. Query options factory (getDocumentQueryOptions)
 * 3. React Hook (useDocument)
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/shared/types/api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { Document, DocumentType } from '../types';

/**
 * Response type from the API endpoint
 */
interface GetDocumentResponse {
  document: Document;
}

/**
 * Fetcher: Fetches a specific document by type
 */
export async function getDocument({
  projectId,
  documentType,
}: {
  projectId: string;
  documentType: DocumentType;
}): Promise<Document> {
  const response = await api.get<GetDocumentResponse>(`/api/projects/${projectId}/documents/${documentType}`);
  return response.document;
}

/**
 * Query options factory: Creates query options for fetching a specific document
 */
export function getDocumentQueryOptions(projectId: string, documentType: DocumentType) {
  return queryOptions({
    queryKey: ['projects', projectId, 'documents', documentType],
    queryFn: () => getDocument({ projectId, documentType }),
  });
}

/**
 * Hook: React hook for fetching a specific document with react-query
 */
export function useDocument({
  projectId,
  documentType,
  queryConfig,
}: {
  projectId: string;
  documentType: DocumentType;
  queryConfig?: QueryConfig<Document>;
}) {
  return useQuery({
    ...getDocumentQueryOptions(projectId, documentType),
    ...queryConfig,
  });
}
