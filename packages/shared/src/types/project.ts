/**
 * Project-related types
 * Shared between frontend and backend
 */

/**
 * Pipeline status representing the current stage in the workflow
 */
export type PipelineStatus =
  | 'intake'
  | 'gap-analysis'
  | 'business-requirements'
  | 'technical-requirements'
  | 'style-anchors'
  | 'implementation-planning'
  | 'plan-review'
  | 'architecture-decisions'
  | 'delivery-timeline'
  | 'qa-test-plan'
  | 'summaries'
  | 'active-development'
  | 'completed'
  | 'archived';

/**
 * Priority levels for projects
 */
export type Priority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Project entity
 */
export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  pipelineStatus: PipelineStatus;
  tags?: string[];
  priority?: Priority;
  createdAt: string;
  updatedAt: string;
}
