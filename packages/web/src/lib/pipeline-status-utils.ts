/**
 * Pipeline Status Utilities
 * Shared utilities for formatting and styling pipeline statuses
 */

import type { PipelineStatus } from "@sherpy/shared";

/**
 * Pipeline status display configuration
 */
export const PIPELINE_STATUS_CONFIG: Record<
  PipelineStatus,
  {
    label: string;
    variant: "default" | "secondary";
    color: string;
  }
> = {
  intake: { label: "Intake", variant: "secondary", color: "slate" },
  "gap-analysis": { label: "Gap Analysis", variant: "default", color: "amber" },
  "business-requirements": { label: "Business Requirements", variant: "default", color: "blue" },
  "technical-requirements": {
    label: "Technical Requirements",
    variant: "default",
    color: "blue",
  },
  "style-anchors": { label: "Style Anchors", variant: "default", color: "purple" },
  "implementation-planning": { label: "Implementation Planning", variant: "default", color: "purple" },
  "plan-review": { label: "Plan Review", variant: "default", color: "purple" },
  "architecture-decisions": {
    label: "Architecture Decisions",
    variant: "default",
    color: "indigo",
  },
  "delivery-timeline": { label: "Delivery Timeline", variant: "default", color: "indigo" },
  "qa-test-plan": { label: "QA Test Plan", variant: "default", color: "teal" },
  summaries: { label: "Summaries", variant: "default", color: "teal" },
  "active-development": { label: "Active Development", variant: "default", color: "green" },
  completed: { label: "Completed", variant: "default", color: "emerald" },
  archived: { label: "Archived", variant: "secondary", color: "gray" },
};

/**
 * Short labels for compact display (e.g., in pipeline visualization)
 */
export const PIPELINE_STATUS_SHORT_LABELS: Record<PipelineStatus, string> = {
  intake: "Intake",
  "gap-analysis": "Gap Analysis",
  "business-requirements": "Business Req",
  "technical-requirements": "Technical Req",
  "style-anchors": "Style Anchors",
  "implementation-planning": "Planning",
  "plan-review": "Review",
  "architecture-decisions": "Architecture",
  "delivery-timeline": "Timeline",
  "qa-test-plan": "QA Plan",
  summaries: "Summaries",
  "active-development": "Development",
  completed: "Complete",
  archived: "Archived",
};

/**
 * Formats pipeline status for display
 */
export function formatPipelineStatus(status: PipelineStatus, short = false): string {
  if (short) {
    return PIPELINE_STATUS_SHORT_LABELS[status] || status;
  }
  return PIPELINE_STATUS_CONFIG[status]?.label || status;
}

/**
 * Gets the badge variant for a pipeline status
 */
export function getPipelineStatusVariant(status: PipelineStatus): "default" | "secondary" {
  return PIPELINE_STATUS_CONFIG[status]?.variant || "default";
}

/**
 * Gets the color for a pipeline status
 */
export function getPipelineStatusColor(status: PipelineStatus): string {
  return PIPELINE_STATUS_CONFIG[status]?.color || "gray";
}
