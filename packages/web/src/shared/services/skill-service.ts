import { WORKFLOW_STEPS } from '../types/workflow';

/**
 * Gets the skill invocation message for a given workflow step
 * @param stepId - The workflow step id (pipeline status value)
 * @returns The skill command string, or null if no skill defined for step
 */
export function getSkillMessageForStep(stepId: string): string | null {
  const step = WORKFLOW_STEPS.find((s) => s.id === stepId);
  return step?.skillCommand ?? null;
}
