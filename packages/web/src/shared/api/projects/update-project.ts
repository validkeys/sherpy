/**
 * Update Project Mutation
 *
 * PATCH /api/projects/:projectId
 * Updates an existing project with the provided data.
 * Follows the react-query-mutations pattern with Zod validation.
 */

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectResponse } from './types';
import { updateProjectInputSchema, type UpdateProjectInput } from './schemas';

/**
 * Input for update project mutation
 */
export interface UpdateProjectVariables {
  projectId: string;
  data: UpdateProjectInput;
}

/**
 * Fetcher function for updating a project
 * Validates input with Zod schema before making API call
 *
 * @param projectId - The project ID to update
 * @param data - Project update data (partial fields)
 * @returns Promise resolving to the updated project
 * @throws {ApiError} When API request fails
 * @throws {ZodError} When input validation fails
 *
 * @example
 * ```ts
 * const updated = await updateProject({
 *   projectId: 'proj_123',
 *   data: { pipelineStatus: 'business-requirements' },
 * });
 * ```
 */
export async function updateProject({
  projectId,
  data,
}: UpdateProjectVariables): Promise<ProjectResponse> {
  // Validate input
  const validatedData = updateProjectInputSchema.parse(data);

  // Make API request
  return api.patch<ProjectResponse>(`/api/projects/${projectId}`, validatedData);
}

/**
 * React Query mutation hook for updating a project
 *
 * Automatically invalidates both the projects list and the specific
 * project detail cache on success. This ensures all views stay in sync.
 *
 * Special attention to pipelineStatus field for workflow state persistence.
 *
 * @param mutationConfig - Optional mutation configuration overrides
 * @returns Mutation object with mutate, mutateAsync, isLoading, etc.
 *
 * @example
 * ```tsx
 * function WorkflowSidebar({ projectId }: { projectId: string }) {
 *   const { mutate: updateProject, isLoading } = useUpdateProject({
 *     onSuccess: (response) => {
 *       toast.success('Progress saved!');
 *     },
 *     onError: (error) => {
 *       toast.error('Failed to save progress');
 *     },
 *   });
 *
 *   const handleStepClick = (newStep: PipelineStatus) => {
 *     updateProject({
 *       projectId,
 *       data: { pipelineStatus: newStep },
 *     });
 *   };
 *
 *   // ...
 * }
 * ```
 */
export function useUpdateProject(mutationConfig?: MutationConfig<typeof updateProject>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (data, variables, context) => {
      // Invalidate projects list to reflect updates
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // Invalidate specific project detail to reflect updates
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });

      // Call consumer's onSuccess if provided
      mutationConfig?.onSuccess?.(data, variables, context);
    },
    ...mutationConfig,
  });
}
