/**
 * Generate Document Mutation
 *
 * POST /api/projects/:projectId/documents/generate
 * Triggers document generation from skills and creates a new planning artifact.
 * Follows the react-query-mutations pattern with Zod validation.
 */

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentResponse } from './types';
import { type GenerateDocumentInput, generateDocumentInputSchema } from './schemas';

/**
 * Fetcher function for generating a document
 * Validates input with Zod schema before making API call
 *
 * @param projectId - The project ID to generate the document for
 * @param data - Document generation data (type, format, metadata)
 * @returns Promise resolving to the generated document
 * @throws {ApiError} When API request fails
 * @throws {ZodError} When input validation fails
 */
export async function generateDocument({
  projectId,
  data,
}: {
  projectId: string;
  data: GenerateDocumentInput;
}): Promise<DocumentResponse> {
  // Validate input
  const validatedData = generateDocumentInputSchema.parse(data);

  // Make API request
  return api.post<DocumentResponse>(`/api/projects/${projectId}/documents/generate`, validatedData);
}

/**
 * React Query mutation hook for generating a document
 *
 * Automatically invalidates the documents list cache for the project on success.
 * Consumers can override default behavior by providing mutationConfig.
 *
 * Note: Document generation may be a long-running operation. In future iterations,
 * this may need polling or WebSocket integration for real-time status updates.
 *
 * @param mutationConfig - Optional mutation configuration overrides
 * @returns Mutation object with mutate, mutateAsync, isPending, etc.
 *
 * @example
 * ```tsx
 * const { mutate: generate, isPending } = useGenerateDocument({
 *   onSuccess: (response) => {
 *     console.log('Document generated:', response.document);
 *     toast.success(`${response.document.documentType} created successfully`);
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to generate document: ${error.message}`);
 *   },
 * });
 *
 * // Trigger generation when skill completes
 * generate({
 *   projectId: 'proj-123',
 *   data: {
 *     documentType: 'business-requirements',
 *     format: 'yaml',
 *     metadata: { skillId: 'skill-456' },
 *   },
 * });
 * ```
 */
export function useGenerateDocument(mutationConfig?: MutationConfig<typeof generateDocument>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateDocument,
    onSuccess: (data, variables, context, meta) => {
      // Invalidate documents list for this project to refetch with new document
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.projectId],
      });

      // Call consumer's onSuccess if provided
      mutationConfig?.onSuccess?.(data, variables, context, meta);
    },
    ...mutationConfig,
  });
}
