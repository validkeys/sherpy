/**
 * Workflow step definitions with skill command mappings
 * Maps each pipeline status to its corresponding auto-invoked skill command
 */

export interface WorkflowStep {
  id: string;
  name: string;
  number: number;
  skillCommand: string;
}

/**
 * Complete workflow step definitions for Sherpy planning flow
 * Each step maps to a specific pipeline status and skill invocation
 */
export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: 'intake',
    name: 'Project Intake',
    number: 1,
    skillCommand: 'Start new project intake',
  },
  {
    id: 'business-requirements',
    name: 'Business Requirements',
    number: 2,
    skillCommand: 'Continue Sherpy Flow: Business Requirements',
  },
  {
    id: 'gap-analysis',
    name: 'Gap Analysis',
    number: 3,
    skillCommand: 'Continue Sherpy Flow: Gap Analysis',
  },
  {
    id: 'technical-requirements',
    name: 'Technical Requirements',
    number: 4,
    skillCommand: 'Continue Sherpy Flow: Technical Requirements',
  },
  {
    id: 'style-anchors',
    name: 'Style Anchors',
    number: 5,
    skillCommand: 'Continue Sherpy Flow: Style Anchors',
  },
  {
    id: 'implementation-planning',
    name: 'Implementation Planning',
    number: 6,
    skillCommand: 'Continue Sherpy Flow: Implementation Planning',
  },
  {
    id: 'architecture-decisions',
    name: 'Architecture Decisions',
    number: 7,
    skillCommand: 'Continue Sherpy Flow: Architecture Decisions',
  },
  {
    id: 'delivery-timeline',
    name: 'Delivery Timeline',
    number: 8,
    skillCommand: 'Continue Sherpy Flow: Delivery Timeline',
  },
  {
    id: 'qa-test-plan',
    name: 'QA Test Plan',
    number: 9,
    skillCommand: 'Continue Sherpy Flow: QA Test Plan',
  },
  {
    id: 'summaries',
    name: 'Summaries',
    number: 10,
    skillCommand: 'Continue Sherpy Flow: Summaries',
  },
] as const;
