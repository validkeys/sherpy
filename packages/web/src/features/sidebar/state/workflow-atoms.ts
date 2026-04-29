/**
 * Workflow State Atoms
 *
 * Jotai atoms for managing workflow step state including current step,
 * completed steps, and navigation logic. Uses atomWithStorage for
 * persistence across page reloads.
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { StepStatus, WorkflowStep } from "../types";
import { WORKFLOW_STEPS } from "../types";

/**
 * Current workflow step with localStorage persistence.
 * Defaults to 'intake' (first step in pipeline).
 */
export const currentStepAtom = atomWithStorage<WorkflowStep>(
  "sherpy:workflow:currentStep",
  "intake",
);

/**
 * Array of completed workflow steps with localStorage persistence.
 * Tracks which steps have been marked as complete.
 */
export const completedStepsAtom = atomWithStorage<WorkflowStep[]>(
  "sherpy:workflow:completedSteps",
  [],
);

/**
 * Derived atom computing status for each workflow step.
 * Returns a map of step ID to status ('complete' | 'current' | 'pending').
 *
 * Status logic:
 * - 'complete': Step is in completedStepsAtom
 * - 'current': Step matches currentStepAtom
 * - 'pending': Step is neither complete nor current
 */
export const stepStatusesAtom = atom((get) => {
  const currentStep = get(currentStepAtom);
  const completedSteps = get(completedStepsAtom);

  const statuses = new Map<WorkflowStep, StepStatus>();

  WORKFLOW_STEPS.forEach((step) => {
    if (completedSteps.includes(step.id)) {
      statuses.set(step.id, "complete");
    } else if (step.id === currentStep) {
      statuses.set(step.id, "current");
    } else {
      statuses.set(step.id, "pending");
    }
  });

  return statuses;
});

/**
 * Get the next workflow step in the pipeline sequence.
 * Returns null if already at the last step.
 */
function getNextStep(current: WorkflowStep): WorkflowStep | null {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === current);
  if (currentIndex === -1 || currentIndex === WORKFLOW_STEPS.length - 1) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex + 1].id;
}

/**
 * Get the previous workflow step in the pipeline sequence.
 * Returns null if already at the first step.
 */
function getPreviousStep(current: WorkflowStep): WorkflowStep | null {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === current);
  if (currentIndex <= 0) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex - 1].id;
}

/**
 * Next step navigation atom with read/write capabilities.
 *
 * Read: Returns the next step after current, or null if at last step
 * Write: Advances to the next step and updates currentStepAtom
 */
export const nextStepAtom = atom(
  (get) => {
    const currentStep = get(currentStepAtom);
    return getNextStep(currentStep);
  },
  (get, set) => {
    const currentStep = get(currentStepAtom);
    const nextStep = getNextStep(currentStep);
    if (nextStep) {
      set(currentStepAtom, nextStep);
    }
  },
);

/**
 * Previous step navigation atom with read/write capabilities.
 *
 * Read: Returns the previous step before current, or null if at first step
 * Write: Goes back to the previous step and updates currentStepAtom
 */
export const prevStepAtom = atom(
  (get) => {
    const currentStep = get(currentStepAtom);
    return getPreviousStep(currentStep);
  },
  (get, set) => {
    const currentStep = get(currentStepAtom);
    const prevStep = getPreviousStep(currentStep);
    if (prevStep) {
      set(currentStepAtom, prevStep);
    }
  },
);

/**
 * Mark a step as complete by adding it to the completedStepsAtom.
 * Write-only atom that prevents duplicate entries.
 */
export const markStepCompleteAtom = atom(null, (get, set, step: WorkflowStep) => {
  const completedSteps = get(completedStepsAtom);
  if (!completedSteps.includes(step)) {
    set(completedStepsAtom, [...completedSteps, step]);
  }
});
