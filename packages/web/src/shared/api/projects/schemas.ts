/**
 * Projects API Schemas
 *
 * Zod validation schemas for Projects API inputs.
 * Ensures type-safe validation at runtime for all mutations.
 */

import { z } from 'zod';

/**
 * Pipeline status values matching backend schema
 */
export const pipelineStatusSchema = z.enum([
  'intake',
  'gap-analysis',
  'business-requirements',
  'technical-requirements',
  'style-anchors',
  'implementation-planning',
  'plan-review',
  'architecture-decisions',
  'delivery-timeline',
  'qa-test-plan',
  'summaries',
  'active-development',
  'completed',
  'archived',
]);

/**
 * Priority levels
 */
export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Schema for creating a new project
 * POST /api/projects
 */
export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(100)
    .optional(),
  tags: z.array(z.string()).optional(),
  priority: prioritySchema.optional(),
});

/**
 * Inferred type for create project input
 */
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

/**
 * Schema for updating an existing project
 * PATCH /api/projects/:projectId
 */
export const updateProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  description: z.string().optional(),
  pipelineStatus: pipelineStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  priority: prioritySchema.optional(),
});

/**
 * Inferred type for update project input
 */
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

/**
 * Schema for list projects query parameters
 * GET /api/projects
 */
export const listProjectsParamsSchema = z.object({
  pipelineStatus: z.array(pipelineStatusSchema).optional(),
  priority: z.array(prioritySchema).optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Inferred type for list projects params
 */
export type ListProjectsParams = z.infer<typeof listProjectsParamsSchema>;
