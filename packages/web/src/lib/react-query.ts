/**
 * React Query Type Helpers
 *
 * Provides type utilities for consistent query and mutation configuration
 * across all API integration layers. These helpers enable consumers to
 * override default configurations while maintaining type safety.
 *
 * Usage:
 *   // In a query hook
 *   export function useProjects(
 *     queryConfig?: QueryConfig<typeof getProjectsQueryOptions>
 *   ) { ... }
 *
 *   // In a mutation hook
 *   export function useCreateProject(
 *     mutationConfig?: MutationConfig<typeof createProject>
 *   ) { ... }
 */

import type { UndefinedInitialDataOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Extract configuration options that can be overridden by consumers
 * Omits queryKey and queryFn since those are managed by the API layer
 *
 * @example
 * ```ts
 * export function useProjects(
 *   { projectId, queryConfig }: { projectId: string; queryConfig?: QueryConfig<typeof getProjectsQueryOptions> }
 * ) {
 *   return useQuery({
 *     ...getProjectsQueryOptions(projectId),
 *     ...queryConfig,
 *   });
 * }
 * ```
 */
export type QueryConfig<T extends (...args: any[]) => any> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

/**
 * Extract mutation configuration options that can be overridden by consumers
 * Omits mutationFn since that is managed by the API layer
 *
 * The 4 generic parameters match UseMutationOptions:
 * - TData: The data returned by the mutation
 * - TError: The error type thrown by the mutation
 * - TVariables: The variables accepted by the mutation
 * - TContext: The context type for optimistic updates
 *
 * @example
 * ```ts
 * export function useCreateProject(
 *   mutationConfig?: MutationConfig<typeof createProject>
 * ) {
 *   const queryClient = useQueryClient();
 *   return useMutation({
 *     mutationFn: createProject,
 *     onSuccess: (data, variables, context) => {
 *       queryClient.invalidateQueries({ queryKey: ['projects'] });
 *       mutationConfig?.onSuccess?.(data, variables, context);
 *     },
 *     ...mutationConfig,
 *   });
 * }
 * ```
 */
export type MutationConfig<MutationFn extends (...args: any[]) => Promise<any>> = Omit<
  UseMutationOptions<
    Awaited<ReturnType<MutationFn>>, // TData
    Error, // TError
    Parameters<MutationFn>[0], // TVariables
    unknown // TContext
  >,
  'mutationFn'
>;
