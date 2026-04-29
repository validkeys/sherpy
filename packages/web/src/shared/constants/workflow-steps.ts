/**
 * Workflow Steps Constants
 *
 * Defines the 10-step Sherpy PM workflow for software development projects.
 */

export type WorkflowStep = {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
};

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: "business-requirements",
    name: "Business Requirements",
    description: "Gather and document business objectives and goals",
    icon: "briefcase",
    order: 1,
  },
  {
    id: "gap-analysis",
    name: "Gap Analysis",
    description: "Identify gaps and ambiguities in requirements",
    icon: "search",
    order: 2,
  },
  {
    id: "technical-requirements",
    name: "Technical Requirements",
    description: "Derive technical specifications from business needs",
    icon: "code",
    order: 3,
  },
  {
    id: "architecture-decision",
    name: "Architecture Decision Records",
    description: "Document key architectural decisions and trade-offs",
    icon: "layers",
    order: 4,
  },
  {
    id: "style-anchors",
    name: "Style Anchors",
    description: "Define code patterns and implementation examples",
    icon: "palette",
    order: 5,
  },
  {
    id: "implementation-plan",
    name: "Implementation Plan",
    description: "Create detailed milestones and task breakdown",
    icon: "map",
    order: 6,
  },
  {
    id: "delivery-timeline",
    name: "Delivery Timeline",
    description: "Establish timeline with QA and deployment dates",
    icon: "calendar",
    order: 7,
  },
  {
    id: "qa-test-plan",
    name: "QA Test Plan",
    description: "Define test suites and acceptance criteria",
    icon: "check-circle",
    order: 8,
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level overview for non-technical stakeholders",
    icon: "file-text",
    order: 9,
  },
  {
    id: "developer-summary",
    name: "Developer Summary",
    description: "Technical summary for development team",
    icon: "terminal",
    order: 10,
  },
] as const;

/**
 * Get workflow step by ID
 */
export function getWorkflowStep(id: string): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find((step) => step.id === id);
}

/**
 * Get workflow step by order
 */
export function getWorkflowStepByOrder(order: number): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find((step) => step.order === order);
}
