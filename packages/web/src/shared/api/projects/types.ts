/**
 * Projects API Types
 *
 * Type definitions for Projects API integration.
 * Imports base types from @sherpy/shared for single source of truth.
 */

import type { PipelineStatus, Priority, Project } from '@sherpy/shared';

/**
 * Re-export types from shared package
 */
export type { PipelineStatus, Priority, Project };

/**
 * Response type for list projects endpoint
 * GET /api/projects
 */
export interface ProjectListResponse {
  projects: Project[];
}

/**
 * Response type for get single project endpoint
 * GET /api/projects/:projectId
 */
export interface ProjectResponse {
  project: Project;
}

/**
 * Input for creating a new project
 * POST /api/projects
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  slug?: string;
  tags?: string[];
  priority?: Priority;
}

/**
 * Input for updating an existing project
 * PATCH /api/projects/:projectId
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  pipelineStatus?: PipelineStatus;
  tags?: string[];
  priority?: Priority;
}

/**
 * Query parameters for listing projects
 */
export interface ListProjectsParams {
  pipelineStatus?: PipelineStatus[];
  priority?: Priority[];
  search?: string;
  limit?: number;
  offset?: number;
}
