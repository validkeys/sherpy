/**
 * Workflow Step Types and Constants
 *
 * Defines the data model for Sherpy workflow pipeline steps.
 */

/**
 * Available workflow steps in the Sherpy planning pipeline.
 * Matches the pipelineStatus values from technical requirements.
 */
export type WorkflowStep =
  | 'intake'
  | 'gap-analysis'
  | 'business-requirements'
  | 'technical-requirements'
  | 'style-anchors'
  | 'implementation-planning'
  | 'plan-review'
  | 'architecture-decisions'
  | 'delivery-timeline'
  | 'qa-test-plan';

/**
 * Status of a workflow step indicating completion state.
 */
export type StepStatus = 'complete' | 'current' | 'pending';

/**
 * Configuration for a workflow step including metadata and display information.
 */
export interface WorkflowStepConfig {
  /** Unique identifier matching WorkflowStep type */
  id: WorkflowStep;
  /** Display name for the step */
  name: string;
  /** Brief description of what this step accomplishes */
  description: string;
}

/**
 * Complete workflow step configuration array with all 10 Sherpy pipeline steps.
 */
export const WORKFLOW_STEPS: readonly WorkflowStepConfig[] = [
  {
    id: 'intake',
    name: 'Intake',
    description: 'Initial project discovery and requirements gathering',
  },
  {
    id: 'gap-analysis',
    name: 'Gap Analysis',
    description: 'Identify missing information and clarification needs',
  },
  {
    id: 'business-requirements',
    name: 'Business Requirements',
    description: 'Define business goals, stakeholders, and success criteria',
  },
  {
    id: 'technical-requirements',
    name: 'Technical Requirements',
    description: 'Specify technical constraints, architecture, and patterns',
  },
  {
    id: 'style-anchors',
    name: 'Style Anchors',
    description: 'Establish code patterns and architectural examples',
  },
  {
    id: 'implementation-planning',
    name: 'Implementation Planning',
    description: 'Break down work into milestones and detailed tasks',
  },
  {
    id: 'plan-review',
    name: 'Plan Review',
    description: 'Review and refine the implementation plan',
  },
  {
    id: 'architecture-decisions',
    name: 'Architecture Decisions',
    description: 'Document key architectural choices and tradeoffs',
  },
  {
    id: 'delivery-timeline',
    name: 'Delivery Timeline',
    description: 'Schedule milestones and set delivery dates',
  },
  {
    id: 'qa-test-plan',
    name: 'QA Test Plan',
    description: 'Define testing strategy and acceptance criteria',
  },
] as const;

/**
 * Get the zero-based index of a workflow step in the pipeline sequence.
 *
 * @param step - The workflow step to find
 * @returns The index of the step, or -1 if not found
 */
export function getStepIndex(step: WorkflowStep): number {
  return WORKFLOW_STEPS.findIndex((s) => s.id === step);
}
