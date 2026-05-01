/**
 * Create Project Mutation
 *
 * POST /api/projects
 * Creates a new project with the provided data.
 * Follows the react-query-mutations pattern with Zod validation.
 */

import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectResponse } from './types';
import { type CreateProjectInput, createProjectInputSchema } from './schemas';

/**
 * Fetcher function for creating a project
 * Validates input with Zod schema before making API call
 *
 * @param data - Project creation data
 * @returns Promise resolving to the created project
 * @throws {ApiError} When API request fails
 * @throws {ZodError} When input validation fails
 */
export async function createProject(data: CreateProjectInput): Promise<ProjectResponse> {
  // Validate input
  const validatedData = createProjectInputSchema.parse(data);

  // Make API request
  return api.post<ProjectResponse>('/api/projects', validatedData);
}

/**
 * React Query mutation hook for creating a project
 *
 * Automatically invalidates the projects list cache on success.
 * Consumers can override default behavior by providing mutationConfig.
 *
 * @param mutationConfig - Optional mutation configuration overrides
 * @returns Mutation object with mutate, mutateAsync, isLoading, etc.
 *
 * @example
 * ```tsx
 * const { mutate: create, isLoading } = useCreateProject({
 *   onSuccess: (response) => {
 *     console.log('Project created:', response.project);
 *     navigate(`/projects/${response.project.id}`);
 *   },
 *   onError: (error) => {
 *     toast.error(error.message);
 *   },
 * });
 *
 * // Later...
 * create({
 *   name: 'New Project',
 *   priority: 'high',
 *   tags: ['frontend', 'urgent'],
 * });
 * ```
 */
export function useCreateProject(mutationConfig?: MutationConfig<typeof createProject>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (data, variables, context, meta) => {
      // Invalidate projects list to refetch with new project
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // Call consumer's onSuccess if provided
      mutationConfig?.onSuccess?.(data, variables, context, meta);
    },
    ...mutationConfig,
  });
}
