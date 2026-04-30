/**
 * Get Documents API
 *
 * Fetches all documents for a project following the three-part react-query pattern:
 * 1. Fetcher function (getDocuments)
 * 2. Query options factory (getDocumentsQueryOptions)
 * 3. React Hook (useDocuments)
 */

import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/shared/types/api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { Document } from '../types';

/**
 * Fetcher: Fetches all documents for a project
 */
export async function getDocuments({ projectId }: { projectId: string }): Promise<Document[]> {
  return api.get<Document[]>(`/api/projects/${projectId}/documents`);
}

/**
 * Query options factory: Creates query options for fetching documents
 */
export function getDocumentsQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: ['projects', projectId, 'documents'],
    queryFn: () => getDocuments({ projectId }),
  });
}

/**
 * Hook: React hook for fetching documents with react-query
 */
export function useDocuments({
  projectId,
  queryConfig,
}: {
  projectId: string;
  queryConfig?: QueryConfig<Document[]>;
}) {
  return useQuery({
    ...getDocumentsQueryOptions(projectId),
    ...queryConfig,
  });
}
