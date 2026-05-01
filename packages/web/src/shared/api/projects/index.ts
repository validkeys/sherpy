/**
 * Projects API
 *
 * Centralized exports for all Projects API integration.
 * Import from this file to access types, schemas, and hooks.
 *
 * @example
 * ```ts
 * import { useProjects, useCreateProject, type Project } from '@/shared/api/projects';
 * ```
 */

// Types
export type { Project, PipelineStatus, Priority, ProjectListResponse, ProjectResponse, CreateProjectInput, UpdateProjectInput, ListProjectsParams } from './types';

// Schemas
export {
  pipelineStatusSchema,
  prioritySchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  listProjectsParamsSchema,
} from './schemas';

// Create Project
export { createProject, useCreateProject } from './create-project';

// List Projects
export { getProjects, getProjectsQueryOptions, useProjects } from './get-projects';

// Get Project by ID
export { getProject, getProjectQueryOptions, useProject } from './get-project';

// Update Project
export { updateProject, useUpdateProject, type UpdateProjectVariables } from './update-project';
