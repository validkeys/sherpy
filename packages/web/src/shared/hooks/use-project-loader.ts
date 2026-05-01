/**
 * Project Loader Hook
 *
 * Centralized hook for loading projects with state management.
 * Handles project fetching, state updates, URL parameters, and error handling.
 *
 * Features:
 * - loadProject(projectId) - Load a specific project
 * - Automatic currentProjectIdAtom update
 * - URL parameter support (optional)
 * - Error handling with retry capability
 * - Loading states
 */

import { useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currentProjectIdAtom } from '@/shared/state';
import { useProject } from '@/shared/api/projects/get-project';

export interface UseProjectLoaderOptions {
  /**
   * Initial project ID to load.
   * If not provided, will attempt to load from URL params if enabled.
   */
  projectId?: string;

  /**
   * Enable loading project ID from URL search parameter.
   * Looks for ?projectId=<id> in the URL.
   * @default false
   */
  enableUrlParams?: boolean;

  /**
   * Callback invoked when project loads successfully
   */
  onProjectLoaded?: (projectId: string) => void;

  /**
   * Callback invoked when project loading fails
   */
  onError?: (error: Error) => void;
}

export interface ProjectLoaderResult {
  /**
   * Currently loaded project (null if no project loaded)
   */
  project: ReturnType<typeof useProject>['data'];

  /**
   * True while project is being fetched
   */
  isLoading: boolean;

  /**
   * Error if project load failed
   */
  error: Error | null;

  /**
   * Current project ID (null if no project loaded)
   */
  currentProjectId: string | null;

  /**
   * Load a specific project by ID.
   * Updates currentProjectIdAtom and triggers data fetch.
   */
  loadProject: (projectId: string) => void;

  /**
   * Retry loading the current project after an error
   */
  retry: () => void;

  /**
   * Clear the current project
   */
  clearProject: () => void;
}

/**
 * Hook for loading and managing project state
 *
 * @example
 * ```tsx
 * function ProjectPage() {
 *   const { project, isLoading, error, loadProject } = useProjectLoader({
 *     projectId: 'proj-123',
 *     onProjectLoaded: (id) => console.log('Loaded:', id),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error error={error} />;
 *   if (!project) return <EmptyState />;
 *
 *   return <ProjectView project={project.project} />;
 * }
 * ```
 *
 * @example With URL parameters
 * ```tsx
 * function ProjectPageWithUrl() {
 *   const { project, loadProject } = useProjectLoader({
 *     enableUrlParams: true,
 *   });
 *
 *   // Visiting /?projectId=proj-123 will automatically load that project
 * }
 * ```
 */
export function useProjectLoader(options: UseProjectLoaderOptions = {}): ProjectLoaderResult {
  const {
    projectId: initialProjectId,
    enableUrlParams = false,
    onProjectLoaded,
    onError,
  } = options;

  const [searchParams] = useSearchParams();
  const setCurrentProjectId = useSetAtom(currentProjectIdAtom);

  // Determine project ID from options or URL params
  const urlProjectId = enableUrlParams ? searchParams.get('projectId') : null;
  const effectiveProjectId = initialProjectId ?? urlProjectId ?? null;

  // Fetch project data using React Query
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useProject({
    projectId: effectiveProjectId ?? '',
    queryConfig: {
      enabled: !!effectiveProjectId,
    },
  });

  // Update current project ID atom when project changes
  useEffect(() => {
    if (effectiveProjectId) {
      setCurrentProjectId(effectiveProjectId);
    }
  }, [effectiveProjectId, setCurrentProjectId]);

  // Call onProjectLoaded callback when project loads successfully
  useEffect(() => {
    if (project && effectiveProjectId && onProjectLoaded) {
      onProjectLoaded(effectiveProjectId);
    }
  }, [project, effectiveProjectId, onProjectLoaded]);

  // Call onError callback when error occurs
  useEffect(() => {
    if (error && onError) {
      onError(error as Error);
    }
  }, [error, onError]);

  /**
   * Load a specific project by ID
   */
  const loadProject = useCallback(
    (projectId: string) => {
      setCurrentProjectId(projectId);
    },
    [setCurrentProjectId]
  );

  /**
   * Retry loading the current project
   */
  const retry = useCallback(() => {
    if (effectiveProjectId) {
      refetch();
    }
  }, [effectiveProjectId, refetch]);

  /**
   * Clear the current project
   */
  const clearProject = useCallback(() => {
    setCurrentProjectId(null);
  }, [setCurrentProjectId]);

  return {
    project,
    isLoading,
    error: error as Error | null,
    currentProjectId: effectiveProjectId,
    loadProject,
    retry,
    clearProject,
  };
}
